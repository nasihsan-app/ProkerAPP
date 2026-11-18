import { Eye, Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { type Personel } from '../types';

const emptyForm = (): Partial<Personel> => ({
  nip: '',
  nama_personel: '',
  status: 'Aktif',
  email: '',
  nomor_telepon: '',
});

export function MasterPersonelPage() {
  const [rows, setRows] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Personel | null>(null);
  const [editing, setEditing] = useState<Personel | null>(null);
  const [form, setForm] = useState<Partial<Personel>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Personel | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setRows(await api.get<Personel[]>('/api/personel'));
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
        r.id_personel.toLowerCase().includes(search.toLowerCase()) ||
        r.nama_personel.toLowerCase().includes(search.toLowerCase()) ||
        r.nip.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Personel) => {
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
        await api.put(`/api/personel/${editing.id_personel}`, form);
      } else {
        await api.post('/api/personel', form);
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
      await api.delete(`/api/personel/${deleteTarget.id_personel}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Personel>[] = [
    {
      key: 'id',
      header: 'ID Personel',
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.id_personel}</span>,
    },
    {
      key: 'nip',
      header: 'NIP',
      render: (r) => <span className="font-mono text-xs text-slate-700">{r.nip || '—'}</span>,
    },
    {
      key: 'nama',
      header: 'Nama Personel',
      render: (r) => <span className="font-medium text-slate-900">{r.nama_personel}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (r) => <span className="text-slate-600">{r.email || '—'}</span>,
    },
    {
      key: 'telepon',
      header: 'Nomor Telepon',
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.nomor_telepon || '—'}</span>,
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
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setDetailRow(r)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Detail Personel"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Edit Personel"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(r)}
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50"
            title="Hapus Personel"
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
        title="Master Personel"
        description="Data identitas personel FMIPA UNM. Penetapan jabatan dikelola terpisah pada modul Penugasan Jabatan."
        actionLabel="Tambah Personel"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_personel}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari NIP, nama personel, atau email..."
          emptyTitle="Belum ada data Personel"
          emptyDescription="Tambahkan data Personel tanpa mengaitkan jabatan tetap. Jabatan diatur melalui Penugasan Jabatan."
          emptyActionLabel="Tambah Personel"
          onEmptyAction={openCreate}
          onRowClick={(r) => setDetailRow(r)}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Personel' : 'Tambah Personel'}
        subtitle={editing ? `ID Personel: ${editing.id_personel}` : undefined}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="NIP">
              <Input
                value={form.nip || ''}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
                placeholder="Nomor Induk Pegawai"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status ?? ''}
                onChange={(e) => setForm({ ...form, status: e.target.value as Personel['status'] })}
              >
                <option value="">Belum ditentukan</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <Field label="Nama Personel" required>
            <Input
              required
              value={form.nama_personel || ''}
              onChange={(e) => setForm({ ...form, nama_personel: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <Input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Nomor Telepon">
              <Input
                value={form.nomor_telepon || ''}
                onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })}
              />
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <Modal open={!!detailRow} title="Detail Personel" onClose={() => setDetailRow(null)}>
        {detailRow && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['ID Personel', detailRow.id_personel],
              ['NIP', detailRow.nip || '—'],
              ['Nama Personel', detailRow.nama_personel],
              ['Status', detailRow.status],
              ['Email', detailRow.email || '—'],
              ['Nomor Telepon', detailRow.nomor_telepon || '—'],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-slate-100 pb-2">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Personel"
        message={`Apakah Anda yakin ingin menghapus data personel "${deleteTarget?.nama_personel}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
