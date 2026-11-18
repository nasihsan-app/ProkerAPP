import { Eye, GitBranch, Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, FormActions, Input, Select } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatTanggal } from '../lib/format';
import { JENIS_ORGANISASI_LIST, type JenisOrganisasi, type Organisasi, type Personel } from '../types';

const emptyForm = (): Partial<Organisasi> => ({
  kode_organisasi: '',
  nama_organisasi: '',
  jenis_organisasi: 'Fakultas',
  id_induk: '',
  nama_singkat: '',
  jenjang: '',
  status: 'Aktif',
  berlaku_mulai: '',
  berlaku_sampai: '',
  akreditasi: '',
  sumber: '',
  id_pimpinan: '',
});

export function MasterOrganisasiPage() {
  const [rows, setRows] = useState<Organisasi[]>([]);
  const [personelList, setPersonelList] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tabel' | 'hierarki'>('tabel');
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Organisasi | null>(null);
  const [editing, setEditing] = useState<Organisasi | null>(null);
  const [form, setForm] = useState<Partial<Organisasi>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organisasi | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgs, prs] = await Promise.all([
        api.get<Organisasi[]>('/api/organisasi'),
        api.get<Personel[]>('/api/personel'),
      ]);
      setRows(orgs);
      setPersonelList(prs);
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
        r.id_organisasi.toLowerCase().includes(search.toLowerCase()) ||
        r.nama_organisasi.toLowerCase().includes(search.toLowerCase()) ||
        r.kode_organisasi.toLowerCase().includes(search.toLowerCase()) ||
        r.nama_singkat.toLowerCase().includes(search.toLowerCase());
      const matchJenis = !filterJenis || r.jenis_organisasi === filterJenis;
      return matchSearch && matchJenis;
    });
  }, [rows, search, filterJenis]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Organisasi) => {
    setEditing(row);
    setForm({
      ...row,
      id_induk: row.id_induk ?? '',
      id_pimpinan: row.id_pimpinan ?? '',
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
        await api.put(`/api/organisasi/${editing.id_organisasi}`, form);
      } else {
        await api.post('/api/organisasi', form);
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
      await api.delete(`/api/organisasi/${deleteTarget.id_organisasi}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const renderTree = (parentId: string | null, depth = 0) => {
    const children = rows.filter((r) => (r.id_induk || null) === parentId);
    if (children.length === 0) return null;
    return (
      <div className={depth > 0 ? 'ml-6 pl-4 border-l border-slate-200 space-y-2 mt-2' : 'space-y-2'}>
        {children.map((node) => (
          <div key={node.id_organisasi}>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{node.kode_organisasi || node.id_organisasi}</span>
                  <span aria-hidden="true">·</span>
                  <span>{node.jenis_organisasi}</span>
                  {node.jenjang && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Jenjang {node.jenjang}</span>
                    </>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">{node.nama_organisasi}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusText value={node.status} />
                <button
                  type="button"
                  onClick={() => openEdit(node)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                  aria-label={`Edit ${node.nama_organisasi}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
            {renderTree(node.id_organisasi, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  const columns: ColumnDef<Organisasi>[] = [
    {
      key: 'kode',
      header: 'Kode',
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.kode_organisasi || r.id_organisasi}</span>,
    },
    {
      key: 'nama',
      header: 'Nama Organisasi',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_organisasi}</div>
          {r.nama_singkat && <div className="text-xs text-slate-500">{r.nama_singkat}</div>}
        </div>
      ),
    },
    {
      key: 'jenis',
      header: 'Jenis Organisasi',
      render: (r) => <span className="text-slate-700">{r.jenis_organisasi}</span>,
    },
    {
      key: 'induk',
      header: 'Organisasi Induk',
      render: (r) => <span className="text-slate-600">{r.nama_induk || '—'}</span>,
    },
    {
      key: 'pimpinan',
      header: 'Kepala/Pimpinan',
      render: (r) => <span className="text-slate-600">{r.nama_pimpinan || '—'}</span>,
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
            title="Detail Organisasi"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Edit Organisasi"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(r)}
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50"
            title="Hapus Organisasi"
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
        title="Master Organisasi"
        description="Struktur hierarkis Universitas, Fakultas, Jurusan, Program Studi, dan unit pendukung FMIPA UNM."
        actionLabel="Tambah Organisasi"
        onAction={openCreate}
        extraActions={
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setViewMode('tabel')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                viewMode === 'tabel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tabel
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hierarki')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                viewMode === 'hierarki' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hierarki</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : viewMode === 'hierarki' ? (
        rows.length === 0 ? (
          <EmptyState
            title="Belum ada data Organisasi"
            description="Tambahkan struktur organisasi seperti Universitas, Fakultas, Jurusan, Program Studi, atau Unit Pendukung."
            actionLabel="Tambah Organisasi"
            onAction={openCreate}
          />
        ) : (
          <div>{renderTree(null)}</div>
        )
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_organisasi}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari kode atau nama organisasi..."
          filters={
            <Select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="!w-auto min-w-[180px]"
            >
              <option value="">Semua Jenis Organisasi</option>
              {JENIS_ORGANISASI_LIST.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </Select>
          }
          emptyTitle="Belum ada data Organisasi"
          emptyDescription="Basis data Organisasi masih kosong. Tambahkan entitas Organisasi menggunakan ID Organisasi unik."
          emptyActionLabel="Tambah Organisasi"
          onEmptyAction={openCreate}
          onRowClick={(r) => setDetailRow(r)}
        />
      )}

      {/* Modal Tambah/Edit */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Organisasi' : 'Tambah Organisasi'}
        subtitle={editing ? `ID Organisasi: ${editing.id_organisasi}` : 'ID Organisasi dibuat otomatis secara unik'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kode Organisasi">
              <Input
                value={form.kode_organisasi || ''}
                onChange={(e) => setForm({ ...form, kode_organisasi: e.target.value })}
                placeholder="Mis. FMIPA-MAT"
              />
            </Field>
            <Field label="Jenis Organisasi" required>
              <Select
                value={form.jenis_organisasi || 'Fakultas'}
                onChange={(e) => setForm({ ...form, jenis_organisasi: e.target.value as JenisOrganisasi })}
              >
                {JENIS_ORGANISASI_LIST.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Nama Organisasi" required>
            <Input
              required
              value={form.nama_organisasi || ''}
              onChange={(e) => setForm({ ...form, nama_organisasi: e.target.value })}
              placeholder="Nama resmi organisasi"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Singkat">
              <Input
                value={form.nama_singkat || ''}
                onChange={(e) => setForm({ ...form, nama_singkat: e.target.value })}
              />
            </Field>
            <Field label="Organisasi Induk">
              <Select
                value={form.id_induk || ''}
                onChange={(e) => setForm({ ...form, id_induk: e.target.value })}
              >
                <option value="">Tidak ada (Tingkat Atas)</option>
                {rows
                  .filter((o) => o.id_organisasi !== editing?.id_organisasi)
                  .map((o) => (
                    <option key={o.id_organisasi} value={o.id_organisasi}>
                      {o.nama_organisasi} ({o.jenis_organisasi})
                    </option>
                  ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Jenjang">
              <Input
                value={form.jenjang || ''}
                onChange={(e) => setForm({ ...form, jenjang: e.target.value })}
                placeholder="S1 / S2 / S3 / —"
              />
            </Field>
            <Field label="Akreditasi">
              <Input
                value={form.akreditasi || ''}
                onChange={(e) => setForm({ ...form, akreditasi: e.target.value })}
                placeholder="Unggul / A / B"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status || 'Aktif'}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Aktif' | 'Nonaktif' })}
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Field label="Kepala/Pimpinan">
              <Select
                value={form.id_pimpinan || ''}
                onChange={(e) => setForm({ ...form, id_pimpinan: e.target.value })}
              >
                <option value="">Belum ditetapkan</option>
                {personelList.map((p) => (
                  <option key={p.id_personel} value={p.id_personel}>
                    {p.nama_personel}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Sumber">
            <Input
              value={form.sumber || ''}
              onChange={(e) => setForm({ ...form, sumber: e.target.value })}
              placeholder="Sumber dokumen / file referensi"
            />
          </Field>

          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      {/* Modal Detail */}
      <Modal
        open={!!detailRow}
        title="Detail Organisasi"
        subtitle={detailRow ? `ID: ${detailRow.id_organisasi}` : undefined}
        onClose={() => setDetailRow(null)}
      >
        {detailRow && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['ID Organisasi', detailRow.id_organisasi],
              ['Kode Organisasi', detailRow.kode_organisasi || '—'],
              ['Nama Organisasi', detailRow.nama_organisasi],
              ['Nama Singkat', detailRow.nama_singkat || '—'],
              ['Jenis Organisasi', detailRow.jenis_organisasi],
              ['Organisasi Induk', detailRow.nama_induk || '—'],
              ['Jenjang', detailRow.jenjang || '—'],
              ['Akreditasi', detailRow.akreditasi || '—'],
              ['Kepala/Pimpinan', detailRow.nama_pimpinan || '—'],
              ['Status', detailRow.status],
              ['Sumber', detailRow.sumber || '—'],
              ['Berlaku Mulai', formatTanggal(detailRow.berlaku_mulai)],
              ['Berlaku Sampai', formatTanggal(detailRow.berlaku_sampai)],
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
        title="Hapus Organisasi"
        message={`Apakah Anda yakin ingin menghapus organisasi "${deleteTarget?.nama_organisasi}"? Tindakan ini tidak dapat dibatalkan.`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
