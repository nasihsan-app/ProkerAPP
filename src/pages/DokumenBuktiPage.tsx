import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
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
  type BuktiCapaian,
  type DokumenProgram,
  JENIS_BUKTI_LIST,
  JENIS_DOKUMEN_LIST,
  type PelaksanaanKegiatan,
  type ProgramKerja,
} from '../types';

export function DokumenBuktiPage() {
  const [tab, setTab] = useState<'dokumen' | 'bukti'>('dokumen');
  const [dokumen, setDokumen] = useState<DokumenProgram[]>([]);
  const [bukti, setBukti] = useState<BuktiCapaian[]>([]);
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [pelaksanaan, setPelaksanaan] = useState<PelaksanaanKegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editDok, setEditDok] = useState<DokumenProgram | null>(null);
  const [editBukti, setEditBukti] = useState<BuktiCapaian | null>(null);
  const [dokForm, setDokForm] = useState<Partial<DokumenProgram>>({
    jenis_dokumen: 'Proposal',
    judul: '',
    nomor_dokumen: '',
    tanggal_dokumen: '',
    tautan: '',
    deskripsi: '',
    id_program: '',
    id_pelaksanaan: '',
    status: 'Draft',
  });
  const [buktiForm, setBuktiForm] = useState<Partial<BuktiCapaian>>({
    jenis_bukti: 'Bukti Pelaksanaan',
    judul: '',
    tanggal_capaian: '',
    tautan: '',
    deskripsi: '',
    id_program: '',
    id_pelaksanaan: '',
    status_verifikasi: 'Menunggu',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'dokumen' | 'bukti'; id: string; title: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dok, bkt, prg, plk] = await Promise.all([
        api.get<DokumenProgram[]>('/api/dokumen'),
        api.get<BuktiCapaian[]>('/api/bukti-capaian'),
        api.get<ProgramKerja[]>('/api/program-kerja'),
        api.get<PelaksanaanKegiatan[]>('/api/pelaksanaan-kegiatan'),
      ]);
      setDokumen(dok);
      setBukti(bkt);
      setPrograms(prg);
      setPelaksanaan(plk);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setError(null);
    if (tab === 'dokumen') {
      setEditDok(null);
      setEditBukti(null);
      setDokForm({
        jenis_dokumen: 'Proposal',
        judul: '',
        nomor_dokumen: '',
        tanggal_dokumen: '',
        tautan: '',
        deskripsi: '',
        id_program: programs[0]?.id_program || '',
        id_pelaksanaan: '',
        status: 'Draft',
      });
    } else {
      setEditDok(null);
      setEditBukti(null);
      setBuktiForm({
        jenis_bukti: 'Bukti Pelaksanaan',
        judul: '',
        tanggal_capaian: '',
        tautan: '',
        deskripsi: '',
        id_program: programs[0]?.id_program || '',
        id_pelaksanaan: '',
        status_verifikasi: 'Menunggu',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (tab === 'dokumen') {
        if (editDok) {
          await api.put(`/api/dokumen/${editDok.id_dokumen}`, dokForm);
        } else {
          await api.post('/api/dokumen', dokForm);
        }
      } else {
        if (editBukti) {
          await api.put(`/api/bukti-capaian/${editBukti.id_bukti}`, buktiForm);
        } else {
          await api.post('/api/bukti-capaian', buktiForm);
        }
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
      if (deleteTarget.type === 'dokumen') {
        await api.delete(`/api/dokumen/${deleteTarget.id}`);
      } else {
        await api.delete(`/api/bukti-capaian/${deleteTarget.id}`);
      }
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const filteredDok = useMemo(
    () =>
      dokumen.filter(
        (d) =>
          !search ||
          d.judul.toLowerCase().includes(search.toLowerCase()) ||
          d.jenis_dokumen.toLowerCase().includes(search.toLowerCase()) ||
          (d.nama_program || '').toLowerCase().includes(search.toLowerCase())
      ),
    [dokumen, search]
  );

  const filteredBukti = useMemo(
    () =>
      bukti.filter(
        (b) =>
          !search ||
          b.judul.toLowerCase().includes(search.toLowerCase()) ||
          b.jenis_bukti.toLowerCase().includes(search.toLowerCase()) ||
          (b.nama_program || '').toLowerCase().includes(search.toLowerCase())
      ),
    [bukti, search]
  );

  const dokCols: ColumnDef<DokumenProgram>[] = [
    { key: 'jenis', header: 'Jenis Dokumen', render: (r) => <span className="font-medium text-slate-800">{r.jenis_dokumen}</span> },
    {
      key: 'judul',
      header: 'Judul & Nomor',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.judul}</div>
          <div className="text-xs text-slate-500">{r.nomor_dokumen || 'Tanpa nomor'} · {formatTanggal(r.tanggal_dokumen)}</div>
        </div>
      ),
    },
    {
      key: 'terkait',
      header: 'Terkait',
      render: (r) => (
        <div className="text-xs text-slate-600">
          {r.nama_program && <div>Program: {r.nama_program}</div>}
          {r.nama_pelaksanaan && <div>Pelaksanaan: {r.nama_pelaksanaan}</div>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusText value={r.status} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          {r.tautan && (
            <a href={r.tautan} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Buka Tautan">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setEditDok(r);
              setDokForm({ ...r, id_program: r.id_program ?? '', id_pelaksanaan: r.id_pelaksanaan ?? '' });
              setModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Edit Dokumen"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget({ type: 'dokumen', id: r.id_dokumen, title: r.judul })}
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50"
            title="Hapus Dokumen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const buktiCols: ColumnDef<BuktiCapaian>[] = [
    { key: 'jenis', header: 'Jenis Bukti', render: (r) => <span className="font-medium text-slate-800">{r.jenis_bukti}</span> },
    {
      key: 'judul',
      header: 'Judul Bukti/Capaian',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.judul}</div>
          <div className="text-xs text-slate-500">{formatTanggal(r.tanggal_capaian)}</div>
        </div>
      ),
    },
    {
      key: 'terkait',
      header: 'Terkait',
      render: (r) => (
        <div className="text-xs text-slate-600">
          {r.nama_program && <div>Program: {r.nama_program}</div>}
          {r.nama_pelaksanaan && <div>Pelaksanaan: {r.nama_pelaksanaan}</div>}
        </div>
      ),
    },
    { key: 'status', header: 'Verifikasi', render: (r) => <StatusText value={r.status_verifikasi} /> },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          {r.tautan && (
            <a href={r.tautan} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Buka Tautan">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setEditBukti(r);
              setBuktiForm({ ...r, id_program: r.id_program ?? '', id_pelaksanaan: r.id_pelaksanaan ?? '' });
              setModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Edit Bukti/Capaian"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget({ type: 'bukti', id: r.id_bukti, title: r.judul })}
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50"
            title="Hapus Bukti/Capaian"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dokumen dan Bukti/Capaian"
        description="Pengelolaan dokumen administratif (Proposal, TOR/KAK, RAB, SK, MoU/MoA/IA) serta Bukti/Capaian Program Kerja dan Pelaksanaan Kegiatan."
        actionLabel={tab === 'dokumen' ? 'Tambah Dokumen' : 'Tambah Bukti/Capaian'}
        onAction={openCreate}
      />

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
        <button
          type="button"
          onClick={() => setTab('dokumen')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === 'dokumen' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Dokumen ({dokumen.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('bukti')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === 'bukti' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bukti/Capaian ({bukti.length})
        </button>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : tab === 'dokumen' ? (
        <DataTable
          rows={filteredDok}
          columns={dokCols}
          rowKey={(r) => r.id_dokumen}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari judul, jenis dokumen, atau program kerja..."
          emptyTitle="Belum ada Dokumen"
          emptyDescription="Daftar Dokumen masih kosong (0 record). Setiap dokumen harus dikaitkan dengan Program Kerja atau Pelaksanaan Kegiatan."
          emptyActionLabel="Tambah Dokumen"
          onEmptyAction={openCreate}
        />
      ) : (
        <DataTable
          rows={filteredBukti}
          columns={buktiCols}
          rowKey={(r) => r.id_bukti}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari judul, jenis bukti, atau program kerja..."
          emptyTitle="Belum ada Bukti/Capaian"
          emptyDescription="Daftar Bukti/Capaian masih kosong (0 record). Setiap bukti harus dikaitkan dengan Program Kerja atau Pelaksanaan Kegiatan."
          emptyActionLabel="Tambah Bukti/Capaian"
          onEmptyAction={openCreate}
        />
      )}

      <Modal
        open={modalOpen}
        title={
          tab === 'dokumen'
            ? editDok
              ? 'Edit Dokumen'
              : 'Tambah Dokumen'
            : editBukti
              ? 'Edit Bukti/Capaian'
              : 'Tambah Bukti/Capaian'
        }
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}
          {tab === 'dokumen' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Jenis Dokumen" required>
                  <Select value={dokForm.jenis_dokumen || 'Proposal'} onChange={(e) => setDokForm({ ...dokForm, jenis_dokumen: e.target.value })}>
                    {JENIS_DOKUMEN_LIST.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={dokForm.status || 'Draft'} onChange={(e) => setDokForm({ ...dokForm, status: e.target.value as DokumenProgram['status'] })}>
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                    <option value="Disahkan">Disahkan</option>
                  </Select>
                </Field>
              </div>
              <Field label="Judul Dokumen" required>
                <Input required value={dokForm.judul || ''} onChange={(e) => setDokForm({ ...dokForm, judul: e.target.value })} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nomor Dokumen"><Input value={dokForm.nomor_dokumen || ''} onChange={(e) => setDokForm({ ...dokForm, nomor_dokumen: e.target.value })} /></Field>
                <Field label="Tanggal Dokumen"><Input type="date" value={dokForm.tanggal_dokumen || ''} onChange={(e) => setDokForm({ ...dokForm, tanggal_dokumen: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Kaitkan ke Program Kerja">
                  <Select value={dokForm.id_program || ''} onChange={(e) => setDokForm({ ...dokForm, id_program: e.target.value })}>
                    <option value="">Tidak dipilih</option>
                    {programs.map((p) => (
                      <option key={p.id_program} value={p.id_program}>{p.nama_program}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kaitkan ke Pelaksanaan Kegiatan">
                  <Select value={dokForm.id_pelaksanaan || ''} onChange={(e) => setDokForm({ ...dokForm, id_pelaksanaan: e.target.value })}>
                    <option value="">Tidak dipilih</option>
                    {pelaksanaan.map((pk) => (
                      <option key={pk.id_pelaksanaan} value={pk.id_pelaksanaan}>{pk.nama_pelaksanaan}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Tautan / Path Berkas"><Input value={dokForm.tautan || ''} onChange={(e) => setDokForm({ ...dokForm, tautan: e.target.value })} placeholder="https://..." /></Field>
              <Field label="Deskripsi"><Textarea rows={2} value={dokForm.deskripsi || ''} onChange={(e) => setDokForm({ ...dokForm, deskripsi: e.target.value })} /></Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Jenis Bukti/Capaian" required>
                  <Select value={buktiForm.jenis_bukti || 'Bukti Pelaksanaan'} onChange={(e) => setBuktiForm({ ...buktiForm, jenis_bukti: e.target.value })}>
                    {JENIS_BUKTI_LIST.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status Verifikasi">
                  <Select value={buktiForm.status_verifikasi || 'Menunggu'} onChange={(e) => setBuktiForm({ ...buktiForm, status_verifikasi: e.target.value as BuktiCapaian['status_verifikasi'] })}>
                    <option value="Menunggu">Menunggu</option>
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                  </Select>
                </Field>
              </div>
              <Field label="Judul Bukti/Capaian" required>
                <Input required value={buktiForm.judul || ''} onChange={(e) => setBuktiForm({ ...buktiForm, judul: e.target.value })} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tanggal Capaian"><Input type="date" value={buktiForm.tanggal_capaian || ''} onChange={(e) => setBuktiForm({ ...buktiForm, tanggal_capaian: e.target.value })} /></Field>
                <Field label="Tautan / Path Bukti"><Input value={buktiForm.tautan || ''} onChange={(e) => setBuktiForm({ ...buktiForm, tautan: e.target.value })} placeholder="https://..." /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Kaitkan ke Program Kerja">
                  <Select value={buktiForm.id_program || ''} onChange={(e) => setBuktiForm({ ...buktiForm, id_program: e.target.value })}>
                    <option value="">Tidak dipilih</option>
                    {programs.map((p) => (
                      <option key={p.id_program} value={p.id_program}>{p.nama_program}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kaitkan ke Pelaksanaan Kegiatan">
                  <Select value={buktiForm.id_pelaksanaan || ''} onChange={(e) => setBuktiForm({ ...buktiForm, id_pelaksanaan: e.target.value })}>
                    <option value="">Tidak dipilih</option>
                    {pelaksanaan.map((pk) => (
                      <option key={pk.id_pelaksanaan} value={pk.id_pelaksanaan}>{pk.nama_pelaksanaan}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Deskripsi"><Textarea rows={2} value={buktiForm.deskripsi || ''} onChange={(e) => setBuktiForm({ ...buktiForm, deskripsi: e.target.value })} /></Field>
            </>
          )}
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title={deleteTarget?.type === 'dokumen' ? 'Hapus Dokumen' : 'Hapus Bukti/Capaian'}
        message={`Hapus "${deleteTarget?.title}"?`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
