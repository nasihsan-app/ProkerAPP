import { Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../lib/api';
import { formatPersen, formatRupiah, formatTanggal } from '../lib/format';
import { type PelaksanaanKegiatan, type ProgramKerja, type RealisasiAnggaran } from '../types';

const emptyForm = (): Partial<RealisasiAnggaran> => ({
  id_program: '',
  id_pelaksanaan: '',
  tanggal: '',
  uraian: '',
  kategori_belanja: '',
  jumlah: 0,
  nomor_bukti: '',
  keterangan: '',
});

export function AnggaranPage() {
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [realisasi, setRealisasi] = useState<RealisasiAnggaran[]>([]);
  const [pelaksanaan, setPelaksanaan] = useState<PelaksanaanKegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ringkasan' | 'realisasi'>('ringkasan');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RealisasiAnggaran | null>(null);
  const [form, setForm] = useState<Partial<RealisasiAnggaran>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RealisasiAnggaran | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prg, rel, plk] = await Promise.all([
        api.get<ProgramKerja[]>('/api/program-kerja'),
        api.get<RealisasiAnggaran[]>('/api/realisasi-anggaran'),
        api.get<PelaksanaanKegiatan[]>('/api/pelaksanaan-kegiatan'),
      ]);
      setPrograms(prg);
      setRealisasi(rel);
      setPelaksanaan(plk);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const totalAnggaran = programs.reduce((s, p) => s + Number(p.anggaran || 0), 0);
    const totalRealisasi = realisasi.reduce((s, r) => s + Number(r.jumlah || 0), 0);
    const persen = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;
    return { totalAnggaran, totalRealisasi, sisa: totalAnggaran - totalRealisasi, persen };
  }, [programs, realisasi]);

  const filteredRealisasi = useMemo(
    () =>
      realisasi.filter(
        (r) =>
          !search ||
          r.uraian.toLowerCase().includes(search.toLowerCase()) ||
          (r.nama_program || '').toLowerCase().includes(search.toLowerCase()) ||
          r.nomor_bukti.toLowerCase().includes(search.toLowerCase())
      ),
    [realisasi, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), id_program: programs[0]?.id_program || '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: RealisasiAnggaran) => {
    setEditing(row);
    setForm({ ...row, id_pelaksanaan: row.id_pelaksanaan ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/realisasi-anggaran/${editing.id_realisasi}`, form);
      } else {
        await api.post('/api/realisasi-anggaran', form);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/api/realisasi-anggaran/${deleteTarget.id_realisasi}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const realisasiCols: ColumnDef<RealisasiAnggaran>[] = [
    { key: 'tanggal', header: 'Tanggal', render: (r) => <span className="text-xs tabular-nums">{formatTanggal(r.tanggal)}</span> },
    {
      key: 'uraian',
      header: 'Uraian Pengeluaran',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.uraian}</div>
          <div className="text-xs text-slate-500">{r.nama_program}</div>
        </div>
      ),
    },
    { key: 'kategori', header: 'Kategori Belanja', render: (r) => <span className="text-slate-700">{r.kategori_belanja || '—'}</span> },
    { key: 'bukti', header: 'Nomor Bukti', render: (r) => <span className="font-mono text-xs text-slate-600">{r.nomor_bukti || '—'}</span> },
    { key: 'jumlah', header: 'Jumlah', align: 'right', render: (r) => <span className="font-mono font-semibold text-slate-900">{formatRupiah(r.jumlah)}</span> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Realisasi">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Realisasi">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anggaran Program Kerja"
        description="Pemantauan alokasi anggaran, sumber dana, dan realisasi pengeluaran tiap Program Kerja."
        actionLabel="Catat Realisasi Anggaran"
        onAction={openCreate}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Anggaran</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{formatRupiah(totals.totalAnggaran)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Realisasi Anggaran</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{formatRupiah(totals.totalRealisasi)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Sisa Anggaran</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{formatRupiah(totals.sisa)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Persentase Realisasi</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{formatPersen(totals.persen)}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
        <button
          type="button"
          onClick={() => setTab('ringkasan')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === 'ringkasan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Alokasi per Program Kerja
        </button>
        <button
          type="button"
          onClick={() => setTab('realisasi')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === 'realisasi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Catatan Realisasi ({realisasi.length})
        </button>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : tab === 'ringkasan' ? (
        programs.length === 0 ? (
          <EmptyState
            title="Belum ada data Anggaran Program Kerja"
            description="Alokasi anggaran akan tampil setelah Program Kerja dibuat."
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3">Program Kerja</th>
                    <th className="px-4 py-3">Sumber Dana</th>
                    <th className="px-4 py-3 text-right">Anggaran</th>
                    <th className="px-4 py-3 text-right">Realisasi</th>
                    <th className="px-4 py-3 text-right">Serapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {programs.map((p) => {
                    const real = Number(p.realisasi_anggaran || 0);
                    const pct = p.anggaran > 0 ? (real / p.anggaran) * 100 : 0;
                    return (
                      <tr key={p.id_program} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.nama_program}</td>
                        <td className="px-4 py-3 text-slate-600">{p.sumber_dana || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatRupiah(p.anggaran)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatRupiah(real)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{formatPersen(pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <DataTable
          rows={filteredRealisasi}
          columns={realisasiCols}
          rowKey={(r) => r.id_realisasi}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari uraian, program kerja, atau nomor bukti..."
          emptyTitle="Belum ada catatan Realisasi Anggaran"
          emptyDescription="Tambahkan transaksi realisasi pengeluaran untuk Program Kerja yang berjalan."
          emptyActionLabel="Catat Realisasi Anggaran"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Realisasi Anggaran' : 'Catat Realisasi Anggaran'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <Field label="Program Kerja" required>
            <Select required value={form.id_program || ''} onChange={(e) => setForm({ ...form, id_program: e.target.value })}>
              <option value="">Pilih Program Kerja...</option>
              {programs.map((p) => (
                <option key={p.id_program} value={p.id_program}>{p.nama_program}</option>
              ))}
            </Select>
          </Field>
          <Field label="Pelaksanaan Kegiatan (Opsional)">
            <Select value={form.id_pelaksanaan || ''} onChange={(e) => setForm({ ...form, id_pelaksanaan: e.target.value })}>
              <option value="">Tidak terkait pelaksanaan spesifik</option>
              {pelaksanaan.map((pk) => (
                <option key={pk.id_pelaksanaan} value={pk.id_pelaksanaan}>{pk.nama_pelaksanaan}</option>
              ))}
            </Select>
          </Field>
          <Field label="Uraian Belanja" required>
            <Input required value={form.uraian || ''} onChange={(e) => setForm({ ...form, uraian: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tanggal"><Input type="date" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></Field>
            <Field label="Kategori Belanja"><Input value={form.kategori_belanja || ''} onChange={(e) => setForm({ ...form, kategori_belanja: e.target.value })} placeholder="Honor / Konsumsi / Perjalanan" /></Field>
            <Field label="Jumlah (Rp)" required><Input type="number" min={0} required value={form.jumlah ?? 0} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Nomor Bukti"><Input value={form.nomor_bukti || ''} onChange={(e) => setForm({ ...form, nomor_bukti: e.target.value })} /></Field>
          <Field label="Keterangan"><Textarea rows={2} value={form.keterangan || ''} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Realisasi Anggaran"
        message={`Hapus catatan realisasi "${deleteTarget?.uraian}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
