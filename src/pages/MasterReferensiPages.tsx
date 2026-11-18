import { Eye, Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import {
  type IKU,
  JENIS_MITRA_LIST,
  type JenisAktivitas,
  type JenisMitra,
  type Mitra,
  POLA_AKTIVITAS_LIST,
  type PolaAktivitas,
  type SDG,
} from '../types';

// ==========================================
// 1. MASTER JENIS AKTIVITAS
// ==========================================
export function MasterJenisAktivitasPage() {
  const [rows, setRows] = useState<JenisAktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JenisAktivitas | null>(null);
  const [form, setForm] = useState<Partial<JenisAktivitas>>({
    kode: '',
    nama_jenis_aktivitas: '',
    deskripsi: '',
    pola_aktivitas: 'Sekali',
    status: 'Aktif',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JenisAktivitas | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setRows(await api.get<JenisAktivitas[]>('/api/jenis-aktivitas'));
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
          r.nama_jenis_aktivitas.toLowerCase().includes(search.toLowerCase()) ||
          r.kode.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ kode: '', nama_jenis_aktivitas: '', deskripsi: '', pola_aktivitas: 'Sekali', status: 'Aktif' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: JenisAktivitas) => {
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
        await api.put(`/api/jenis-aktivitas/${editing.id_jenis_aktivitas}`, form);
      } else {
        await api.post('/api/jenis-aktivitas', form);
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
      await api.delete(`/api/jenis-aktivitas/${deleteTarget.id_jenis_aktivitas}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<JenisAktivitas>[] = [
    { key: 'kode', header: 'Kode', render: (r) => <span className="font-mono text-xs">{r.kode || r.id_jenis_aktivitas}</span> },
    {
      key: 'nama',
      header: 'Nama Jenis Aktivitas',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_jenis_aktivitas}</div>
          {r.deskripsi && <div className="text-xs text-slate-500 line-clamp-1">{r.deskripsi}</div>}
        </div>
      ),
    },
    { key: 'pola', header: 'Pola Aktivitas', render: (r) => <span className="text-slate-700">{r.pola_aktivitas}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Jenis Aktivitas">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Jenis Aktivitas">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Master Jenis Aktivitas"
        description="Referensi kategori dan pola aktivitas yang terpisah dari aktivitas aktual Program Kerja."
        actionLabel="Tambah Jenis Aktivitas"
        onAction={openCreate}
      />
      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_jenis_aktivitas}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari kode atau nama jenis aktivitas..."
          emptyTitle="Belum ada data Jenis Aktivitas"
          emptyDescription="Tambahkan referensi Jenis Aktivitas beserta Pola Aktivitasnya."
          emptyActionLabel="Tambah Jenis Aktivitas"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Jenis Aktivitas' : 'Tambah Jenis Aktivitas'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kode">
              <Input value={form.kode || ''} onChange={(e) => setForm({ ...form, kode: e.target.value })} />
            </Field>
            <Field label="Pola Aktivitas" required>
              <Select
                value={form.pola_aktivitas || 'Sekali'}
                onChange={(e) => setForm({ ...form, pola_aktivitas: e.target.value as PolaAktivitas })}
              >
                {POLA_AKTIVITAS_LIST.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Nama Jenis Aktivitas" required>
            <Input required value={form.nama_jenis_aktivitas || ''} onChange={(e) => setForm({ ...form, nama_jenis_aktivitas: e.target.value })} />
          </Field>
          <Field label="Deskripsi">
            <Textarea rows={3} value={form.deskripsi || ''} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={form.status || 'Aktif'} onChange={(e) => setForm({ ...form, status: e.target.value as 'Aktif' | 'Nonaktif' })}>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </Select>
          </Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Jenis Aktivitas"
        message={`Hapus jenis aktivitas "${deleteTarget?.nama_jenis_aktivitas}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ==========================================
// 2. MASTER MITRA
// ==========================================
export function MasterMitraPage() {
  const [rows, setRows] = useState<Mitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Mitra | null>(null);
  const [editing, setEditing] = useState<Mitra | null>(null);
  const [form, setForm] = useState<Partial<Mitra>>({
    nama_mitra: '',
    jenis_mitra: 'Perguruan Tinggi',
    negara: 'Indonesia',
    kota: '',
    sektor: '',
    website: '',
    pic_mitra: '',
    email: '',
    nomor_telepon: '',
    status: 'Aktif',
    keterangan: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mitra | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setRows(await api.get<Mitra[]>('/api/mitra'));
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
          r.nama_mitra.toLowerCase().includes(search.toLowerCase()) ||
          r.kota.toLowerCase().includes(search.toLowerCase()) ||
          r.sektor.toLowerCase().includes(search.toLowerCase());
        const matchJenis = !filterJenis || r.jenis_mitra === filterJenis;
        return matchSearch && matchJenis;
      }),
    [rows, search, filterJenis]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      nama_mitra: '',
      jenis_mitra: 'Perguruan Tinggi',
      negara: 'Indonesia',
      kota: '',
      sektor: '',
      website: '',
      pic_mitra: '',
      email: '',
      nomor_telepon: '',
      status: 'Aktif',
      keterangan: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Mitra) => {
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
        await api.put(`/api/mitra/${editing.id_mitra}`, form);
      } else {
        await api.post('/api/mitra', form);
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
      await api.delete(`/api/mitra/${deleteTarget.id_mitra}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Mitra>[] = [
    { key: 'id', header: 'ID Mitra', render: (r) => <span className="font-mono text-xs text-slate-600">{r.id_mitra}</span> },
    { key: 'nama', header: 'Nama Mitra', render: (r) => <span className="font-medium text-slate-900">{r.nama_mitra}</span> },
    { key: 'jenis', header: 'Jenis Mitra', render: (r) => <span className="text-slate-700">{r.jenis_mitra}</span> },
    {
      key: 'lokasi',
      header: 'Kota / Negara',
      render: (r) => <span className="text-slate-600">{[r.kota, r.negara].filter(Boolean).join(', ') || '—'}</span>,
    },
    { key: 'pic', header: 'PIC Mitra', render: (r) => <span className="text-slate-600">{r.pic_mitra || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setDetailRow(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Detail Mitra">
            <Eye className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Mitra">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Mitra">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Master Mitra"
        description="Daftar mitra perguruan tinggi, pemerintah, industri, lembaga penelitian, dan mitra kolaborasi lainnya."
        actionLabel="Tambah Mitra"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_mitra}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nama mitra, kota, atau sektor..."
          filters={
            <Select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} className="!w-auto min-w-[180px]">
              <option value="">Semua Jenis Mitra</option>
              {JENIS_MITRA_LIST.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </Select>
          }
          emptyTitle="Belum ada data Mitra"
          emptyDescription="Tambahkan data mitra kolaborasi untuk dikaitkan dengan Program Kerja."
          emptyActionLabel="Tambah Mitra"
          onEmptyAction={openCreate}
          onRowClick={(r) => setDetailRow(r)}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Mitra' : 'Tambah Mitra'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Mitra" required>
              <Input required value={form.nama_mitra || ''} onChange={(e) => setForm({ ...form, nama_mitra: e.target.value })} />
            </Field>
            <Field label="Jenis Mitra" required>
              <Select value={form.jenis_mitra || 'Perguruan Tinggi'} onChange={(e) => setForm({ ...form, jenis_mitra: e.target.value as JenisMitra })}>
                {JENIS_MITRA_LIST.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Negara"><Input value={form.negara || ''} onChange={(e) => setForm({ ...form, negara: e.target.value })} /></Field>
            <Field label="Kota"><Input value={form.kota || ''} onChange={(e) => setForm({ ...form, kota: e.target.value })} /></Field>
            <Field label="Sektor"><Input value={form.sektor || ''} onChange={(e) => setForm({ ...form, sektor: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website"><Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></Field>
            <Field label="PIC Mitra"><Input value={form.pic_mitra || ''} onChange={(e) => setForm({ ...form, pic_mitra: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Nomor Telepon"><Input value={form.nomor_telepon || ''} onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={form.status || 'Aktif'} onChange={(e) => setForm({ ...form, status: e.target.value as 'Aktif' | 'Nonaktif' })}>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <Field label="Keterangan">
            <Textarea rows={2} value={form.keterangan || ''} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
          </Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <Modal open={!!detailRow} title="Detail Mitra" onClose={() => setDetailRow(null)}>
        {detailRow && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['ID Mitra', detailRow.id_mitra],
              ['Nama Mitra', detailRow.nama_mitra],
              ['Jenis Mitra', detailRow.jenis_mitra],
              ['Negara', detailRow.negara || '—'],
              ['Kota', detailRow.kota || '—'],
              ['Sektor', detailRow.sektor || '—'],
              ['Website', detailRow.website || '—'],
              ['PIC Mitra', detailRow.pic_mitra || '—'],
              ['Email', detailRow.email || '—'],
              ['Nomor Telepon', detailRow.nomor_telepon || '—'],
              ['Status', detailRow.status],
              ['Keterangan', detailRow.keterangan || '—'],
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
        title="Hapus Mitra"
        message={`Hapus data mitra "${deleteTarget?.nama_mitra}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ==========================================
// 3. MASTER IKU
// ==========================================
export function MasterIkuPage() {
  const [rows, setRows] = useState<IKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IKU | null>(null);
  const [form, setForm] = useState<Partial<IKU>>({
    kode_iku: '',
    nama_iku: '',
    deskripsi: '',
    satuan: '',
    sumber: '',
    status: 'Aktif',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IKU | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setRows(await api.get<IKU[]>('/api/iku'));
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
          r.kode_iku.toLowerCase().includes(search.toLowerCase()) ||
          r.nama_iku.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ kode_iku: '', nama_iku: '', deskripsi: '', satuan: '', sumber: '', status: 'Aktif' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: IKU) => {
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
        await api.put(`/api/iku/${editing.id_iku}`, form);
      } else {
        await api.post('/api/iku', form);
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
      await api.delete(`/api/iku/${deleteTarget.id_iku}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<IKU>[] = [
    { key: 'kode', header: 'Kode IKU', render: (r) => <span className="font-mono text-xs text-slate-700">{r.kode_iku}</span> },
    {
      key: 'nama',
      header: 'Nama IKU',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_iku}</div>
          {r.deskripsi && <div className="text-xs text-slate-500 line-clamp-1">{r.deskripsi}</div>}
        </div>
      ),
    },
    { key: 'satuan', header: 'Satuan', render: (r) => <span className="text-slate-600">{r.satuan || '—'}</span> },
    { key: 'sumber', header: 'Sumber', render: (r) => <span className="text-slate-600">{r.sumber || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit IKU">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus IKU">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Master IKU"
        description="Indikator Kinerja Utama (IKU) yang dapat dikaitkan ke satu atau lebih Program Kerja."
        actionLabel="Tambah IKU"
        onAction={openCreate}
      />
      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_iku}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari kode atau nama IKU..."
          emptyTitle="Belum ada data IKU"
          emptyDescription="Tambahkan daftar Indikator Kinerja Utama resmi sesuai ketetapan institusi."
          emptyActionLabel="Tambah IKU"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit IKU' : 'Tambah IKU'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kode IKU" required>
              <Input required value={form.kode_iku || ''} onChange={(e) => setForm({ ...form, kode_iku: e.target.value })} placeholder="Mis. IKU-1" />
            </Field>
            <Field label="Satuan">
              <Input value={form.satuan || ''} onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="Persen / Orang / Dokumen" />
            </Field>
          </div>
          <Field label="Nama IKU" required>
            <Input required value={form.nama_iku || ''} onChange={(e) => setForm({ ...form, nama_iku: e.target.value })} />
          </Field>
          <Field label="Deskripsi">
            <Textarea rows={3} value={form.deskripsi || ''} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sumber">
              <Input value={form.sumber || ''} onChange={(e) => setForm({ ...form, sumber: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status || 'Aktif'} onChange={(e) => setForm({ ...form, status: e.target.value as 'Aktif' | 'Nonaktif' })}>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus IKU"
        message={`Hapus IKU "${deleteTarget?.kode_iku} - ${deleteTarget?.nama_iku}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ==========================================
// 4. MASTER SDGs (17 Standar)
// ==========================================
export function MasterSdgsPage() {
  const [rows, setRows] = useState<SDG[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      setRows(await api.get<SDG[]>('/api/sdgs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStatus = async (row: SDG) => {
    const nextStatus = row.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    await api.patch(`/api/sdgs/${row.id_sdg}`, { status: nextStatus });
    await loadData();
  };

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          r.nama_sdg.toLowerCase().includes(search.toLowerCase()) ||
          String(r.nomor_sdg).includes(search)
      ),
    [rows, search]
  );

  const columns: ColumnDef<SDG>[] = [
    {
      key: 'nomor',
      header: 'Nomor SDG',
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-900">SDG {r.nomor_sdg}</span>,
    },
    { key: 'id', header: 'ID SDG', render: (r) => <span className="font-mono text-xs text-slate-500">{r.id_sdg}</span> },
    { key: 'nama', header: 'Nama SDG', render: (r) => <span className="font-medium text-slate-900">{r.nama_sdg}</span> },
    { key: 'deskripsi', header: 'Deskripsi', render: (r) => <span className="text-xs text-slate-600">{r.deskripsi}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Pengaturan',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => toggleStatus(r)}
          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
        >
          {r.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Master SDGs (Tujuan Pembangunan Berkelanjutan)"
        description="Referensi standar 17 Tujuan SDGs (1 sampai 17). Program Kerja dapat berkontribusi terhadap satu atau lebih SDGs."
      />
      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_sdg}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nomor atau nama SDG..."
          emptyTitle="Tidak ada data SDGs yang cocok"
          emptyDescription="Coba ubah kata kunci pencarian Anda."
        />
      )}
    </div>
  );
}
