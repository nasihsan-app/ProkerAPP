import { Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { type Organisasi, type Renstra, type SasaranStrategis } from '../types';

// ==========================================
// 1. RENSTRA
// ==========================================
export function RenstraPage() {
  const [rows, setRows] = useState<Renstra[]>([]);
  const [organisasi, setOrganisasi] = useState<Organisasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Renstra | null>(null);
  const [form, setForm] = useState<Partial<Renstra>>({
    nama_renstra: '',
    periode_mulai: '',
    periode_selesai: '',
    id_organisasi: '',
    visi: '',
    dokumen: '',
    status: 'Aktif',
    keterangan: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Renstra | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rns, org] = await Promise.all([
        api.get<Renstra[]>('/api/renstra'),
        api.get<Organisasi[]>('/api/organisasi'),
      ]);
      setRows(rns);
      setOrganisasi(org);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          r.id_renstra.toLowerCase().includes(search.toLowerCase()) ||
          r.nama_renstra.toLowerCase().includes(search.toLowerCase()) ||
          (r.visi || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.nama_organisasi || '').toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      nama_renstra: '',
      periode_mulai: '',
      periode_selesai: '',
      id_organisasi: '',
      visi: '',
      dokumen: '',
      status: 'Aktif',
      keterangan: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Renstra) => {
    setEditing(row);
    setForm({ ...row, id_organisasi: row.id_organisasi ?? '', visi: row.visi ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/renstra/${editing.id_renstra}`, form);
      } else {
        await api.post('/api/renstra', form);
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
      await api.delete(`/api/renstra/${deleteTarget.id_renstra}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Renstra>[] = [
    { key: 'id', header: 'ID Renstra', render: (r) => <span className="font-mono text-xs text-slate-700">{r.id_renstra}</span> },
    {
      key: 'nama',
      header: 'Nama Renstra & Visi',
      render: (r) => (
        <div className="max-w-xl">
          <div className="font-medium text-slate-900">{r.nama_renstra}</div>
          {r.visi && <div className="text-xs text-slate-500 mt-1 leading-relaxed">{r.visi}</div>}
        </div>
      ),
    },
    {
      key: 'periode',
      header: 'Periode',
      render: (r) => (
        <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
          {r.periode_mulai || '—'}–{r.periode_selesai || '—'}
        </span>
      ),
    },
    { key: 'dok', header: 'Sumber Dokumen', render: (r) => <span className="font-mono text-xs text-slate-600">{r.dokumen || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Renstra">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Renstra">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Rencana Strategis (Renstra)"
        description="Dokumen perencanaan strategis jangka menengah yang menjadi induk Sasaran Strategis dan Program Kerja."
        actionLabel="Tambah Renstra"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_renstra}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari ID, nama Renstra, atau visi..."
          emptyTitle="Belum ada data Renstra"
          emptyDescription="Tambahkan dokumen Renstra sebagai dasar penyusunan Sasaran Strategis."
          emptyActionLabel="Tambah Renstra"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Renstra' : 'Tambah Renstra'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <Field label="Nama Renstra" required>
            <Input required value={form.nama_renstra || ''} onChange={(e) => setForm({ ...form, nama_renstra: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Periode Mulai">
              <Input value={form.periode_mulai || ''} onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })} placeholder="Mis. 2024" />
            </Field>
            <Field label="Periode Selesai">
              <Input value={form.periode_selesai || ''} onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })} placeholder="Mis. 2028" />
            </Field>
            <Field label="Status">
              <Select value={form.status || 'Aktif'} onChange={(e) => setForm({ ...form, status: e.target.value as Renstra['status'] })}>
                <option value="Aktif">Aktif</option>
                <option value="Draft">Draft</option>
                <option value="Selesai">Selesai</option>
                <option value="Arsip">Arsip</option>
              </Select>
            </Field>
          </div>
          <Field label="Visi">
            <Textarea rows={3} value={form.visi || ''} onChange={(e) => setForm({ ...form, visi: e.target.value })} placeholder="Visi sesuai dokumen Renstra" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Organisasi">
              <Select value={form.id_organisasi || ''} onChange={(e) => setForm({ ...form, id_organisasi: e.target.value })}>
                <option value="">Pilih Organisasi...</option>
                {organisasi.map((o) => (
                  <option key={o.id_organisasi} value={o.id_organisasi}>{o.nama_organisasi}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sumber Dokumen">
              <Input value={form.dokumen || ''} onChange={(e) => setForm({ ...form, dokumen: e.target.value })} placeholder="Nama berkas atau nomor SK dokumen" />
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
        title="Hapus Renstra"
        message={`Hapus Renstra "${deleteTarget?.nama_renstra}"? Seluruh Sasaran Strategis di bawahnya juga akan terhapus.`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ==========================================
// 2. SASARAN STRATEGIS
// ==========================================
export function SasaranStrategisPage() {
  const [rows, setRows] = useState<SasaranStrategis[]>([]);
  const [renstra, setRenstra] = useState<Renstra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRenstra, setFilterRenstra] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SasaranStrategis | null>(null);
  const [form, setForm] = useState<Partial<SasaranStrategis>>({
    id_renstra: '',
    nomor: '',
    kode_sasaran: '',
    nama_sasaran: '',
    periode_mulai: '',
    periode_selesai: '',
    sumber: '',
    deskripsi: '',
    indikator: '',
    target: '',
    satuan: '',
    status: 'Aktif',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SasaranStrategis | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sas, rns] = await Promise.all([
        api.get<SasaranStrategis[]>('/api/sasaran-strategis'),
        api.get<Renstra[]>('/api/renstra'),
      ]);
      setRows(sas);
      setRenstra(rns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const matchSearch =
          !search ||
          r.id_sasaran.toLowerCase().includes(search.toLowerCase()) ||
          r.nama_sasaran.toLowerCase().includes(search.toLowerCase()) ||
          (r.nomor || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.kode_sasaran || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.sumber || '').toLowerCase().includes(search.toLowerCase());
        const matchRenstra = !filterRenstra || r.id_renstra === filterRenstra;
        return matchSearch && matchRenstra;
      }),
    [rows, search, filterRenstra]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      id_renstra: renstra[0]?.id_renstra || '',
      nomor: '',
      kode_sasaran: '',
      nama_sasaran: '',
      periode_mulai: renstra[0]?.periode_mulai || '',
      periode_selesai: renstra[0]?.periode_selesai || '',
      sumber: '',
      deskripsi: '',
      indikator: '',
      target: '',
      satuan: '',
      status: 'Aktif',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: SasaranStrategis) => {
    setEditing(row);
    setForm({ ...row });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/sasaran-strategis/${editing.id_sasaran}`, form);
      } else {
        await api.post('/api/sasaran-strategis', form);
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
      await api.delete(`/api/sasaran-strategis/${deleteTarget.id_sasaran}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<SasaranStrategis>[] = [
    { key: 'id', header: 'ID Sasaran', render: (r) => <span className="font-mono text-xs text-slate-700">{r.id_sasaran}</span> },
    { key: 'nomor', header: 'No.', render: (r) => <span className="font-mono text-xs text-slate-600">{r.nomor || r.kode_sasaran || '—'}</span> },
    {
      key: 'nama',
      header: 'Sasaran Strategis',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_sasaran}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            <span className="font-mono">{r.id_renstra}</span> · {r.nama_renstra}
          </div>
        </div>
      ),
    },
    {
      key: 'periode',
      header: 'Periode',
      render: (r) => (
        <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
          {r.periode_mulai || '—'}–{r.periode_selesai || '—'}
        </span>
      ),
    },
    { key: 'sumber', header: 'Sumber', render: (r) => <span className="text-xs text-slate-600">{r.sumber || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Sasaran Strategis">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Sasaran Strategis">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sasaran Strategis"
        description="Sasaran Strategis turunan Renstra (Renstra → Sasaran Strategis → Program Kerja)."
        actionLabel="Tambah Sasaran Strategis"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_sasaran}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari ID, nomor, sasaran strategis, atau sumber..."
          filters={
            <Select value={filterRenstra} onChange={(e) => setFilterRenstra(e.target.value)} className="!w-auto min-w-[200px]">
              <option value="">Semua Renstra</option>
              {renstra.map((r) => (
                <option key={r.id_renstra} value={r.id_renstra}>{r.nama_renstra}</option>
              ))}
            </Select>
          }
          emptyTitle="Belum ada data Sasaran Strategis"
          emptyDescription="Pastikan Renstra telah dibuat, lalu tambahkan Sasaran Strategis terkait."
          emptyActionLabel="Tambah Sasaran Strategis"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Sasaran Strategis' : 'Tambah Sasaran Strategis'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field label="Renstra" required>
                <Select required value={form.id_renstra || ''} onChange={(e) => setForm({ ...form, id_renstra: e.target.value })}>
                  <option value="">Pilih Renstra...</option>
                  {renstra.map((r) => (
                    <option key={r.id_renstra} value={r.id_renstra}>{r.id_renstra} — {r.nama_renstra}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Nomor">
              <Input value={form.nomor || ''} onChange={(e) => setForm({ ...form, nomor: e.target.value, kode_sasaran: e.target.value })} placeholder="Mis. 1" />
            </Field>
          </div>
          <Field label="Sasaran Strategis" required>
            <Textarea rows={2} required value={form.nama_sasaran || ''} onChange={(e) => setForm({ ...form, nama_sasaran: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Periode Mulai">
              <Input value={form.periode_mulai || ''} onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })} placeholder="2024" />
            </Field>
            <Field label="Periode Selesai">
              <Input value={form.periode_selesai || ''} onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })} placeholder="2028" />
            </Field>
            <Field label="Sumber">
              <Input value={form.sumber || ''} onChange={(e) => setForm({ ...form, sumber: e.target.value })} placeholder="Bab IV, Bagian 4.1" />
            </Field>
          </div>
          <Field label="Deskripsi">
            <Textarea rows={2} value={form.deskripsi || ''} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Indikator">
              <Input value={form.indikator || ''} onChange={(e) => setForm({ ...form, indikator: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status || 'Aktif'} onChange={(e) => setForm({ ...form, status: e.target.value as 'Aktif' | 'Nonaktif' })}>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Target">
              <Input value={form.target || ''} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </Field>
            <Field label="Satuan">
              <Input value={form.satuan || ''} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Sasaran Strategis"
        message={`Hapus sasaran strategis "${deleteTarget?.nama_sasaran}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
