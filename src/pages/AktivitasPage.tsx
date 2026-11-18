import { Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatAngka, formatPersen, formatTanggal } from '../lib/format';
import {
  type Aktivitas,
  type JenisAktivitas,
  POLA_AKTIVITAS_LIST,
  type Personel,
  type PolaAktivitas,
  type ProgramKerja,
} from '../types';

const emptyForm = (): Partial<Aktivitas> => ({
  id_program: '',
  id_jenis_aktivitas: '',
  nama_aktivitas: '',
  pola_aktivitas: 'Sekali',
  frekuensi: '',
  target_frekuensi: 1,
  tanggal_mulai: '',
  tanggal_selesai: '',
  id_pic: '',
  status: 'Direncanakan',
  keterangan: '',
});

export function AktivitasPage() {
  const [rows, setRows] = useState<Aktivitas[]>([]);
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [jenisList, setJenisList] = useState<JenisAktivitas[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aktivitas | null>(null);
  const [form, setForm] = useState<Partial<Aktivitas>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Aktivitas | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [akt, prg, jns, prs] = await Promise.all([
        api.get<Aktivitas[]>('/api/aktivitas'),
        api.get<ProgramKerja[]>('/api/program-kerja'),
        api.get<JenisAktivitas[]>('/api/jenis-aktivitas'),
        api.get<Personel[]>('/api/personel'),
      ]);
      setRows(akt);
      setPrograms(prg);
      setJenisList(jns);
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
        r.nama_aktivitas.toLowerCase().includes(search.toLowerCase()) ||
        (r.nama_program || '').toLowerCase().includes(search.toLowerCase());
      const matchProgram = !filterProgram || r.id_program === filterProgram;
      return matchSearch && matchProgram;
    });
  }, [rows, search, filterProgram]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), id_program: programs[0]?.id_program || '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Aktivitas) => {
    setEditing(row);
    setForm({
      ...row,
      id_jenis_aktivitas: row.id_jenis_aktivitas ?? '',
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
        await api.put(`/api/aktivitas/${editing.id_aktivitas}`, form);
      } else {
        await api.post('/api/aktivitas', form);
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
      await api.delete(`/api/aktivitas/${deleteTarget.id_aktivitas}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Aktivitas>[] = [
    {
      key: 'aktivitas',
      header: 'Aktivitas',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_aktivitas}</div>
          <div className="text-xs text-slate-500">Program: {r.nama_program}</div>
        </div>
      ),
    },
    { key: 'jenis', header: 'Jenis & Pola', render: (r) => <span className="text-xs text-slate-700">{r.nama_jenis_aktivitas || '—'} · {r.pola_aktivitas}</span> },
    {
      key: 'capaian',
      header: 'Target / Realisasi',
      align: 'right',
      render: (r) => (
        <div className="font-mono text-xs">
          <div className="text-slate-900 font-semibold">
            {formatAngka(r.realisasi_pelaksanaan || 0)} / {formatAngka(r.target_frekuensi)} kegiatan
          </div>
          <div className="text-slate-500">Capaian: {formatPersen(r.persentase_capaian || 0)}</div>
        </div>
      ),
    },
    {
      key: 'periode',
      header: 'Jadwal',
      render: (r) => (
        <span className="text-xs text-slate-600 tabular-nums">
          {formatTanggal(r.tanggal_mulai)} – {formatTanggal(r.tanggal_selesai)}
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
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Aktivitas">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Aktivitas">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Aktivitas Program Kerja"
        description="Jenis pelaksanaan di bawah Program Kerja (Program Kerja → Aktivitas → Pelaksanaan Kegiatan)."
        actionLabel="Tambah Aktivitas"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_aktivitas}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nama aktivitas atau program kerja..."
          filters={
            <Select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="!w-auto min-w-[200px]">
              <option value="">Semua Program Kerja</option>
              {programs.map((p) => (
                <option key={p.id_program} value={p.id_program}>{p.nama_program}</option>
              ))}
            </Select>
          }
          emptyTitle="Belum ada Aktivitas"
          emptyDescription="Daftar Aktivitas masih kosong (0 record). Buat Program Kerja terlebih dahulu, lalu tambahkan Aktivitas di bawahnya."
          emptyActionLabel="Tambah Aktivitas"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Aktivitas' : 'Tambah Aktivitas'} onClose={() => setModalOpen(false)}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jenis Aktivitas">
              <Select
                value={form.id_jenis_aktivitas || ''}
                onChange={(e) => {
                  const j = jenisList.find((x) => x.id_jenis_aktivitas === e.target.value);
                  setForm({
                    ...form,
                    id_jenis_aktivitas: e.target.value,
                    pola_aktivitas: j ? j.pola_aktivitas : form.pola_aktivitas,
                  });
                }}
              >
                <option value="">Pilih Jenis Aktivitas...</option>
                {jenisList.map((j) => (
                  <option key={j.id_jenis_aktivitas} value={j.id_jenis_aktivitas}>{j.nama_jenis_aktivitas}</option>
                ))}
              </Select>
            </Field>
            <Field label="Pola Aktivitas" required>
              <Select value={form.pola_aktivitas || 'Sekali'} onChange={(e) => setForm({ ...form, pola_aktivitas: e.target.value as PolaAktivitas })}>
                {POLA_AKTIVITAS_LIST.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Nama Aktivitas" required>
            <Input required value={form.nama_aktivitas || ''} onChange={(e) => setForm({ ...form, nama_aktivitas: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Frekuensi (Keterangan)">
              <Input value={form.frekuensi || ''} onChange={(e) => setForm({ ...form, frekuensi: e.target.value })} placeholder="Mis. 6 kali per tahun" />
            </Field>
            <Field label="Target Frekuensi (Jumlah)" required>
              <Input type="number" min={1} required value={form.target_frekuensi ?? 1} onChange={(e) => setForm({ ...form, target_frekuensi: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tanggal Mulai"><Input type="date" value={form.tanggal_mulai || ''} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></Field>
            <Field label="Tanggal Selesai"><Input type="date" value={form.tanggal_selesai || ''} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Penanggung Jawab (PIC)">
              <Select value={form.id_pic || ''} onChange={(e) => setForm({ ...form, id_pic: e.target.value })}>
                <option value="">Pilih Personel...</option>
                {personel.map((p) => (
                  <option key={p.id_personel} value={p.id_personel}>{p.nama_personel}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status || 'Direncanakan'} onChange={(e) => setForm({ ...form, status: e.target.value as Aktivitas['status'] })}>
                <option value="Direncanakan">Direncanakan</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Selesai">Selesai</option>
                <option value="Ditunda">Ditunda</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan">
            <Textarea rows={2} value={form.keterangan || ''} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
          </Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Aktivitas"
        message={`Hapus Aktivitas "${deleteTarget?.nama_aktivitas}"? Seluruh Pelaksanaan Kegiatan di bawahnya juga akan terhapus.`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
