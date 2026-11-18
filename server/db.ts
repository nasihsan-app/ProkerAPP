import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  importOfficialMasterCsv,
  importProgramWork2027Csv,
  importRenstraAndSasaranCsv,
} from './masterImport.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'fmipa_unm.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const STANDARD_SDGS: Array<{ nomor: number; nama: string; deskripsi: string }> = [
  { nomor: 1, nama: 'Tanpa Kemiskinan', deskripsi: 'Mengakhiri kemiskinan dalam segala bentuk di manapun.' },
  { nomor: 2, nama: 'Tanpa Kelaparan', deskripsi: 'Mengakhiri kelaparan, mencapai ketahanan pangan dan gizi yang baik, serta meningkatkan pertanian berkelanjutan.' },
  { nomor: 3, nama: 'Kehidupan Sehat dan Sejahtera', deskripsi: 'Menjamin kehidupan yang sehat dan meningkatkan kesejahteraan seluruh penduduk semua usia.' },
  { nomor: 4, nama: 'Pendidikan Berkualitas', deskripsi: 'Menjamin kualitas pendidikan yang inklusif dan merata serta meningkatkan kesempatan belajar sepanjang hayat untuk semua.' },
  { nomor: 5, nama: 'Kesetaraan Gender', deskripsi: 'Mencapai kesetaraan gender dan memberdayakan kaum perempuan.' },
  { nomor: 6, nama: 'Air Bersih dan Sanitasi Layak', deskripsi: 'Menjamin ketersediaan serta pengelolaan air bersih dan sanitasi yang berkelanjutan untuk semua.' },
  { nomor: 7, nama: 'Energi Bersih dan Terjangkau', deskripsi: 'Menjamin akses energi yang terjangkau, andal, berkelanjutan, dan modern untuk semua.' },
  { nomor: 8, nama: 'Pekerjaan Layak dan Pertumbuhan Ekonomi', deskripsi: 'Meningkatkan pertumbuhan ekonomi yang inklusif dan berkelanjutan, kesempatan kerja yang produktif dan menyeluruh, serta pekerjaan yang layak untuk semua.' },
  { nomor: 9, nama: 'Industri, Inovasi, dan Infrastruktur', deskripsi: 'Membangun infrastruktur yang tangguh, meningkatkan industri inklusif dan berkelanjutan, serta mendorong inovasi.' },
  { nomor: 10, nama: 'Berkurangnya Kesenjangan', deskripsi: 'Mengurangi kesenjangan intra- dan antarnegara.' },
  { nomor: 11, nama: 'Kota dan Permukiman yang Berkelanjutan', deskripsi: 'Menjadikan kota dan permukiman inklusif, aman, tangguh, dan berkelanjutan.' },
  { nomor: 12, nama: 'Konsumsi dan Produksi yang Bertanggung Jawab', deskripsi: 'Menjamin pola produksi dan konsumsi yang berkelanjutan.' },
  { nomor: 13, nama: 'Penanganan Perubahan Iklim', deskripsi: 'Mengambil tindakan cepat untuk mengatasi perubahan iklim dan dampaknya.' },
  { nomor: 14, nama: 'Ekosistem Lautan', deskripsi: 'Melestarikan dan memanfaatkan secara berkelanjutan sumber daya kelautan dan samudera untuk pembangunan berkelanjutan.' },
  { nomor: 15, nama: 'Ekosistem Daratan', deskripsi: 'Melindungi, merestorasi, dan meningkatkan pemanfaatan berkelanjutan ekosistem daratan, mengelola hutan secara lestari, menghentikan penggurunan, memulihkan degradasi lahan, serta menghentikan kehilangan keanekaragaman hayati.' },
  { nomor: 16, nama: 'Perdamaian, Keadilan, dan Kelembagaan yang Tangguh', deskripsi: 'Menguatkan masyarakat yang inklusif dan damai untuk pembangunan berkelanjutan, menyediakan akses keadilan untuk semua, dan membangun kelembagaan yang efektif, akuntabel, dan inklusif di semua tingkatan.' },
  { nomor: 17, nama: 'Kemitraan untuk Mencapai Tujuan', deskripsi: 'Menguatkan sarana pelaksanaan dan merevitalisasi kemitraan global untuk pembangunan berkelanjutan.' },
];

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personel (
      id_personel TEXT PRIMARY KEY,
      nip TEXT NOT NULL DEFAULT '',
      nama_personel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      nomor_telepon TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organisasi (
      id_organisasi TEXT PRIMARY KEY,
      kode_organisasi TEXT NOT NULL DEFAULT '',
      nama_organisasi TEXT NOT NULL,
      jenis_organisasi TEXT NOT NULL,
      id_induk TEXT REFERENCES organisasi(id_organisasi) ON DELETE SET NULL,
      nama_singkat TEXT NOT NULL DEFAULT '',
      jenjang TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Aktif',
      berlaku_mulai TEXT NOT NULL DEFAULT '',
      berlaku_sampai TEXT NOT NULL DEFAULT '',
      akreditasi TEXT NOT NULL DEFAULT '',
      sumber TEXT NOT NULL DEFAULT '',
      id_pimpinan TEXT REFERENCES personel(id_personel) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS penugasan_jabatan (
      id_penugasan TEXT PRIMARY KEY,
      id_personel TEXT NOT NULL REFERENCES personel(id_personel) ON DELETE CASCADE,
      id_organisasi TEXT NOT NULL REFERENCES organisasi(id_organisasi) ON DELETE CASCADE,
      jabatan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktif',
      berlaku_mulai TEXT NOT NULL DEFAULT '',
      berlaku_sampai TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS renstra (
      id_renstra TEXT PRIMARY KEY,
      nama_renstra TEXT NOT NULL,
      periode_mulai TEXT NOT NULL DEFAULT '',
      periode_selesai TEXT NOT NULL DEFAULT '',
      id_organisasi TEXT REFERENCES organisasi(id_organisasi) ON DELETE SET NULL,
      visi TEXT NOT NULL DEFAULT '',
      dokumen TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Aktif',
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sasaran_strategis (
      id_sasaran TEXT PRIMARY KEY,
      id_renstra TEXT NOT NULL REFERENCES renstra(id_renstra) ON DELETE CASCADE,
      nomor TEXT NOT NULL DEFAULT '',
      kode_sasaran TEXT NOT NULL DEFAULT '',
      nama_sasaran TEXT NOT NULL,
      periode_mulai TEXT NOT NULL DEFAULT '',
      periode_selesai TEXT NOT NULL DEFAULT '',
      sumber TEXT NOT NULL DEFAULT '',
      deskripsi TEXT NOT NULL DEFAULT '',
      indikator TEXT NOT NULL DEFAULT '',
      target TEXT NOT NULL DEFAULT '',
      satuan TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Aktif',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS iku (
      id_iku TEXT PRIMARY KEY,
      kode_iku TEXT NOT NULL,
      nama_iku TEXT NOT NULL,
      deskripsi TEXT NOT NULL DEFAULT '',
      satuan TEXT NOT NULL DEFAULT '',
      sumber TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Aktif',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sdgs (
      id_sdg TEXT PRIMARY KEY,
      nomor_sdg INTEGER NOT NULL UNIQUE,
      nama_sdg TEXT NOT NULL,
      deskripsi TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Aktif'
    );

    CREATE TABLE IF NOT EXISTS jenis_aktivitas (
      id_jenis_aktivitas TEXT PRIMARY KEY,
      kode TEXT NOT NULL DEFAULT '',
      nama_jenis_aktivitas TEXT NOT NULL,
      deskripsi TEXT NOT NULL DEFAULT '',
      pola_aktivitas TEXT NOT NULL DEFAULT 'Sekali',
      status TEXT NOT NULL DEFAULT 'Aktif',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mitra (
      id_mitra TEXT PRIMARY KEY,
      nama_mitra TEXT NOT NULL,
      jenis_mitra TEXT NOT NULL,
      negara TEXT NOT NULL DEFAULT '',
      kota TEXT NOT NULL DEFAULT '',
      sektor TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      pic_mitra TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      nomor_telepon TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Aktif',
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS program_kerja (
      id_program TEXT PRIMARY KEY,
      kode_program TEXT NOT NULL DEFAULT '',
      nama_program TEXT NOT NULL,
      deskripsi TEXT NOT NULL DEFAULT '',
      komisi TEXT NOT NULL DEFAULT '',
      id_renstra TEXT REFERENCES renstra(id_renstra) ON DELETE SET NULL,
      id_sasaran TEXT REFERENCES sasaran_strategis(id_sasaran) ON DELETE SET NULL,
      tujuan_program TEXT NOT NULL DEFAULT '',
      id_organisasi_pemilik TEXT REFERENCES organisasi(id_organisasi) ON DELETE SET NULL,
      id_organisasi_pelaksana TEXT REFERENCES organisasi(id_organisasi) ON DELETE SET NULL,
      id_pic TEXT REFERENCES personel(id_personel) ON DELETE SET NULL,
      pic_teks TEXT NOT NULL DEFAULT '',
      prioritas TEXT NOT NULL DEFAULT 'Sedang',
      kode_prioritas TEXT NOT NULL DEFAULT '',
      tahun_target INTEGER,
      tanggal_mulai TEXT NOT NULL DEFAULT '',
      tanggal_selesai TEXT NOT NULL DEFAULT '',
      jangka_waktu TEXT NOT NULL DEFAULT '',
      cakupan TEXT NOT NULL DEFAULT '',
      indikator TEXT NOT NULL DEFAULT '',
      baseline TEXT NOT NULL DEFAULT '',
      target TEXT NOT NULL DEFAULT '',
      realisasi_target TEXT NOT NULL DEFAULT '',
      satuan TEXT NOT NULL DEFAULT '',
      luaran TEXT NOT NULL DEFAULT '',
      hasil_dampak TEXT NOT NULL DEFAULT '',
      sumber_dana TEXT NOT NULL DEFAULT '',
      anggaran REAL NOT NULL DEFAULT 0,
      status_program TEXT NOT NULL DEFAULT 'Draft',
      iku_teks TEXT NOT NULL DEFAULT '',
      skor_keselarasan_strategis REAL,
      status_keselarasan TEXT NOT NULL DEFAULT '',
      catatan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS program_iku (
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_iku TEXT NOT NULL REFERENCES iku(id_iku) ON DELETE CASCADE,
      PRIMARY KEY (id_program, id_iku)
    );

    CREATE TABLE IF NOT EXISTS program_sdgs (
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_sdg TEXT NOT NULL REFERENCES sdgs(id_sdg) ON DELETE CASCADE,
      PRIMARY KEY (id_program, id_sdg)
    );

    CREATE TABLE IF NOT EXISTS program_mitra (
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_mitra TEXT NOT NULL REFERENCES mitra(id_mitra) ON DELETE CASCADE,
      PRIMARY KEY (id_program, id_mitra)
    );

    CREATE TABLE IF NOT EXISTS program_organisasi_pendukung (
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_organisasi TEXT NOT NULL REFERENCES organisasi(id_organisasi) ON DELETE CASCADE,
      PRIMARY KEY (id_program, id_organisasi)
    );

    CREATE TABLE IF NOT EXISTS aktivitas (
      id_aktivitas TEXT PRIMARY KEY,
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_jenis_aktivitas TEXT REFERENCES jenis_aktivitas(id_jenis_aktivitas) ON DELETE SET NULL,
      nama_aktivitas TEXT NOT NULL,
      pola_aktivitas TEXT NOT NULL DEFAULT 'Sekali',
      frekuensi TEXT NOT NULL DEFAULT '',
      target_frekuensi REAL NOT NULL DEFAULT 1,
      tanggal_mulai TEXT NOT NULL DEFAULT '',
      tanggal_selesai TEXT NOT NULL DEFAULT '',
      id_pic TEXT REFERENCES personel(id_personel) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Direncanakan',
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pelaksanaan_kegiatan (
      id_pelaksanaan TEXT PRIMARY KEY,
      id_aktivitas TEXT NOT NULL REFERENCES aktivitas(id_aktivitas) ON DELETE CASCADE,
      nama_pelaksanaan TEXT NOT NULL,
      tanggal TEXT NOT NULL DEFAULT '',
      lokasi TEXT NOT NULL DEFAULT '',
      id_organisasi_pelaksana TEXT REFERENCES organisasi(id_organisasi) ON DELETE SET NULL,
      id_pic TEXT REFERENCES personel(id_personel) ON DELETE SET NULL,
      target_peserta INTEGER NOT NULL DEFAULT 0,
      realisasi_peserta INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Direncanakan',
      luaran TEXT NOT NULL DEFAULT '',
      catatan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evaluasi_program (
      id_evaluasi TEXT PRIMARY KEY,
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      jenis_evaluasi TEXT NOT NULL DEFAULT '',
      tanggal_evaluasi TEXT NOT NULL DEFAULT '',
      id_evaluator TEXT REFERENCES personel(id_personel) ON DELETE SET NULL,
      evaluator TEXT NOT NULL DEFAULT '',
      skor_keselarasan_strategis REAL NOT NULL DEFAULT 0,
      status_keselarasan TEXT NOT NULL DEFAULT 'Selaras',
      temuan TEXT NOT NULL DEFAULT '',
      rekomendasi TEXT NOT NULL DEFAULT '',
      status_evaluasi TEXT NOT NULL DEFAULT 'Draft',
      tindak_lanjut TEXT NOT NULL DEFAULT '',
      status_tindak_lanjut TEXT NOT NULL DEFAULT 'Belum Ditindaklanjuti',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS keputusan_program (
      id_keputusan TEXT PRIMARY KEY,
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      tanggal_keputusan TEXT NOT NULL DEFAULT '',
      keputusan TEXT NOT NULL,
      catatan_keputusan TEXT NOT NULL DEFAULT '',
      diputuskan_oleh TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dokumen_program (
      id_dokumen TEXT PRIMARY KEY,
      jenis_dokumen TEXT NOT NULL,
      judul TEXT NOT NULL,
      nomor_dokumen TEXT NOT NULL DEFAULT '',
      tanggal_dokumen TEXT NOT NULL DEFAULT '',
      tautan TEXT NOT NULL DEFAULT '',
      deskripsi TEXT NOT NULL DEFAULT '',
      id_program TEXT REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_pelaksanaan TEXT REFERENCES pelaksanaan_kegiatan(id_pelaksanaan) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bukti_capaian (
      id_bukti TEXT PRIMARY KEY,
      jenis_bukti TEXT NOT NULL,
      judul TEXT NOT NULL,
      tanggal_capaian TEXT NOT NULL DEFAULT '',
      tautan TEXT NOT NULL DEFAULT '',
      deskripsi TEXT NOT NULL DEFAULT '',
      id_program TEXT REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_pelaksanaan TEXT REFERENCES pelaksanaan_kegiatan(id_pelaksanaan) ON DELETE CASCADE,
      status_verifikasi TEXT NOT NULL DEFAULT 'Menunggu',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS risiko_program (
      id_risiko TEXT PRIMARY KEY,
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      risiko TEXT NOT NULL,
      penyebab TEXT NOT NULL DEFAULT '',
      dampak TEXT NOT NULL DEFAULT '',
      tingkat_risiko TEXT NOT NULL DEFAULT 'Sedang',
      mitigasi TEXT NOT NULL DEFAULT '',
      id_pic TEXT REFERENCES personel(id_personel) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Teridentifikasi',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS realisasi_anggaran (
      id_realisasi TEXT PRIMARY KEY,
      id_program TEXT NOT NULL REFERENCES program_kerja(id_program) ON DELETE CASCADE,
      id_pelaksanaan TEXT REFERENCES pelaksanaan_kegiatan(id_pelaksanaan) ON DELETE SET NULL,
      tanggal TEXT NOT NULL DEFAULT '',
      uraian TEXT NOT NULL,
      kategori_belanja TEXT NOT NULL DEFAULT '',
      jumlah REAL NOT NULL DEFAULT 0,
      nomor_bukti TEXT NOT NULL DEFAULT '',
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Pastikan kolom sumber ada pada tabel organisasi (migrasi aman untuk database yang sudah ada)
  const orgCols = db.prepare('PRAGMA table_info(organisasi)').all() as Array<{ name: string }>;
  if (!orgCols.some((c) => c.name === 'sumber')) {
    db.exec("ALTER TABLE organisasi ADD COLUMN sumber TEXT NOT NULL DEFAULT ''");
  }

  // Migrasi aman kolom baru pada renstra dan sasaran_strategis
  const renstraCols = db.prepare('PRAGMA table_info(renstra)').all() as Array<{ name: string }>;
  if (!renstraCols.some((c) => c.name === 'visi')) {
    db.exec("ALTER TABLE renstra ADD COLUMN visi TEXT NOT NULL DEFAULT ''");
  }
  const sasaranCols = db.prepare('PRAGMA table_info(sasaran_strategis)').all() as Array<{ name: string }>;
  if (!sasaranCols.some((c) => c.name === 'nomor')) {
    db.exec("ALTER TABLE sasaran_strategis ADD COLUMN nomor TEXT NOT NULL DEFAULT ''");
  }
  if (!sasaranCols.some((c) => c.name === 'periode_mulai')) {
    db.exec("ALTER TABLE sasaran_strategis ADD COLUMN periode_mulai TEXT NOT NULL DEFAULT ''");
  }
  if (!sasaranCols.some((c) => c.name === 'periode_selesai')) {
    db.exec("ALTER TABLE sasaran_strategis ADD COLUMN periode_selesai TEXT NOT NULL DEFAULT ''");
  }
  if (!sasaranCols.some((c) => c.name === 'sumber')) {
    db.exec("ALTER TABLE sasaran_strategis ADD COLUMN sumber TEXT NOT NULL DEFAULT ''");
  }

  // Migrasi aman kolom tambahan pada program_kerja
  const programCols = db.prepare('PRAGMA table_info(program_kerja)').all() as Array<{ name: string }>;
  const addProgramColIfMissing = (name: string, ddl: string) => {
    if (!programCols.some((c) => c.name === name)) {
      db.exec(`ALTER TABLE program_kerja ADD COLUMN ${ddl}`);
    }
  };
  addProgramColIfMissing('pic_teks', "pic_teks TEXT NOT NULL DEFAULT ''");
  addProgramColIfMissing('kode_prioritas', "kode_prioritas TEXT NOT NULL DEFAULT ''");
  addProgramColIfMissing('jangka_waktu', "jangka_waktu TEXT NOT NULL DEFAULT ''");
  addProgramColIfMissing('cakupan', "cakupan TEXT NOT NULL DEFAULT ''");
  addProgramColIfMissing('iku_teks', "iku_teks TEXT NOT NULL DEFAULT ''");
  addProgramColIfMissing('skor_keselarasan_strategis', 'skor_keselarasan_strategis REAL');
  addProgramColIfMissing('status_keselarasan', "status_keselarasan TEXT NOT NULL DEFAULT ''");

  // Seed ONLY the 17 standard UN SDGs (1..17) if not yet seeded.
  const sdgCount = db.prepare('SELECT COUNT(*) as cnt FROM sdgs').get() as { cnt: number };
  if (sdgCount.cnt === 0) {
    const insertSdg = db.prepare(
      'INSERT INTO sdgs (id_sdg, nomor_sdg, nama_sdg, deskripsi, status) VALUES (?, ?, ?, ?, ?)'
    );
    const seedTransaction = db.transaction(() => {
      for (const s of STANDARD_SDGS) {
        const id = `SDG-${String(s.nomor).padStart(2, '0')}`;
        insertSdg.run(id, s.nomor, s.nama, s.deskripsi, 'Aktif');
      }
    });
    seedTransaction();
  }

  // Sinkronisasi awal 3 file CSV master resmi jika belum pernah diimpor
  const metaImported = db
    .prepare("SELECT value FROM system_meta WHERE key = 'master_csv_imported'")
    .get() as { value: string } | undefined;
  if (!metaImported) {
    try {
      importOfficialMasterCsv(db);
    } catch (err) {
      console.error('Gagal mengimpor master CSV awal:', err);
    }
  }

  // Sinkronisasi awal Renstra & Sasaran Strategis dari CSV resmi jika belum pernah diimpor
  const renstraMeta = db
    .prepare("SELECT value FROM system_meta WHERE key = 'renstra_sasaran_csv_imported'")
    .get() as { value: string } | undefined;
  if (!renstraMeta) {
    try {
      importRenstraAndSasaranCsv(db);
    } catch (err) {
      console.error('Gagal mengimpor CSV Renstra & Sasaran Strategis:', err);
    }
  }

  // Sinkronisasi awal Program Kerja 2027 dari CSV resmi jika belum pernah diimpor
  const program2027Meta = db
    .prepare("SELECT value FROM system_meta WHERE key = 'program_work_2027_csv_imported'")
    .get() as { value: string } | undefined;
  if (!program2027Meta) {
    try {
      importProgramWork2027Csv(db);
    } catch (err) {
      console.error('Gagal mengimpor CSV Program Kerja 2027:', err);
    }
  }
}

export function generateId(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${time}${random}`;
}
