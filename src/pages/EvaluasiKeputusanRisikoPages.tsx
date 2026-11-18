import { Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatTanggal } from '../lib/format';
import {
  type EvaluasiProgram,
  type KeputusanProgram,
  PILIHAN_KEPUTUSAN_LIST,
  type Personel,
  type PilihanKeputusan,
  type ProgramKerja,
  type RisikoProgram,
} from '../types';

// ==========================================
// 1. EVALUASI PROGRAM
// ==========================================
export function EvaluasiPage() {
  const [rows, setRows] = useState<EvaluasiProgram[]>([]);
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvaluasiProgram | null>(null);
  const [form, setForm] = useState<Partial<EvaluasiProgram>>({
    id_program: '',
    jenis_evaluasi: 'Evaluasi Usulan',
    tanggal_evaluasi: '',
    id_evaluator: '',
    evaluator: '',
    skor_keselarasan_strategis: 0,
    status_keselarasan: 'Selaras',
    temuan: '',
    rekomendasi: '',
    status_evaluasi: 'Draft',
    tindak_lanjut: '',
    status_tindak_lanjut: 'Belum Ditindaklanjuti',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvaluasiProgram | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evl, prg, prs] = await Promise.all([
        api.get<EvaluasiProgram[]>('/api/evaluasi'),
        api.get<ProgramKerja[]>('/api/program-kerja'),
        api.get<Personel[]>('/api/personel'),
      ]);
      setRows(evl);
      setPrograms(prg);
      setPersonel(prs);
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
          (r.nama_program || '').toLowerCase().includes(search.toLowerCase()) ||
          r.evaluator.toLowerCase().includes(search.toLowerCase()) ||
          r.jenis_evaluasi.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      id_program: programs[0]?.id_program || '',
      jenis_evaluasi: 'Evaluasi Usulan',
      tanggal_evaluasi: '',
      id_evaluator: '',
      evaluator: '',
      skor_keselarasan_strategis: 0,
      status_keselarasan: 'Selaras',
      temuan: '',
      rekomendasi: '',
      status_evaluasi: 'Draft',
      tindak_lanjut: '',
      status_tindak_lanjut: 'Belum Ditindaklanjuti',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: EvaluasiProgram) => {
    setEditing(row);
    setForm({ ...row, id_evaluator: row.id_evaluator ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/evaluasi/${editing.id_evaluasi}`, form);
      } else {
        await api.post('/api/evaluasi', form);
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
      await api.delete(`/api/evaluasi/${deleteTarget.id_evaluasi}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<EvaluasiProgram>[] = [
    {
      key: 'program',
      header: 'Program Kerja',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.nama_program}</div>
          <div className="text-xs text-slate-500">{r.jenis_evaluasi || '—'} · {formatTanggal(r.tanggal_evaluasi)}</div>
        </div>
      ),
    },
    { key: 'evaluator', header: 'Evaluator', render: (r) => <span className="text-slate-700">{r.evaluator || '—'}</span> },
    {
      key: 'skor',
      header: 'Keselarasan Strategis',
      render: (r) => (
        <div>
          <StatusText value={r.status_keselarasan} />
          <div className="text-xs font-mono text-slate-500 mt-0.5">Skor: {r.skor_keselarasan_strategis}</div>
        </div>
      ),
    },
    { key: 'eval_status', header: 'Status Evaluasi', render: (r) => <StatusText value={r.status_evaluasi} /> },
    { key: 'tl_status', header: 'Status Tindak Lanjut', render: (r) => <StatusText value={r.status_tindak_lanjut} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Evaluasi">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Evaluasi">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Evaluasi Program"
        description="Entitas evaluasi terpisah dari Program Kerja untuk mencatat keselarasan strategis, temuan, rekomendasi, dan tindak lanjut."
        actionLabel="Tambah Evaluasi"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_evaluasi}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari program kerja, evaluator, atau jenis evaluasi..."
          emptyTitle="Belum ada data Evaluasi Program"
          emptyDescription="Daftar Evaluasi Program masih kosong (0 record)."
          emptyActionLabel="Tambah Evaluasi"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Evaluasi Program' : 'Tambah Evaluasi Program'} maxWidthClass="max-w-3xl" onClose={() => setModalOpen(false)}>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Jenis Evaluasi">
              <Input value={form.jenis_evaluasi || ''} onChange={(e) => setForm({ ...form, jenis_evaluasi: e.target.value })} placeholder="Usulan / Tengah Tahun / Akhir" />
            </Field>
            <Field label="Tanggal Evaluasi">
              <Input type="date" value={form.tanggal_evaluasi || ''} onChange={(e) => setForm({ ...form, tanggal_evaluasi: e.target.value })} />
            </Field>
            <Field label="Evaluator (Personel)">
              <Select
                value={form.id_evaluator || ''}
                onChange={(e) => {
                  const p = personel.find((x) => x.id_personel === e.target.value);
                  setForm({
                    ...form,
                    id_evaluator: e.target.value,
                    evaluator: p ? p.nama_personel : form.evaluator,
                  });
                }}
              >
                <option value="">Pilih atau isi manual...</option>
                {personel.map((p) => (
                  <option key={p.id_personel} value={p.id_personel}>{p.nama_personel}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Nama Evaluator">
              <Input value={form.evaluator || ''} onChange={(e) => setForm({ ...form, evaluator: e.target.value })} />
            </Field>
            <Field label="Skor Keselarasan Strategis">
              <Input type="number" min={0} max={100} value={form.skor_keselarasan_strategis ?? 0} onChange={(e) => setForm({ ...form, skor_keselarasan_strategis: Number(e.target.value) })} />
            </Field>
            <Field label="Status Keselarasan">
              <Select value={form.status_keselarasan || 'Selaras'} onChange={(e) => setForm({ ...form, status_keselarasan: e.target.value as EvaluasiProgram['status_keselarasan'] })}>
                <option value="Selaras">Selaras</option>
                <option value="Cukup Selaras">Cukup Selaras</option>
                <option value="Perlu Penyesuaian">Perlu Penyesuaian</option>
                <option value="Tidak Selaras">Tidak Selaras</option>
              </Select>
            </Field>
          </div>
          <Field label="Temuan"><Textarea rows={2} value={form.temuan || ''} onChange={(e) => setForm({ ...form, temuan: e.target.value })} /></Field>
          <Field label="Rekomendasi"><Textarea rows={2} value={form.rekomendasi || ''} onChange={(e) => setForm({ ...form, rekomendasi: e.target.value })} /></Field>
          <Field label="Tindak Lanjut"><Textarea rows={2} value={form.tindak_lanjut || ''} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status Evaluasi">
              <Select value={form.status_evaluasi || 'Draft'} onChange={(e) => setForm({ ...form, status_evaluasi: e.target.value as EvaluasiProgram['status_evaluasi'] })}>
                <option value="Draft">Draft</option>
                <option value="Selesai">Selesai</option>
                <option value="Ditindaklanjuti">Ditindaklanjuti</option>
              </Select>
            </Field>
            <Field label="Status Tindak Lanjut">
              <Select value={form.status_tindak_lanjut || 'Belum Ditindaklanjuti'} onChange={(e) => setForm({ ...form, status_tindak_lanjut: e.target.value as EvaluasiProgram['status_tindak_lanjut'] })}>
                <option value="Belum Ditindaklanjuti">Belum Ditindaklanjuti</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Selesai">Selesai</option>
              </Select>
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Evaluasi Program"
        message={`Hapus catatan evaluasi untuk "${deleteTarget?.nama_program}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ==========================================
// 2. KEPUTUSAN PROGRAM
// ==========================================
export function KeputusanPage() {
  const [rows, setRows] = useState<KeputusanProgram[]>([]);
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KeputusanProgram | null>(null);
  const [form, setForm] = useState<Partial<KeputusanProgram>>({
    id_program: '',
    tanggal_keputusan: '',
    keputusan: 'Disetujui',
    catatan_keputusan: '',
    diputuskan_oleh: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KeputusanProgram | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpt, prg] = await Promise.all([
        api.get<KeputusanProgram[]>('/api/keputusan'),
        api.get<ProgramKerja[]>('/api/program-kerja'),
      ]);
      setRows(kpt);
      setPrograms(prg);
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
          (r.nama_program || '').toLowerCase().includes(search.toLowerCase()) ||
          r.keputusan.toLowerCase().includes(search.toLowerCase()) ||
          r.diputuskan_oleh.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      id_program: programs[0]?.id_program || '',
      tanggal_keputusan: '',
      keputusan: 'Disetujui',
      catatan_keputusan: '',
      diputuskan_oleh: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: KeputusanProgram) => {
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
        await api.put(`/api/keputusan/${editing.id_keputusan}`, form);
      } else {
        await api.post('/api/keputusan', form);
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
      await api.delete(`/api/keputusan/${deleteTarget.id_keputusan}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<KeputusanProgram>[] = [
    { key: 'id', header: 'ID Keputusan', render: (r) => <span className="font-mono text-xs text-slate-600">{r.id_keputusan}</span> },
    { key: 'program', header: 'Program Kerja', render: (r) => <span className="font-medium text-slate-900">{r.nama_program}</span> },
    { key: 'tanggal', header: 'Tanggal Keputusan', render: (r) => <span className="text-xs tabular-nums">{formatTanggal(r.tanggal_keputusan)}</span> },
    { key: 'keputusan', header: 'Keputusan', render: (r) => <StatusText value={r.keputusan} /> },
    { key: 'oleh', header: 'Diputuskan Oleh', render: (r) => <span className="text-slate-700">{r.diputuskan_oleh || '—'}</span> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Keputusan">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Keputusan">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Keputusan Program"
        description="Pencatatan keputusan pimpinan/komisi terhadap Program Kerja (Disetujui, Direvisi, Digabung, Ditolak, Ditunda)."
        actionLabel="Tambah Keputusan"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_keputusan}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari program kerja, keputusan, atau pemutus..."
          emptyTitle="Belum ada Keputusan Program"
          emptyDescription="Daftar Keputusan Program masih kosong (0 record)."
          emptyActionLabel="Tambah Keputusan"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Keputusan Program' : 'Tambah Keputusan Program'} onClose={() => setModalOpen(false)}>
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
            <Field label="Tanggal Keputusan">
              <Input type="date" value={form.tanggal_keputusan || ''} onChange={(e) => setForm({ ...form, tanggal_keputusan: e.target.value })} />
            </Field>
            <Field label="Keputusan" required>
              <Select value={form.keputusan || 'Disetujui'} onChange={(e) => setForm({ ...form, keputusan: e.target.value as PilihanKeputusan })}>
                {PILIHAN_KEPUTUSAN_LIST.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Diputuskan Oleh">
            <Input value={form.diputuskan_oleh || ''} onChange={(e) => setForm({ ...form, diputuskan_oleh: e.target.value })} placeholder="Nama pimpinan / rapat pimpinan / senat" />
          </Field>
          <Field label="Catatan Keputusan">
            <Textarea rows={3} value={form.catatan_keputusan || ''} onChange={(e) => setForm({ ...form, catatan_keputusan: e.target.value })} />
          </Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Keputusan Program"
        message={`Hapus catatan keputusan untuk "${deleteTarget?.nama_program}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ==========================================
// 3. RISIKO PROGRAM
// ==========================================
export function RisikoPage() {
  const [rows, setRows] = useState<RisikoProgram[]>([]);
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RisikoProgram | null>(null);
  const [form, setForm] = useState<Partial<RisikoProgram>>({
    id_program: '',
    risiko: '',
    penyebab: '',
    dampak: '',
    tingkat_risiko: 'Sedang',
    mitigasi: '',
    id_pic: '',
    status: 'Teridentifikasi',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RisikoProgram | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rsk, prg, prs] = await Promise.all([
        api.get<RisikoProgram[]>('/api/risiko'),
        api.get<ProgramKerja[]>('/api/program-kerja'),
        api.get<Personel[]>('/api/personel'),
      ]);
      setRows(rsk);
      setPrograms(prg);
      setPersonel(prs);
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
          r.risiko.toLowerCase().includes(search.toLowerCase()) ||
          (r.nama_program || '').toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      id_program: programs[0]?.id_program || '',
      risiko: '',
      penyebab: '',
      dampak: '',
      tingkat_risiko: 'Sedang',
      mitigasi: '',
      id_pic: '',
      status: 'Teridentifikasi',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: RisikoProgram) => {
    setEditing(row);
    setForm({ ...row, id_pic: row.id_pic ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/risiko/${editing.id_risiko}`, form);
      } else {
        await api.post('/api/risiko', form);
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
      await api.delete(`/api/risiko/${deleteTarget.id_risiko}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<RisikoProgram>[] = [
    {
      key: 'risiko',
      header: 'Risiko & Program Kerja',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.risiko}</div>
          <div className="text-xs text-slate-500">Program: {r.nama_program}</div>
        </div>
      ),
    },
    { key: 'tingkat', header: 'Tingkat Risiko', render: (r) => <StatusText value={r.tingkat_risiko} /> },
    { key: 'mitigasi', header: 'Mitigasi', render: (r) => <span className="text-xs text-slate-600 line-clamp-2">{r.mitigasi || '—'}</span> },
    { key: 'pic', header: 'PIC', render: (r) => <span className="text-slate-700">{r.nama_pic || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Risiko">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Risiko">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Risiko Program"
        description="Identifikasi risiko, penyebab, dampak, tingkat risiko, dan rencana mitigasi Program Kerja."
        actionLabel="Tambah Risiko"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_risiko}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari uraian risiko atau program kerja..."
          emptyTitle="Belum ada Risiko Program"
          emptyDescription="Daftar Risiko Program masih kosong (0 record)."
          emptyActionLabel="Tambah Risiko"
          onEmptyAction={openCreate}
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Risiko Program' : 'Tambah Risiko Program'} onClose={() => setModalOpen(false)}>
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
          <Field label="Risiko" required>
            <Input required value={form.risiko || ''} onChange={(e) => setForm({ ...form, risiko: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Penyebab"><Textarea rows={2} value={form.penyebab || ''} onChange={(e) => setForm({ ...form, penyebab: e.target.value })} /></Field>
            <Field label="Dampak"><Textarea rows={2} value={form.dampak || ''} onChange={(e) => setForm({ ...form, dampak: e.target.value })} /></Field>
          </div>
          <Field label="Mitigasi"><Textarea rows={2} value={form.mitigasi || ''} onChange={(e) => setForm({ ...form, mitigasi: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tingkat Risiko">
              <Select value={form.tingkat_risiko || 'Sedang'} onChange={(e) => setForm({ ...form, tingkat_risiko: e.target.value as RisikoProgram['tingkat_risiko'] })}>
                <option value="Rendah">Rendah</option>
                <option value="Sedang">Sedang</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Kritis">Kritis</option>
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
            <Field label="Status">
              <Select value={form.status || 'Teridentifikasi'} onChange={(e) => setForm({ ...form, status: e.target.value as RisikoProgram['status'] })}>
                <option value="Teridentifikasi">Teridentifikasi</option>
                <option value="Dimitigasi">Dimitigasi</option>
                <option value="Dipantau">Dipantau</option>
                <option value="Terselesaikan">Terselesaikan</option>
              </Select>
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Risiko Program"
        message={`Hapus catatan risiko "${deleteTarget?.risiko}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
