import { Eye, Pencil, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { Field, FormActions, Input, Select, Textarea } from '../components/ui/FormFields';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatAngka, formatPersen, formatRupiah, formatTanggal } from '../lib/format';
import {
  type Aktivitas,
  type BuktiCapaian,
  type DokumenProgram,
  type EvaluasiProgram,
  type IKU,
  type KeputusanProgram,
  type Mitra,
  type Organisasi,
  type Personel,
  type ProgramKerja,
  type RealisasiAnggaran,
  type Renstra,
  type RisikoProgram,
  type SDG,
  STATUS_PROGRAM_LIST,
  type SasaranStrategis,
  type StatusProgram,
} from '../types';

interface ProgramDetailPayload {
  program: ProgramKerja;
  aktivitas: Aktivitas[];
  evaluasi: EvaluasiProgram[];
  keputusan: KeputusanProgram[];
  dokumen: DokumenProgram[];
  bukti: BuktiCapaian[];
  risiko: RisikoProgram[];
  realisasi_anggaran_list: RealisasiAnggaran[];
}

const emptyForm = (): Partial<ProgramKerja> => ({
  kode_program: '',
  nama_program: '',
  deskripsi: '',
  komisi: '',
  id_renstra: '',
  id_sasaran: '',
  tujuan_program: '',
  id_organisasi_pemilik: '',
  id_organisasi_pelaksana: '',
  id_pic: '',
  pic_teks: '',
  prioritas: 'Sedang',
  kode_prioritas: '',
  tahun_target: new Date().getFullYear(),
  tanggal_mulai: '',
  tanggal_selesai: '',
  jangka_waktu: '',
  cakupan: '',
  indikator: '',
  baseline: '',
  target: '',
  realisasi_target: '',
  satuan: '',
  luaran: '',
  hasil_dampak: '',
  sumber_dana: '',
  anggaran: 0,
  status_program: 'Draft',
  iku_teks: '',
  skor_keselarasan_strategis: null,
  status_keselarasan: '',
  catatan: '',
  iku_ids: [],
  sdg_ids: [],
  mitra_ids: [],
  organisasi_pendukung_ids: [],
});

export function ProgramKerjaPage() {
  const [rows, setRows] = useState<ProgramKerja[]>([]);
  const [renstra, setRenstra] = useState<Renstra[]>([]);
  const [sasaran, setSasaran] = useState<SasaranStrategis[]>([]);
  const [organisasi, setOrganisasi] = useState<Organisasi[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [ikuList, setIkuList] = useState<IKU[]>([]);
  const [sdgList, setSdgList] = useState<SDG[]>([]);
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPrioritas, setFilterPrioritas] = useState('');
  const [filterKomisi, setFilterKomisi] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramKerja | null>(null);
  const [form, setForm] = useState<Partial<ProgramKerja>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgramKerja | null>(null);
  const [detailData, setDetailData] = useState<ProgramDetailPayload | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prg, rns, sas, org, prs, iku, sdg, mtr] = await Promise.all([
        api.get<ProgramKerja[]>('/api/program-kerja'),
        api.get<Renstra[]>('/api/renstra'),
        api.get<SasaranStrategis[]>('/api/sasaran-strategis'),
        api.get<Organisasi[]>('/api/organisasi'),
        api.get<Personel[]>('/api/personel'),
        api.get<IKU[]>('/api/iku'),
        api.get<SDG[]>('/api/sdgs'),
        api.get<Mitra[]>('/api/mitra'),
      ]);
      setRows(prg);
      setRenstra(rns);
      setSasaran(sas);
      setOrganisasi(org);
      setPersonel(prs);
      setIkuList(iku);
      setSdgList(sdg);
      setMitraList(mtr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const komisiOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.komisi).filter(Boolean))),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        r.nama_program.toLowerCase().includes(q) ||
        r.kode_program.toLowerCase().includes(q) ||
        r.id_program.toLowerCase().includes(q) ||
        (r.komisi || '').toLowerCase().includes(q) ||
        (r.pic_teks || '').toLowerCase().includes(q) ||
        (r.iku_teks || '').toLowerCase().includes(q) ||
        (r.nama_organisasi_pemilik || '').toLowerCase().includes(q);
      const matchStatus = !filterStatus || r.status_program === filterStatus;
      const matchPrioritas = !filterPrioritas || r.prioritas === filterPrioritas;
      const matchKomisi = !filterKomisi || r.komisi === filterKomisi;
      return matchSearch && matchStatus && matchPrioritas && matchKomisi;
    });
  }, [rows, search, filterStatus, filterPrioritas, filterKomisi]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ProgramKerja) => {
    setEditing(row);
    setForm({
      ...row,
      id_renstra: row.id_renstra ?? '',
      id_sasaran: row.id_sasaran ?? '',
      id_organisasi_pemilik: row.id_organisasi_pemilik ?? '',
      id_organisasi_pelaksana: row.id_organisasi_pelaksana ?? '',
      id_pic: row.id_pic ?? '',
      iku_ids: row.iku_ids ?? [],
      sdg_ids: row.sdg_ids ?? [],
      mitra_ids: row.mitra_ids ?? [],
      organisasi_pendukung_ids: row.organisasi_pendukung_ids ?? [],
    });
    setError(null);
    setModalOpen(true);
  };

  const openDetail = async (row: ProgramKerja) => {
    const payload = await api.get<ProgramDetailPayload>(`/api/program-kerja/${row.id_program}`);
    setDetailData(payload);
  };

  const toggleMulti = (
    key: 'iku_ids' | 'sdg_ids' | 'mitra_ids' | 'organisasi_pendukung_ids',
    id: string
  ) => {
    const current = (form[key] || []) as string[];
    const exists = current.includes(id);
    setForm({
      ...form,
      [key]: exists ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/api/program-kerja/${editing.id_program}`, form);
      } else {
        await api.post('/api/program-kerja', form);
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
      await api.delete(`/api/program-kerja/${deleteTarget.id_program}`);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const filteredSasaran = useMemo(() => {
    if (!form.id_renstra) return sasaran;
    return sasaran.filter((s) => s.id_renstra === form.id_renstra);
  }, [sasaran, form.id_renstra]);

  const columns: ColumnDef<ProgramKerja>[] = [
    {
      key: 'kode',
      header: 'Kode / ID',
      render: (r) => (
        <div className="font-mono text-xs whitespace-nowrap">
          <div className="font-medium text-slate-900">{r.kode_program || r.id_program}</div>
          {r.kode_program && <div className="text-[11px] text-slate-400">{r.id_program}</div>}
        </div>
      ),
    },
    {
      key: 'nama',
      header: 'Program Kerja',
      render: (r) => (
        <div className="max-w-md">
          <div className="font-medium text-slate-900">{r.nama_program}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {r.komisi || r.nama_organisasi_pemilik || 'Organisasi belum dipilih'}
            {r.tahun_target ? ` · Tahun ${r.tahun_target}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'sasaran',
      header: 'Sasaran & Keselarasan',
      render: (r) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-slate-700">{r.id_sasaran || '—'}</div>
          {r.status_keselarasan ? (
            <div className="flex items-center gap-1.5">
              <StatusText value={r.status_keselarasan} />
              {r.skor_keselarasan_strategis !== null && r.skor_keselarasan_strategis !== undefined && (
                <span className="font-mono text-[11px] text-slate-500">({r.skor_keselarasan_strategis})</span>
              )}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Penanggung Jawab',
      render: (r) => (
        <span className="text-xs text-slate-700 max-w-xs line-clamp-2">
          {r.nama_pic || r.pic_teks || '—'}
        </span>
      ),
    },
    {
      key: 'prioritas',
      header: 'Prioritas',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusText value={r.prioritas} />
          {r.kode_prioritas && <span className="font-mono text-[11px] text-slate-500">({r.kode_prioritas})</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusText value={r.status_program} />,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => openDetail(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Detail Program Kerja">
            <Eye className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100" title="Edit Program Kerja">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50" title="Hapus Program Kerja">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Daftar Program Kerja"
        description="Intervensi strategis fakultas, jurusan, program studi, dan unit pendukung FMIPA UNM."
        actionLabel="Tambah Program Kerja"
        onAction={openCreate}
      />

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id_program}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari kode, nama program, atau organisasi..."
          filters={
            <>
              <Select value={filterKomisi} onChange={(e) => setFilterKomisi(e.target.value)} className="!w-auto min-w-[180px] max-w-[260px]">
                <option value="">Semua Komisi</option>
                {komisiOptions.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="!w-auto min-w-[150px]">
                <option value="">Semua Status</option>
                {STATUS_PROGRAM_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select value={filterPrioritas} onChange={(e) => setFilterPrioritas(e.target.value)} className="!w-auto min-w-[140px]">
                <option value="">Semua Prioritas</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rendah">Rendah</option>
              </Select>
            </>
          }
          emptyTitle="Belum ada Program Kerja"
          emptyDescription="Daftar Program Kerja masih kosong (0 record). Klik tombol di bawah untuk menambahkan Program Kerja baru."
          emptyActionLabel="Tambah Program Kerja"
          onEmptyAction={openCreate}
          onRowClick={(r) => openDetail(r)}
        />
      )}

      {/* Modal Tambah / Edit Program Kerja */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Program Kerja' : 'Tambah Program Kerja'}
        subtitle={editing ? `ID Program: ${editing.id_program}` : undefined}
        maxWidthClass="max-w-4xl"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md">{error}</div>}

          {/* Identitas */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Identitas Program Kerja</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Kode Program">
                <Input value={form.kode_program || ''} onChange={(e) => setForm({ ...form, kode_program: e.target.value })} placeholder="Mis. PK-2026-01" />
              </Field>
              <Field label="Komisi">
                <Input value={form.komisi || ''} onChange={(e) => setForm({ ...form, komisi: e.target.value })} placeholder="Mis. Akademik / Riset / Kemahasiswaan" />
              </Field>
              <Field label="Status Program">
                <Select value={form.status_program || 'Draft'} onChange={(e) => setForm({ ...form, status_program: e.target.value as StatusProgram })}>
                  {STATUS_PROGRAM_LIST.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Nama Program" required>
              <Input required value={form.nama_program || ''} onChange={(e) => setForm({ ...form, nama_program: e.target.value })} />
            </Field>
            <Field label="Deskripsi">
              <Textarea rows={2} value={form.deskripsi || ''} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </Field>
          </section>

          {/* Strategis */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Penyelarasan Strategis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Renstra">
                <Select value={form.id_renstra || ''} onChange={(e) => setForm({ ...form, id_renstra: e.target.value, id_sasaran: '' })}>
                  <option value="">Pilih Renstra...</option>
                  {renstra.map((r) => (
                    <option key={r.id_renstra} value={r.id_renstra}>{r.id_renstra} — {r.nama_renstra}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sasaran Strategis">
                <Select value={form.id_sasaran || ''} onChange={(e) => {
                  const selectedSasaranId = e.target.value;
                  const matched = sasaran.find((s) => s.id_sasaran === selectedSasaranId);
                  setForm({
                    ...form,
                    id_sasaran: selectedSasaranId,
                    id_renstra: matched ? matched.id_renstra : form.id_renstra,
                  });
                }}>
                  <option value="">Pilih Sasaran Strategis...</option>
                  {filteredSasaran.map((s) => (
                    <option key={s.id_sasaran} value={s.id_sasaran}>
                      {s.id_sasaran}{s.nomor ? ` (${s.nomor})` : ''} — {s.nama_sasaran}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tujuan Program">
              <Textarea rows={2} value={form.tujuan_program || ''} onChange={(e) => setForm({ ...form, tujuan_program: e.target.value })} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Skor Keselarasan Strategis">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.skor_keselarasan_strategis ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      skor_keselarasan_strategis: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Status Keselarasan">
                <Input
                  value={form.status_keselarasan || ''}
                  onChange={(e) => setForm({ ...form, status_keselarasan: e.target.value })}
                  placeholder="Mis. Sangat selaras / Selaras / Cukup selaras"
                />
              </Field>
            </div>
            <Field label="Referensi IKU (Teks)">
              <Input
                value={form.iku_teks || ''}
                onChange={(e) => setForm({ ...form, iku_teks: e.target.value })}
                placeholder="Mis. IKU 1, 2"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="IKU Terkait (dapat memilih lebih dari satu)">
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2.5 space-y-1.5 bg-slate-50/50">
                  {ikuList.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada data master IKU.</p>
                  ) : (
                    ikuList.map((i) => (
                      <label key={i.id_iku} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.iku_ids || []).includes(i.id_iku)}
                          onChange={() => toggleMulti('iku_ids', i.id_iku)}
                          className="mt-0.5 rounded border-slate-300"
                        />
                        <span><strong className="font-mono">{i.kode_iku}</strong> — {i.nama_iku}</span>
                      </label>
                    ))
                  )}
                </div>
              </Field>

              <Field label="Kontribusi SDGs (1–17)">
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2.5 space-y-1.5 bg-slate-50/50">
                  {sdgList.map((s) => (
                    <label key={s.id_sdg} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form.sdg_ids || []).includes(s.id_sdg)}
                        onChange={() => toggleMulti('sdg_ids', s.id_sdg)}
                        className="mt-0.5 rounded border-slate-300"
                      />
                      <span><strong className="font-mono">SDG {s.nomor_sdg}</strong> — {s.nama_sdg}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* Organisasi & Mitra */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Organisasi, Penanggung Jawab, dan Mitra</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Organisasi Pemilik">
                <Select value={form.id_organisasi_pemilik || ''} onChange={(e) => setForm({ ...form, id_organisasi_pemilik: e.target.value })}>
                  <option value="">Pilih Organisasi Pemilik...</option>
                  {organisasi.map((o) => (
                    <option key={o.id_organisasi} value={o.id_organisasi}>{o.nama_organisasi}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Organisasi Pelaksana">
                <Select value={form.id_organisasi_pelaksana || ''} onChange={(e) => setForm({ ...form, id_organisasi_pelaksana: e.target.value })}>
                  <option value="">Pilih Organisasi Pelaksana...</option>
                  {organisasi.map((o) => (
                    <option key={o.id_organisasi} value={o.id_organisasi}>{o.nama_organisasi}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Penanggung Jawab (PIC Master)">
                <Select value={form.id_pic || ''} onChange={(e) => setForm({ ...form, id_pic: e.target.value })}>
                  <option value="">Pilih Personel...</option>
                  {personel.map((p) => (
                    <option key={p.id_personel} value={p.id_personel}>{p.nama_personel}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Penanggung Jawab / Jabatan (Teks)">
                <Input value={form.pic_teks || ''} onChange={(e) => setForm({ ...form, pic_teks: e.target.value })} placeholder="Daftar pejabat atau PIC" />
              </Field>
              <Field label="Cakupan (Scope)">
                <Input value={form.cakupan || ''} onChange={(e) => setForm({ ...form, cakupan: e.target.value })} placeholder="Mis. Faculty-wide" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Organisasi Pendukung">
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2.5 space-y-1.5 bg-slate-50/50">
                  {organisasi.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada data master Organisasi.</p>
                  ) : (
                    organisasi.map((o) => (
                      <label key={o.id_organisasi} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.organisasi_pendukung_ids || []).includes(o.id_organisasi)}
                          onChange={() => toggleMulti('organisasi_pendukung_ids', o.id_organisasi)}
                          className="mt-0.5 rounded border-slate-300"
                        />
                        <span>{o.nama_organisasi}</span>
                      </label>
                    ))
                  )}
                </div>
              </Field>
              <Field label="Mitra Terlibat">
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2.5 space-y-1.5 bg-slate-50/50">
                  {mitraList.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada data master Mitra.</p>
                  ) : (
                    mitraList.map((m) => (
                      <label key={m.id_mitra} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.mitra_ids || []).includes(m.id_mitra)}
                          onChange={() => toggleMulti('mitra_ids', m.id_mitra)}
                          className="mt-0.5 rounded border-slate-300"
                        />
                        <span>{m.nama_mitra} ({m.jenis_mitra})</span>
                      </label>
                    ))
                  )}
                </div>
              </Field>
            </div>
          </section>

          {/* Prioritas & Waktu */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Prioritas & Jadwal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Prioritas">
                <Select value={form.prioritas || 'Sedang'} onChange={(e) => setForm({ ...form, prioritas: e.target.value as ProgramKerja['prioritas'] })}>
                  <option value="Tinggi">Tinggi</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Rendah">Rendah</option>
                </Select>
              </Field>
              <Field label="Tahun Target">
                <Input type="number" value={form.tahun_target ?? ''} onChange={(e) => setForm({ ...form, tahun_target: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Tanggal Mulai">
                <Input type="date" value={form.tanggal_mulai || ''} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} />
              </Field>
              <Field label="Tanggal Selesai">
                <Input type="date" value={form.tanggal_selesai || ''} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} />
              </Field>
            </div>
            <Field label="Jangka Waktu Pelaksanaan (Timeframe)">
              <Input value={form.jangka_waktu || ''} onChange={(e) => setForm({ ...form, jangka_waktu: e.target.value })} placeholder="Mis. Mulai Semester Genap 2027" />
            </Field>
          </section>

          {/* Kinerja & Keuangan */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">Kinerja & Anggaran</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Indikator">
                <Input value={form.indikator || ''} onChange={(e) => setForm({ ...form, indikator: e.target.value })} />
              </Field>
              <Field label="Satuan">
                <Input value={form.satuan || ''} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Baseline"><Input value={form.baseline || ''} onChange={(e) => setForm({ ...form, baseline: e.target.value })} /></Field>
              <Field label="Target"><Input value={form.target || ''} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
              <Field label="Realisasi Target"><Input value={form.realisasi_target || ''} onChange={(e) => setForm({ ...form, realisasi_target: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Luaran"><Textarea rows={2} value={form.luaran || ''} onChange={(e) => setForm({ ...form, luaran: e.target.value })} /></Field>
              <Field label="Hasil/Dampak"><Textarea rows={2} value={form.hasil_dampak || ''} onChange={(e) => setForm({ ...form, hasil_dampak: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sumber Dana"><Input value={form.sumber_dana || ''} onChange={(e) => setForm({ ...form, sumber_dana: e.target.value })} placeholder="Mis. PNBP / BOPTN / Hibah" /></Field>
              <Field label="Anggaran (Rp)">
                <Input type="number" min={0} value={form.anggaran ?? 0} onChange={(e) => setForm({ ...form, anggaran: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Catatan">
              <Textarea rows={2} value={form.catatan || ''} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
            </Field>
          </section>

          <FormActions onCancel={() => setModalOpen(false)} saving={saving} />
        </form>
      </Modal>

      {/* Modal Detail Program Kerja */}
      <Modal
        open={!!detailData}
        title="Detail Program Kerja"
        subtitle={detailData ? `${detailData.program.kode_program || detailData.program.id_program} · ${detailData.program.nama_program}` : undefined}
        maxWidthClass="max-w-4xl"
        onClose={() => setDetailData(null)}
      >
        {detailData && (
          <div className="space-y-6 text-sm">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                ['ID Program', detailData.program.id_program],
                ['Kode Program', detailData.program.kode_program || '—'],
                ['Status Program', detailData.program.status_program],
                ['Renstra', detailData.program.id_renstra ? `${detailData.program.id_renstra} — ${detailData.program.nama_renstra || ''}` : '—'],
                ['Sasaran Strategis', detailData.program.id_sasaran ? `${detailData.program.id_sasaran} — ${detailData.program.nama_sasaran || ''}` : '—'],
                ['Komisi', detailData.program.komisi || '—'],
                ['Organisasi Pemilik', detailData.program.nama_organisasi_pemilik || '—'],
                ['Cakupan (Scope)', detailData.program.cakupan || '—'],
                ['Penanggung Jawab', detailData.program.nama_pic || detailData.program.pic_teks || '—'],
                ['Prioritas', detailData.program.kode_prioritas ? `${detailData.program.prioritas} (${detailData.program.kode_prioritas})` : detailData.program.prioritas],
                ['Tahun Target', detailData.program.tahun_target ? String(detailData.program.tahun_target) : '—'],
                ['Jangka Waktu', detailData.program.jangka_waktu || `${formatTanggal(detailData.program.tanggal_mulai)} – ${formatTanggal(detailData.program.tanggal_selesai)}`],
                ['Keselarasan Strategis', detailData.program.status_keselarasan ? `${detailData.program.status_keselarasan} (Skor: ${detailData.program.skor_keselarasan_strategis ?? '—'})` : '—'],
                ['Referensi IKU', detailData.program.iku_teks || '—'],
                ['Indikator & Target 2027', detailData.program.indikator || '—'],
                ['Baseline / Target', `${detailData.program.baseline || '—'} / ${detailData.program.target || '—'} ${detailData.program.satuan || ''}`],
                ['Realisasi Target', detailData.program.realisasi_target || '—'],
                ['Sumber Dana', detailData.program.sumber_dana || '—'],
                ['Anggaran', formatRupiah(detailData.program.anggaran)],
                ['Realisasi Anggaran', formatRupiah(detailData.program.realisasi_anggaran || 0)],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-slate-100 pb-2">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>

            {(detailData.program.tujuan_program || detailData.program.deskripsi) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-md p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Tujuan Program</div>
                  <p className="text-xs text-slate-700 leading-relaxed">{detailData.program.tujuan_program || '—'}</p>
                </div>
                <div className="border border-slate-200 rounded-md p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Aktivitas Utama / Deskripsi</div>
                  <p className="text-xs text-slate-700 leading-relaxed">{detailData.program.deskripsi || '—'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-md p-3">
                <div className="text-xs font-semibold text-slate-700 mb-1.5">IKU Terkait</div>
                {detailData.program.iku_list && detailData.program.iku_list.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-600">
                    {detailData.program.iku_list.map((i) => (
                      <li key={i.id_iku}><span className="font-mono font-medium">{i.kode_iku}</span> · {i.nama_iku}</li>
                    ))}
                  </ul>
                ) : detailData.program.iku_teks ? (
                  <p className="text-xs font-mono text-slate-700">{detailData.program.iku_teks}</p>
                ) : (
                  <p className="text-xs text-slate-400">Tidak ada IKU terkait.</p>
                )}
              </div>
              <div className="border border-slate-200 rounded-md p-3">
                <div className="text-xs font-semibold text-slate-700 mb-1.5">SDGs Terkait</div>
                {detailData.program.sdg_list && detailData.program.sdg_list.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-600">
                    {detailData.program.sdg_list.map((s) => (
                      <li key={s.id_sdg}><span className="font-mono font-medium">SDG {s.nomor_sdg}</span> · {s.nama_sdg}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">Tidak ada SDGs terkait.</p>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-md p-4">
              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                Aktivitas ({formatAngka(detailData.aktivitas.length)})
              </h4>
              {detailData.aktivitas.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada aktivitas pada program ini.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {detailData.aktivitas.map((a) => {
                    const capaian = a.target_frekuensi > 0 ? ((a.realisasi_pelaksanaan || 0) / a.target_frekuensi) * 100 : 0;
                    return (
                      <div key={a.id_aktivitas} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-medium text-slate-900">{a.nama_aktivitas}</div>
                          <div className="text-slate-500">{a.pola_aktivitas} · Target {a.target_frekuensi} · Realisasi {a.realisasi_pelaksanaan || 0}</div>
                        </div>
                        <span className="font-mono font-medium text-slate-900">{formatPersen(capaian)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="border border-slate-200 rounded-md p-3">
                <div className="font-semibold text-slate-900 mb-1">Evaluasi ({detailData.evaluasi.length})</div>
                {detailData.evaluasi.length === 0 ? (
                  <p className="text-slate-400">Belum ada evaluasi.</p>
                ) : (
                  detailData.evaluasi.map((ev) => (
                    <div key={ev.id_evaluasi} className="py-1 border-b border-slate-100 last:border-0">
                      <div className="font-medium">{ev.status_keselarasan} (Skor: {ev.skor_keselarasan_strategis})</div>
                      <div className="text-slate-500">{ev.rekomendasi || '—'}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="border border-slate-200 rounded-md p-3">
                <div className="font-semibold text-slate-900 mb-1">Keputusan ({detailData.keputusan.length})</div>
                {detailData.keputusan.length === 0 ? (
                  <p className="text-slate-400">Belum ada keputusan.</p>
                ) : (
                  detailData.keputusan.map((kp) => (
                    <div key={kp.id_keputusan} className="py-1 border-b border-slate-100 last:border-0">
                      <div className="font-medium">{kp.keputusan}</div>
                      <div className="text-slate-500">{formatTanggal(kp.tanggal_keputusan)} · {kp.diputuskan_oleh || '—'}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="border border-slate-200 rounded-md p-3">
                <div className="font-semibold text-slate-900 mb-1">Risiko ({detailData.risiko.length}) & Dokumen/Bukti ({detailData.dokumen.length + detailData.bukti.length})</div>
                <p className="text-slate-500 mt-1">
                  Dokumen: {detailData.dokumen.length} · Bukti/Capaian: {detailData.bukti.length} · Risiko: {detailData.risiko.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Program Kerja"
        message={`Hapus Program Kerja "${deleteTarget?.nama_program}"? Seluruh Aktivitas, Pelaksanaan Kegiatan, Evaluasi, Keputusan, Dokumen, Bukti, dan Risiko terkait akan ikut terhapus.`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
