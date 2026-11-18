import { Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatAngka, formatTanggal } from '../lib/format';
import { type Aktivitas, type Organisasi, type PelaksanaanKegiatan, type Personel } from '../types';

const emptyForm = (): Partial<PelaksanaanKegiatan> => ({
  id_aktivitas: '',
  nama_pelaksanaan: '',
  tanggal: '',
  lokasi: '',
  id_organisasi_pelaksana: '',
  id_pic: '',
  target_peserta: 0,
  realisasi_peserta: 0,
  status: 'Direncanakan',
  luaran: '',
  catatan: '',
});

export function PelaksanaanKegiatanPage() {
  const [rows, setRows] = useState<PelaksanaanKegiatan[]>([]);
  const [aktivitasList, setAktivitasList] = useState<Aktivitas[]>([]);
  const [organisasi, setOrganisasi] = useState<Organisasi[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAktivitas, setFilterAktivitas] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PelaksanaanKegiatan | null>(null);
  const [form, setForm] = useState<Partial<PelaksanaanKegiatan>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PelaksanaanKegiatan | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plk, akt, org, prs] = await Promise.all([
        api.get<PelaksanaanKegiatan[]>('/api/pelaksanaan-kegiatan'),
        api.get<Aktivitas[]>('/api/aktivitas'),
        api.get<Organisasi[]>('/api/organisasi'),
        api.get<Personel[]>('/api/personel'),
      ]);
      setRows(plk);
      setAktivitasList(akt);
      setOrganisasi(org);
      setPersonel(prs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !search ||
        r.nama_pelaksanaan.toLowerCase().includes(search.toLowerCase()) ||
        (r.nama_aktivitas || '').toLowerCase().includes(search.toLowerCase()) ||
        r.lokasi.toLowerCase().includes(search.toLowerCase());
      const matchAkt = !filterAktivitas || r.id_aktivitas === filterAktivitas;
      return matchSearch && matchAkt;
    });
  }, [rows, search, filterAktivitas]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), id_aktivitas: aktivitasList[0]?.id_aktivitas || '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: PelaksanaanKegiatan) => {
    setEditing(row);
    setForm({
      ...row,
      id_organisasi_pelaksana: row.id_organisasi_pelaksana ?? '',
      id_pic: row.id_pic ?? '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/pelaksanaan-kegiatan/${editing.id_pelaksanaan}`, form);
      } else {
        await api.post('/api/pelaksanaan-kegiatan', form);
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
      await api.delete(`/api/pelaksanaan-kegiatan/${deleteTarget.id_pelaksanaan}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<PelaksanaanKegiatan>[] = [
    {
      key: 'pelaksanaan',
      header: 'Pelaksanaan Kegiatan',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_pelaksanaan}</div>
          <div className="text-xs text-slate-500">
            {r.nama_aktivitas} · {r.nama_program}
          </div>
        </div>
      ),
    },
    {
      key: 'tanggal',
      header: 'Tanggal & Lokasi',
      render: (r) => (
        <div className="text-xs">
          <div className="text-slate-900 tabular-nums">{formatTanggal(r.tanggal)}</div>
          <div className="text-slate-500">{r.lokasi || '—'}</div>
        </div>
      ),
    },
    { key: 'org', header: 'Organisasi Pelaksana', render: (r) => <span className="text-slate-700">{r.nama_organisasi_pelaksana || '—'}</span> },
    {
      key: 'peserta',
      header: 'Peserta (Real/Target)',
      align: 'right',
      render: (r) => (
        <span className="font-mono text-xs text-slate-800">
          {formatAngka(r.realisasi_peserta)} / {formatAngka(r.target_peserta)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Pelaksanaan Kegiatan">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Pelaksanaan Kegiatan">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pelaksanaan Kegiatan"
        description="Pencatatan tiap kejadian pelaksanaan kegiatan di bawah Aktivitas, termasuk aktivitas berulang."
        actionLabel="Tambah Pelaksanaan Kegiatan"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_pelaksanaan}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari pelaksanaan, aktivitas, atau lokasi..."
          filters={
            <Select value={filterAktivitas} onChange={(e) => setFilterAktivitas(e.target.value)} className="!w-auto min-w-[200px]">
              <option value="">Semua Aktivitas</option>
              {aktivitasList.map((a) => (
                <option key={a.id_aktivitas} value={a.id_aktivitas}>{a.nama_aktivitas}</option>
              ))}
            </Select>
          }
          emptyTitle="Belum ada Pelaksanaan Kegiatan"
          emptyDescription="Daftar Pelaksanaan Kegiatan masih kosong (0 record). Tambahkan Aktivitas terlebih dahulu, lalu catat setiap pelaksanaannya."
          emptyActionLabel="Tambah Pelaksanaan Kegiatan"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Pelaksanaan Kegiatan' : 'Tambah Pelaksanaan Kegiatan'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <Field label="Aktivitas" required>
            <Select required value={form.id_aktivitas || ''} onChange={(e) => setForm({ ...form, id_aktivitas: e.target.value })}>
              <option value="">Pilih Aktivitas...</option>
              {aktivitasList.map((a) => (
                <option key={a.id_aktivitas} value={a.id_aktivitas}>{a.nama_aktivitas} ({a.nama_program})</option>
              ))}
            </Select>
          </Field>
          <Field label="Nama Pelaksanaan" required>
            <Input required value={form.nama_pelaksanaan || ''} onChange={(e) => setForm({ ...form, nama_pelaksanaan: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tanggal"><Input type="date" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></Field>
            <Field label="Lokasi"><Input value={form.lokasi || ''} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Organisasi Pelaksana">
              <Select value={form.id_organisasi_pelaksana || ''} onChange={(e) => setForm({ ...form, id_organisasi_pelaksana: e.target.value })}>
                <option value="">Pilih Organisasi...</option>
                {organisasi.map((o) => (
                  <option key={o.id_organisasi} value={o.id_organisasi}>{o.nama_organisasi}</option>
                ))}
              </Select>
            </Field>
            <Field label="Penanggung Jawab (PIC)">
              <Select value={form.id_pic || ''} onChange={(e) => setForm({ ...form, id_pic: e.target.value })}>
                <option value="">Pilih Personel...</option>
                {personel.map((p) => (
                  <option key={p.id_personel} value={p.id_personel}>{p.nama_personel}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Target Peserta"><Input type="number" min={0} value={form.target_peserta ?? 0} onChange={(e) => setForm({ ...form, target_peserta: Number(e.target.value) })} /></Field>
            <Field label="Realisasi Peserta"><Input type="number" min={0} value={form.realisasi_peserta ?? 0} onChange={(e) => setForm({ ...form, realisasi_peserta: Number(e.target.value) })} /></Field>
            <Field label="Status">
              <Select value={form.status || 'Direncanakan'} onChange={(e) => setForm({ ...form, status: e.target.value as PelaksanaanKegiatan['status'] })}>
                <option value="Direncanakan">Direncanakan</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Selesai">Selesai</option>
                <option value="Ditunda">Ditunda</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </Select>
            </Field>
          </div>
          <Field label="Luaran"><Textarea rows={2} value={form.luaran || ''} onChange={(e) => setForm({ ...form, luaran: e.target.value })} /></Field>
          <Field label="Catatan"><Textarea rows={2} value={form.catatan || ''} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Pelaksanaan Kegiatan"
        message={`Hapus catatan pelaksanaan "${deleteTarget?.nama_pelaksanaan}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
