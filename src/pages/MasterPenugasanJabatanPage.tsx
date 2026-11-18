import { Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatTanggal } from '../lib/format';
import { type Organisasi, type PenugasanJabatan, type Personel } from '../types';

const emptyForm = (): Partial<PenugasanJabatan> => ({
  id_personel: '',
  id_organisasi: '',
  jabatan: '',
  status: 'Aktif',
  berlaku_mulai: '',
  berlaku_sampai: '',
});

export function MasterPenugasanJabatanPage() {
  const [rows, setRows] = useState<PenugasanJabatan[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [organisasi, setOrganisasi] = useState<Organisasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PenugasanJabatan | null>(null);
  const [form, setForm] = useState<Partial<PenugasanJabatan>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PenugasanJabatan | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jbt, prs, org] = await Promise.all([
        api.get<PenugasanJabatan[]>('/api/penugasan-jabatan'),
        api.get<Personel[]>('/api/personel'),
        api.get<Organisasi[]>('/api/organisasi'),
      ]);
      setRows(jbt);
      setPersonel(prs);
      setOrganisasi(org);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        !search ||
        (r.nama_personel || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.nama_organisasi || '').toLowerCase().includes(search.toLowerCase()) ||
        r.jabatan.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: PenugasanJabatan) => {
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
        await api.put(`/api/penugasan-jabatan/${editing.id_penugasan}`, form);
      } else {
        await api.post('/api/penugasan-jabatan', form);
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
      await api.delete(`/api/penugasan-jabatan/${deleteTarget.id_penugasan}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<PenugasanJabatan>[] = [
    {
      key: 'id',
      header: 'ID Penugasan',
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.id_penugasan}</span>,
    },
    {
      key: 'personel',
      header: 'Personel',
      render: (r) => <span className="font-medium text-slate-900">{r.nama_personel}</span>,
    },
    {
      key: 'jabatan',
      header: 'Jabatan',
      render: (r) => <span className="text-slate-800">{r.jabatan}</span>,
    },
    {
      key: 'organisasi',
      header: 'Organisasi',
      render: (r) => <span className="text-slate-700">{r.nama_organisasi}</span>,
    },
    {
      key: 'periode',
      header: 'Masa Berlaku',
      render: (r) => (
        <span className="text-xs text-slate-600 tabular-nums">
          {formatTanggal(r.berlaku_mulai)} – {formatTanggal(r.berlaku_sampai)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusText value={r.status} />,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Edit Penugasan Jabatan"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(r)}
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50"
            title="Hapus Penugasan Jabatan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Penugasan Jabatan"
        description="Relasi penugasan jabatan antara Personel dan Organisasi. Satu Personel dapat memiliki lebih dari satu Penugasan Jabatan."
        actionLabel="Tambah Penugasan Jabatan"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_penugasan}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari personel, jabatan, atau organisasi..."
          emptyTitle="Belum ada data Penugasan Jabatan"
          emptyDescription="Penugasan Jabatan menghubungkan Personel ke Organisasi dengan jabatan tertentu."
          emptyActionLabel="Tambah Penugasan Jabatan"
          onEmptyAction={openCreate}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Penugasan Jabatan' : 'Tambah Penugasan Jabatan'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>
          )}
          <Field label="Personel" required>
            <Select
              required
              value={form.id_personel || ''}
              onChange={(e) => setForm({ ...form, id_personel: e.target.value })}
            >
              <option value="">Pilih Personel...</option>
              {personel.map((p) => (
                <option key={p.id_personel} value={p.id_personel}>
                  {p.nama_personel} {p.nip ? `(${p.nip})` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Organisasi" required>
            <Select
              required
              value={form.id_organisasi || ''}
              onChange={(e) => setForm({ ...form, id_organisasi: e.target.value })}
            >
              <option value="">Pilih Organisasi...</option>
              {organisasi.map((o) => (
                <option key={o.id_organisasi} value={o.id_organisasi}>
                  {o.nama_organisasi} ({o.jenis_organisasi})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jabatan" required>
              <Input
                required
                value={form.jabatan || ''}
                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                placeholder="Mis. Dekan, Ketua Jurusan, Koordinator Prodi"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status || 'Aktif'}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'Aktif' | 'Selesai' | 'Nonaktif' })
                }
              >
                <option value="Aktif">Aktif</option>
                <option value="Selesai">Selesai</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Berlaku Mulai">
              <Input
                type="date"
                value={form.berlaku_mulai || ''}
                onChange={(e) => setForm({ ...form, berlaku_mulai: e.target.value })}
              />
            </Field>
            <Field label="Berlaku Sampai">
              <Input
                type="date"
                value={form.berlaku_sampai || ''}
                onChange={(e) => setForm({ ...form, berlaku_sampai: e.target.value })}
              />
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Penugasan Jabatan"
        message={`Hapus penugasan jabatan "${deleteTarget?.jabatan}" untuk "${deleteTarget?.nama_personel}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
