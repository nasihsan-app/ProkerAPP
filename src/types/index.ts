export type JenisOrganisasi =
  | 'Universitas'
  | 'Fakultas'
  | 'Jurusan'
  | 'Program Studi'
  | 'Unit Pendukung'
  | 'Laboratorium'
  | 'Pusat Penelitian'
  | 'Unit Penjaminan Mutu'
  | 'Unit Lainnya';

export const JENIS_ORGANISASI_LIST: JenisOrganisasi[] = [
  'Universitas',
  'Fakultas',
  'Jurusan',
  'Program Studi',
  'Unit Pendukung',
  'Laboratorium',
  'Pusat Penelitian',
  'Unit Penjaminan Mutu',
  'Unit Lainnya',
];

export type PolaAktivitas =
  | 'Sekali'
  | 'Berulang'
  | 'Berkala'
  | 'Berkelanjutan'
  | 'Berbasis Milestone';

export const POLA_AKTIVITAS_LIST: PolaAktivitas[] = [
  'Sekali',
  'Berulang',
  'Berkala',
  'Berkelanjutan',
  'Berbasis Milestone',
];

export type StatusProgram =
  | 'Draft'
  | 'Diajukan'
  | 'Disetujui'
  | 'Berjalan'
  | 'Sesuai Target'
  | 'Berisiko'
  | 'Terlambat'
  | 'Selesai'
  | 'Dibatalkan';

export const STATUS_PROGRAM_LIST: StatusProgram[] = [
  'Draft',
  'Diajukan',
  'Disetujui',
  'Berjalan',
  'Sesuai Target',
  'Berisiko',
  'Terlambat',
  'Selesai',
  'Dibatalkan',
];

export type JenisMitra =
  | 'Perguruan Tinggi'
  | 'Pemerintah'
  | 'Industri'
  | 'BUMN/BUMD'
  | 'Lembaga Penelitian'
  | 'NGO'
  | 'Organisasi Internasional'
  | 'Alumni'
  | 'Komunitas'
  | 'Media'
  | 'Lainnya';

export const JENIS_MITRA_LIST: JenisMitra[] = [
  'Perguruan Tinggi',
  'Pemerintah',
  'Industri',
  'BUMN/BUMD',
  'Lembaga Penelitian',
  'NGO',
  'Organisasi Internasional',
  'Alumni',
  'Komunitas',
  'Media',
  'Lainnya',
];

export type PilihanKeputusan =
  | 'Disetujui'
  | 'Direvisi'
  | 'Digabung'
  | 'Ditolak'
  | 'Ditunda';

export const PILIHAN_KEPUTUSAN_LIST: PilihanKeputusan[] = [
  'Disetujui',
  'Direvisi',
  'Digabung',
  'Ditolak',
  'Ditunda',
];

export const JENIS_DOKUMEN_LIST = [
  'Proposal',
  'TOR/KAK',
  'RAB',
  'Jadwal',
  'SK',
  'Surat Tugas',
  'MoU',
  'MoA',
  'IA',
  'Laporan',
  'Publikasi',
  'Dokumen pendukung lainnya',
] as const;

export const JENIS_BUKTI_LIST = [
  'Bukti IKU',
  'Bukti SDGs',
  'Bukti Luaran',
  'Bukti Hasil/Dampak',
  'Bukti Pelaksanaan',
  'Bukti Penggunaan Anggaran',
  'Bukti Kemitraan',
] as const;

export interface Organisasi {
  id_organisasi: string;
  kode_organisasi: string;
  nama_organisasi: string;
  jenis_organisasi: JenisOrganisasi;
  id_induk: string | null;
  nama_induk?: string | null;
  nama_singkat: string;
  jenjang: string;
  status: 'Aktif' | 'Nonaktif';
  berlaku_mulai: string;
  berlaku_sampai: string;
  akreditasi: string;
  sumber: string;
  id_pimpinan: string | null;
  nama_pimpinan?: string | null;
}

export interface Personel {
  id_personel: string;
  nip: string;
  nama_personel: string;
  status: 'Aktif' | 'Nonaktif';
  email: string;
  nomor_telepon: string;
}

export interface PenugasanJabatan {
  id_penugasan: string;
  id_personel: string;
  nama_personel?: string;
  id_organisasi: string;
  nama_organisasi?: string;
  jabatan: string;
  status: 'Aktif' | 'Selesai' | 'Nonaktif';
  berlaku_mulai: string;
  berlaku_sampai: string;
}

export interface Renstra {
  id_renstra: string;
  nama_renstra: string;
  periode_mulai: string;
  periode_selesai: string;
  id_organisasi: string | null;
  nama_organisasi?: string | null;
  visi: string;
  dokumen: string;
  status: 'Aktif' | 'Draft' | 'Selesai' | 'Arsip';
  keterangan: string;
}

export interface SasaranStrategis {
  id_sasaran: string;
  id_renstra: string;
  nama_renstra?: string;
  nomor: string;
  kode_sasaran: string;
  nama_sasaran: string;
  periode_mulai: string;
  periode_selesai: string;
  sumber: string;
  deskripsi: string;
  indikator: string;
  target: string;
  satuan: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface IKU {
  id_iku: string;
  kode_iku: string;
  nama_iku: string;
  deskripsi: string;
  satuan: string;
  sumber: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface SDG {
  id_sdg: string;
  nomor_sdg: number;
  nama_sdg: string;
  deskripsi: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface JenisAktivitas {
  id_jenis_aktivitas: string;
  kode: string;
  nama_jenis_aktivitas: string;
  deskripsi: string;
  pola_aktivitas: PolaAktivitas;
  status: 'Aktif' | 'Nonaktif';
}

export interface Mitra {
  id_mitra: string;
  nama_mitra: string;
  jenis_mitra: JenisMitra;
  negara: string;
  kota: string;
  sektor: string;
  website: string;
  pic_mitra: string;
  email: string;
  nomor_telepon: string;
  status: 'Aktif' | 'Nonaktif';
  keterangan: string;
}

export interface ProgramKerja {
  id_program: string;
  kode_program: string;
  nama_program: string;
  deskripsi: string;
  komisi: string;
  id_renstra: string | null;
  nama_renstra?: string | null;
  id_sasaran: string | null;
  nama_sasaran?: string | null;
  tujuan_program: string;
  id_organisasi_pemilik: string | null;
  nama_organisasi_pemilik?: string | null;
  id_organisasi_pelaksana: string | null;
  nama_organisasi_pelaksana?: string | null;
  id_pic: string | null;
  nama_pic?: string | null;
  pic_teks: string;
  prioritas: 'Tinggi' | 'Sedang' | 'Rendah';
  kode_prioritas: string;
  tahun_target: number | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jangka_waktu: string;
  cakupan: string;
  indikator: string;
  baseline: string;
  target: string;
  realisasi_target: string;
  satuan: string;
  luaran: string;
  hasil_dampak: string;
  sumber_dana: string;
  anggaran: number;
  realisasi_anggaran?: number;
  status_program: StatusProgram;
  iku_teks: string;
  skor_keselarasan_strategis: number | null;
  status_keselarasan: string;
  catatan: string;
  iku_ids?: string[];
  sdg_ids?: string[];
  mitra_ids?: string[];
  organisasi_pendukung_ids?: string[];
  iku_list?: { id_iku: string; kode_iku: string; nama_iku: string }[];
  sdg_list?: { id_sdg: string; nomor_sdg: number; nama_sdg: string }[];
  mitra_list?: { id_mitra: string; nama_mitra: string }[];
  organisasi_pendukung_list?: { id_organisasi: string; nama_organisasi: string }[];
}

export interface Aktivitas {
  id_aktivitas: string;
  id_program: string;
  nama_program?: string;
  kode_program?: string;
  id_jenis_aktivitas: string | null;
  nama_jenis_aktivitas?: string | null;
  nama_aktivitas: string;
  pola_aktivitas: PolaAktivitas;
  frekuensi: string;
  target_frekuensi: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  id_pic: string | null;
  nama_pic?: string | null;
  status: 'Direncanakan' | 'Berjalan' | 'Selesai' | 'Ditunda' | 'Dibatalkan';
  keterangan: string;
  realisasi_pelaksanaan?: number;
  total_pelaksanaan?: number;
  persentase_capaian?: number;
}

export interface PelaksanaanKegiatan {
  id_pelaksanaan: string;
  id_aktivitas: string;
  nama_aktivitas?: string;
  id_program?: string;
  nama_program?: string;
  nama_pelaksanaan: string;
  tanggal: string;
  lokasi: string;
  id_organisasi_pelaksana: string | null;
  nama_organisasi_pelaksana?: string | null;
  id_pic: string | null;
  nama_pic?: string | null;
  target_peserta: number;
  realisasi_peserta: number;
  status: 'Direncanakan' | 'Berjalan' | 'Selesai' | 'Ditunda' | 'Dibatalkan';
  luaran: string;
  catatan: string;
}

export interface EvaluasiProgram {
  id_evaluasi: string;
  id_program: string;
  nama_program?: string;
  jenis_evaluasi: string;
  tanggal_evaluasi: string;
  id_evaluator: string | null;
  evaluator: string;
  skor_keselarasan_strategis: number;
  status_keselarasan: 'Selaras' | 'Cukup Selaras' | 'Perlu Penyesuaian' | 'Tidak Selaras';
  temuan: string;
  rekomendasi: string;
  status_evaluasi: 'Draft' | 'Selesai' | 'Ditindaklanjuti';
  tindak_lanjut: string;
  status_tindak_lanjut: 'Belum Ditindaklanjuti' | 'Dalam Proses' | 'Selesai';
}

export interface KeputusanProgram {
  id_keputusan: string;
  id_program: string;
  nama_program?: string;
  tanggal_keputusan: string;
  keputusan: PilihanKeputusan;
  catatan_keputusan: string;
  diputuskan_oleh: string;
}

export interface DokumenProgram {
  id_dokumen: string;
  jenis_dokumen: string;
  judul: string;
  nomor_dokumen: string;
  tanggal_dokumen: string;
  tautan: string;
  deskripsi: string;
  id_program: string | null;
  nama_program?: string | null;
  id_pelaksanaan: string | null;
  nama_pelaksanaan?: string | null;
  status: 'Draft' | 'Final' | 'Disahkan';
}

export interface BuktiCapaian {
  id_bukti: string;
  jenis_bukti: string;
  judul: string;
  tanggal_capaian: string;
  tautan: string;
  deskripsi: string;
  id_program: string | null;
  nama_program?: string | null;
  id_pelaksanaan: string | null;
  nama_pelaksanaan?: string | null;
  status_verifikasi: 'Menunggu' | 'Terverifikasi' | 'Perlu Perbaikan';
}

export interface RisikoProgram {
  id_risiko: string;
  id_program: string;
  nama_program?: string;
  risiko: string;
  penyebab: string;
  dampak: string;
  tingkat_risiko: 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';
  mitigasi: string;
  id_pic: string | null;
  nama_pic?: string | null;
  status: 'Teridentifikasi' | 'Dimitigasi' | 'Dipantau' | 'Terselesaikan';
}

export interface RealisasiAnggaran {
  id_realisasi: string;
  id_program: string;
  nama_program?: string;
  id_pelaksanaan: string | null;
  nama_pelaksanaan?: string | null;
  tanggal: string;
  uraian: string;
  kategori_belanja: string;
  jumlah: number;
  nomor_bukti: string;
  keterangan: string;
}

export interface DashboardSummary {
  total_program: number;
  program_disetujui: number;
  program_berjalan: number;
  program_selesai: number;
  program_terlambat: number;
  program_berisiko: number;
  total_anggaran: number;
  realisasi_anggaran: number;
  persentase_realisasi: number;
  by_prioritas: { label: string; count: number }[];
  by_organisasi: { label: string; count: number }[];
  by_iku: { label: string; count: number }[];
  by_sdgs: { label: string; count: number }[];
  by_status: { label: string; count: number }[];
  counts: Record<string, number>;
}
