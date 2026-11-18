import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { db, generateId, initDatabase } from './server/db.ts';
import {
  importOfficialMasterCsv,
  importProgramWork2027Csv,
  importRenstraAndSasaranCsv,
} from './server/masterImport.ts';

initDatabase();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function nullableId(val: unknown): string | null {
  const s = cleanString(val);
  return s.length > 0 ? s : null;
}

function toNumber(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsv(csvText: string): Array<Record<string, string>> {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell);
        if (row.some((c) => c.trim().length > 0)) {
          rows.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim().length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

// ==========================================
// DASHBOARD & COUNTS
// ==========================================
app.get('/api/dashboard', (_req, res) => {
  try {
    const total_program = (db.prepare('SELECT COUNT(*) as c FROM program_kerja').get() as { c: number }).c;
    const program_disetujui = (
      db.prepare("SELECT COUNT(*) as c FROM program_kerja WHERE status_program = 'Disetujui'").get() as { c: number }
    ).c;
    const program_berjalan = (
      db.prepare("SELECT COUNT(*) as c FROM program_kerja WHERE status_program = 'Berjalan'").get() as { c: number }
    ).c;
    const program_selesai = (
      db.prepare("SELECT COUNT(*) as c FROM program_kerja WHERE status_program = 'Selesai'").get() as { c: number }
    ).c;
    const program_terlambat = (
      db.prepare("SELECT COUNT(*) as c FROM program_kerja WHERE status_program = 'Terlambat'").get() as { c: number }
    ).c;
    const program_berisiko = (
      db.prepare("SELECT COUNT(*) as c FROM program_kerja WHERE status_program = 'Berisiko'").get() as { c: number }
    ).c;

    const total_anggaran = (
      db.prepare('SELECT COALESCE(SUM(anggaran), 0) as s FROM program_kerja').get() as { s: number }
    ).s;
    const realisasi_anggaran = (
      db.prepare('SELECT COALESCE(SUM(jumlah), 0) as s FROM realisasi_anggaran').get() as { s: number }
    ).s;
    const persentase_realisasi =
      total_anggaran > 0 ? Number(((realisasi_anggaran / total_anggaran) * 100).toFixed(2)) : 0;

    const by_prioritas = db
      .prepare('SELECT prioritas as label, COUNT(*) as count FROM program_kerja GROUP BY prioritas ORDER BY count DESC')
      .all() as { label: string; count: number }[];

    const by_organisasi = db
      .prepare(`
        SELECT COALESCE(o.nama_organisasi, 'Belum Ditentukan') as label, COUNT(*) as count
        FROM program_kerja p
        LEFT JOIN organisasi o ON o.id_organisasi = p.id_organisasi_pemilik
        GROUP BY p.id_organisasi_pemilik
        ORDER BY count DESC
      `)
      .all() as { label: string; count: number }[];

    const by_iku = db
      .prepare(`
        SELECT i.kode_iku || ' - ' || i.nama_iku as label, COUNT(pi.id_program) as count
        FROM program_iku pi
        JOIN iku i ON i.id_iku = pi.id_iku
        GROUP BY i.id_iku
        ORDER BY count DESC
      `)
      .all() as { label: string; count: number }[];

    const by_sdgs = db
      .prepare(`
        SELECT 'SDG ' || s.nomor_sdg || ' - ' || s.nama_sdg as label, COUNT(ps.id_program) as count
        FROM program_sdgs ps
        JOIN sdgs s ON s.id_sdg = ps.id_sdg
        GROUP BY s.id_sdg
        ORDER BY s.nomor_sdg ASC
      `)
      .all() as { label: string; count: number }[];

    const by_status = db
      .prepare('SELECT status_program as label, COUNT(*) as count FROM program_kerja GROUP BY status_program ORDER BY count DESC')
      .all() as { label: string; count: number }[];

    const counts: Record<string, number> = {
      organisasi: (db.prepare('SELECT COUNT(*) as c FROM organisasi').get() as { c: number }).c,
      personel: (db.prepare('SELECT COUNT(*) as c FROM personel').get() as { c: number }).c,
      penugasan_jabatan: (db.prepare('SELECT COUNT(*) as c FROM penugasan_jabatan').get() as { c: number }).c,
      jenis_aktivitas: (db.prepare('SELECT COUNT(*) as c FROM jenis_aktivitas').get() as { c: number }).c,
      mitra: (db.prepare('SELECT COUNT(*) as c FROM mitra').get() as { c: number }).c,
      iku: (db.prepare('SELECT COUNT(*) as c FROM iku').get() as { c: number }).c,
      sdgs: (db.prepare('SELECT COUNT(*) as c FROM sdgs').get() as { c: number }).c,
      renstra: (db.prepare('SELECT COUNT(*) as c FROM renstra').get() as { c: number }).c,
      sasaran_strategis: (db.prepare('SELECT COUNT(*) as c FROM sasaran_strategis').get() as { c: number }).c,
      program_kerja: total_program,
      aktivitas: (db.prepare('SELECT COUNT(*) as c FROM aktivitas').get() as { c: number }).c,
      pelaksanaan_kegiatan: (db.prepare('SELECT COUNT(*) as c FROM pelaksanaan_kegiatan').get() as { c: number }).c,
      evaluasi_program: (db.prepare('SELECT COUNT(*) as c FROM evaluasi_program').get() as { c: number }).c,
      keputusan_program: (db.prepare('SELECT COUNT(*) as c FROM keputusan_program').get() as { c: number }).c,
      dokumen_program: (db.prepare('SELECT COUNT(*) as c FROM dokumen_program').get() as { c: number }).c,
      bukti_capaian: (db.prepare('SELECT COUNT(*) as c FROM bukti_capaian').get() as { c: number }).c,
      risiko_program: (db.prepare('SELECT COUNT(*) as c FROM risiko_program').get() as { c: number }).c,
      realisasi_anggaran: (db.prepare('SELECT COUNT(*) as c FROM realisasi_anggaran').get() as { c: number }).c,
    };

    res.json({
      total_program,
      program_disetujui,
      program_berjalan,
      program_selesai,
      program_terlambat,
      program_berisiko,
      total_anggaran,
      realisasi_anggaran,
      persentase_realisasi,
      by_prioritas,
      by_organisasi,
      by_iku,
      by_sdgs,
      by_status,
      counts,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: ORGANISASI
// ==========================================
app.get('/api/organisasi', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT o.*,
        induk.nama_organisasi as nama_induk,
        p.nama_personel as nama_pimpinan
      FROM organisasi o
      LEFT JOIN organisasi induk ON induk.id_organisasi = o.id_induk
      LEFT JOIN personel p ON p.id_personel = o.id_pimpinan
      ORDER BY o.kode_organisasi ASC, o.nama_organisasi ASC
    `)
    .all();
  res.json(rows);
});

app.post('/api/organisasi', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.nama_organisasi) || !cleanString(b.jenis_organisasi)) {
      res.status(400).json({ error: 'Nama Organisasi dan Jenis Organisasi wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_organisasi) || generateId('ORG');
    db.prepare(`
      INSERT INTO organisasi (
        id_organisasi, kode_organisasi, nama_organisasi, jenis_organisasi,
        id_induk, nama_singkat, jenjang, status, berlaku_mulai,
        berlaku_sampai, akreditasi, sumber, id_pimpinan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.kode_organisasi),
      cleanString(b.nama_organisasi),
      cleanString(b.jenis_organisasi),
      nullableId(b.id_induk),
      cleanString(b.nama_singkat),
      cleanString(b.jenjang),
      cleanString(b.status) || 'Aktif',
      cleanString(b.berlaku_mulai),
      cleanString(b.berlaku_sampai),
      cleanString(b.akreditasi),
      cleanString(b.sumber),
      nullableId(b.id_pimpinan)
    );
    res.status(201).json({ id_organisasi: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/organisasi/:id', (req, res) => {
  try {
    const b = req.body;
    const id = req.params.id;
    if (nullableId(b.id_induk) === id) {
      res.status(400).json({ error: 'Organisasi induk tidak boleh merujuk pada dirinya sendiri.' });
      return;
    }
    db.prepare(`
      UPDATE organisasi SET
        kode_organisasi = ?, nama_organisasi = ?, jenis_organisasi = ?,
        id_induk = ?, nama_singkat = ?, jenjang = ?, status = ?,
        berlaku_mulai = ?, berlaku_sampai = ?, akreditasi = ?, sumber = ?, id_pimpinan = ?
      WHERE id_organisasi = ?
    `).run(
      cleanString(b.kode_organisasi),
      cleanString(b.nama_organisasi),
      cleanString(b.jenis_organisasi),
      nullableId(b.id_induk),
      cleanString(b.nama_singkat),
      cleanString(b.jenjang),
      cleanString(b.status) || 'Aktif',
      cleanString(b.berlaku_mulai),
      cleanString(b.berlaku_sampai),
      cleanString(b.akreditasi),
      cleanString(b.sumber),
      nullableId(b.id_pimpinan),
      id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/organisasi/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM organisasi WHERE id_organisasi = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: PERSONEL
// ==========================================
app.get('/api/personel', (_req, res) => {
  const rows = db.prepare('SELECT * FROM personel ORDER BY nama_personel ASC').all();
  res.json(rows);
});

app.post('/api/personel', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.nama_personel)) {
      res.status(400).json({ error: 'Nama Personel wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_personel) || generateId('PRS');
    db.prepare(`
      INSERT INTO personel (id_personel, nip, nama_personel, status, email, nomor_telepon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.nip),
      cleanString(b.nama_personel),
      cleanString(b.status),
      cleanString(b.email),
      cleanString(b.nomor_telepon)
    );
    res.status(201).json({ id_personel: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/personel/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE personel SET nip = ?, nama_personel = ?, status = ?, email = ?, nomor_telepon = ?
      WHERE id_personel = ?
    `).run(
      cleanString(b.nip),
      cleanString(b.nama_personel),
      cleanString(b.status),
      cleanString(b.email),
      cleanString(b.nomor_telepon),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/personel/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM personel WHERE id_personel = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: PENUGASAN JABATAN
// ==========================================
app.get('/api/penugasan-jabatan', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT pj.*, p.nama_personel, o.nama_organisasi
      FROM penugasan_jabatan pj
      JOIN personel p ON p.id_personel = pj.id_personel
      JOIN organisasi o ON o.id_organisasi = pj.id_organisasi
      ORDER BY p.nama_personel ASC, pj.berlaku_mulai DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/penugasan-jabatan', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_personel) || !cleanString(b.id_organisasi) || !cleanString(b.jabatan)) {
      res.status(400).json({ error: 'Personel, Organisasi, dan Jabatan wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_penugasan) || generateId('JBT');
    db.prepare(`
      INSERT INTO penugasan_jabatan (
        id_penugasan, id_personel, id_organisasi, jabatan, status, berlaku_mulai, berlaku_sampai
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_personel),
      cleanString(b.id_organisasi),
      cleanString(b.jabatan),
      cleanString(b.status) || 'Aktif',
      cleanString(b.berlaku_mulai),
      cleanString(b.berlaku_sampai)
    );
    res.status(201).json({ id_penugasan: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/penugasan-jabatan/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE penugasan_jabatan SET
        id_personel = ?, id_organisasi = ?, jabatan = ?, status = ?, berlaku_mulai = ?, berlaku_sampai = ?
      WHERE id_penugasan = ?
    `).run(
      cleanString(b.id_personel),
      cleanString(b.id_organisasi),
      cleanString(b.jabatan),
      cleanString(b.status) || 'Aktif',
      cleanString(b.berlaku_mulai),
      cleanString(b.berlaku_sampai),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/penugasan-jabatan/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM penugasan_jabatan WHERE id_penugasan = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: JENIS AKTIVITAS
// ==========================================
app.get('/api/jenis-aktivitas', (_req, res) => {
  res.json(db.prepare('SELECT * FROM jenis_aktivitas ORDER BY kode ASC, nama_jenis_aktivitas ASC').all());
});

app.post('/api/jenis-aktivitas', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.nama_jenis_aktivitas)) {
      res.status(400).json({ error: 'Nama Jenis Aktivitas wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_jenis_aktivitas) || generateId('JAK');
    db.prepare(`
      INSERT INTO jenis_aktivitas (id_jenis_aktivitas, kode, nama_jenis_aktivitas, deskripsi, pola_aktivitas, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.kode),
      cleanString(b.nama_jenis_aktivitas),
      cleanString(b.deskripsi),
      cleanString(b.pola_aktivitas) || 'Sekali',
      cleanString(b.status) || 'Aktif'
    );
    res.status(201).json({ id_jenis_aktivitas: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/jenis-aktivitas/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE jenis_aktivitas SET kode = ?, nama_jenis_aktivitas = ?, deskripsi = ?, pola_aktivitas = ?, status = ?
      WHERE id_jenis_aktivitas = ?
    `).run(
      cleanString(b.kode),
      cleanString(b.nama_jenis_aktivitas),
      cleanString(b.deskripsi),
      cleanString(b.pola_aktivitas) || 'Sekali',
      cleanString(b.status) || 'Aktif',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/jenis-aktivitas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM jenis_aktivitas WHERE id_jenis_aktivitas = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: MITRA
// ==========================================
app.get('/api/mitra', (_req, res) => {
  res.json(db.prepare('SELECT * FROM mitra ORDER BY nama_mitra ASC').all());
});

app.post('/api/mitra', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.nama_mitra) || !cleanString(b.jenis_mitra)) {
      res.status(400).json({ error: 'Nama Mitra dan Jenis Mitra wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_mitra) || generateId('MTR');
    db.prepare(`
      INSERT INTO mitra (
        id_mitra, nama_mitra, jenis_mitra, negara, kota, sektor,
        website, pic_mitra, email, nomor_telepon, status, keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.nama_mitra),
      cleanString(b.jenis_mitra),
      cleanString(b.negara),
      cleanString(b.kota),
      cleanString(b.sektor),
      cleanString(b.website),
      cleanString(b.pic_mitra),
      cleanString(b.email),
      cleanString(b.nomor_telepon),
      cleanString(b.status) || 'Aktif',
      cleanString(b.keterangan)
    );
    res.status(201).json({ id_mitra: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/mitra/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE mitra SET
        nama_mitra = ?, jenis_mitra = ?, negara = ?, kota = ?, sektor = ?,
        website = ?, pic_mitra = ?, email = ?, nomor_telepon = ?, status = ?, keterangan = ?
      WHERE id_mitra = ?
    `).run(
      cleanString(b.nama_mitra),
      cleanString(b.jenis_mitra),
      cleanString(b.negara),
      cleanString(b.kota),
      cleanString(b.sektor),
      cleanString(b.website),
      cleanString(b.pic_mitra),
      cleanString(b.email),
      cleanString(b.nomor_telepon),
      cleanString(b.status) || 'Aktif',
      cleanString(b.keterangan),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/mitra/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM mitra WHERE id_mitra = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: IKU
// ==========================================
app.get('/api/iku', (_req, res) => {
  res.json(db.prepare('SELECT * FROM iku ORDER BY kode_iku ASC').all());
});

app.post('/api/iku', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.kode_iku) || !cleanString(b.nama_iku)) {
      res.status(400).json({ error: 'Kode IKU dan Nama IKU wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_iku) || generateId('IKU');
    db.prepare(`
      INSERT INTO iku (id_iku, kode_iku, nama_iku, deskripsi, satuan, sumber, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.kode_iku),
      cleanString(b.nama_iku),
      cleanString(b.deskripsi),
      cleanString(b.satuan),
      cleanString(b.sumber),
      cleanString(b.status) || 'Aktif'
    );
    res.status(201).json({ id_iku: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/iku/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE iku SET kode_iku = ?, nama_iku = ?, deskripsi = ?, satuan = ?, sumber = ?, status = ?
      WHERE id_iku = ?
    `).run(
      cleanString(b.kode_iku),
      cleanString(b.nama_iku),
      cleanString(b.deskripsi),
      cleanString(b.satuan),
      cleanString(b.sumber),
      cleanString(b.status) || 'Aktif',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/iku/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM iku WHERE id_iku = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MASTER: SDGs (17 Standar)
// ==========================================
app.get('/api/sdgs', (_req, res) => {
  res.json(db.prepare('SELECT * FROM sdgs ORDER BY nomor_sdg ASC').all());
});

app.patch('/api/sdgs/:id', (req, res) => {
  try {
    const status = cleanString(req.body.status);
    if (status !== 'Aktif' && status !== 'Nonaktif') {
      res.status(400).json({ error: 'Status SDGs tidak valid.' });
      return;
    }
    db.prepare('UPDATE sdgs SET status = ? WHERE id_sdg = ?').run(status, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// PERENCANAAN STRATEGIS: RENSTRA & SASARAN STRATEGIS
// ==========================================
app.get('/api/renstra', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT r.*, o.nama_organisasi
      FROM renstra r
      LEFT JOIN organisasi o ON o.id_organisasi = r.id_organisasi
      ORDER BY r.periode_mulai DESC, r.nama_renstra ASC
    `)
    .all();
  res.json(rows);
});

app.post('/api/renstra', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.nama_renstra)) {
      res.status(400).json({ error: 'Nama Renstra wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_renstra) || generateId('RNS');
    db.prepare(`
      INSERT INTO renstra (id_renstra, nama_renstra, periode_mulai, periode_selesai, id_organisasi, visi, dokumen, status, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.nama_renstra),
      cleanString(b.periode_mulai),
      cleanString(b.periode_selesai),
      nullableId(b.id_organisasi),
      cleanString(b.visi),
      cleanString(b.dokumen),
      cleanString(b.status) || 'Aktif',
      cleanString(b.keterangan)
    );
    res.status(201).json({ id_renstra: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/renstra/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE renstra SET
        nama_renstra = ?, periode_mulai = ?, periode_selesai = ?, id_organisasi = ?,
        visi = ?, dokumen = ?, status = ?, keterangan = ?
      WHERE id_renstra = ?
    `).run(
      cleanString(b.nama_renstra),
      cleanString(b.periode_mulai),
      cleanString(b.periode_selesai),
      nullableId(b.id_organisasi),
      cleanString(b.visi),
      cleanString(b.dokumen),
      cleanString(b.status) || 'Aktif',
      cleanString(b.keterangan),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/renstra/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM renstra WHERE id_renstra = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/sasaran-strategis', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT s.*, r.nama_renstra
      FROM sasaran_strategis s
      JOIN renstra r ON r.id_renstra = s.id_renstra
      ORDER BY CAST(NULLIF(s.nomor, '') AS INTEGER) ASC, s.id_sasaran ASC
    `)
    .all();
  res.json(rows);
});

app.post('/api/sasaran-strategis', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_renstra) || !cleanString(b.nama_sasaran)) {
      res.status(400).json({ error: 'Renstra dan Nama Sasaran wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_sasaran) || generateId('SAS');
    db.prepare(`
      INSERT INTO sasaran_strategis (
        id_sasaran, id_renstra, nomor, kode_sasaran, nama_sasaran,
        periode_mulai, periode_selesai, sumber, deskripsi, indikator, target, satuan, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_renstra),
      cleanString(b.nomor),
      cleanString(b.kode_sasaran) || cleanString(b.nomor),
      cleanString(b.nama_sasaran),
      cleanString(b.periode_mulai),
      cleanString(b.periode_selesai),
      cleanString(b.sumber),
      cleanString(b.deskripsi),
      cleanString(b.indikator),
      cleanString(b.target),
      cleanString(b.satuan),
      cleanString(b.status) || 'Aktif'
    );
    res.status(201).json({ id_sasaran: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/sasaran-strategis/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE sasaran_strategis SET
        id_renstra = ?, nomor = ?, kode_sasaran = ?, nama_sasaran = ?,
        periode_mulai = ?, periode_selesai = ?, sumber = ?,
        deskripsi = ?, indikator = ?, target = ?, satuan = ?, status = ?
      WHERE id_sasaran = ?
    `).run(
      cleanString(b.id_renstra),
      cleanString(b.nomor),
      cleanString(b.kode_sasaran) || cleanString(b.nomor),
      cleanString(b.nama_sasaran),
      cleanString(b.periode_mulai),
      cleanString(b.periode_selesai),
      cleanString(b.sumber),
      cleanString(b.deskripsi),
      cleanString(b.indikator),
      cleanString(b.target),
      cleanString(b.satuan),
      cleanString(b.status) || 'Aktif',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/sasaran-strategis/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sasaran_strategis WHERE id_sasaran = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// PROGRAM KERJA (dengan relasi M2M IKU, SDGs, Mitra, Organisasi Pendukung)
// ==========================================
function hydrateProgramRelations(programRow: Record<string, unknown>) {
  const id = programRow.id_program as string;
  const ikuList = db
    .prepare('SELECT i.id_iku, i.kode_iku, i.nama_iku FROM program_iku pi JOIN iku i ON i.id_iku = pi.id_iku WHERE pi.id_program = ?')
    .all(id) as { id_iku: string; kode_iku: string; nama_iku: string }[];
  const sdgList = db
    .prepare('SELECT s.id_sdg, s.nomor_sdg, s.nama_sdg FROM program_sdgs ps JOIN sdgs s ON s.id_sdg = ps.id_sdg WHERE ps.id_program = ? ORDER BY s.nomor_sdg ASC')
    .all(id) as { id_sdg: string; nomor_sdg: number; nama_sdg: string }[];
  const mitraList = db
    .prepare('SELECT m.id_mitra, m.nama_mitra FROM program_mitra pm JOIN mitra m ON m.id_mitra = pm.id_mitra WHERE pm.id_program = ?')
    .all(id) as { id_mitra: string; nama_mitra: string }[];
  const orgPendukungList = db
    .prepare('SELECT o.id_organisasi, o.nama_organisasi FROM program_organisasi_pendukung po JOIN organisasi o ON o.id_organisasi = po.id_organisasi WHERE po.id_program = ?')
    .all(id) as { id_organisasi: string; nama_organisasi: string }[];

  return {
    ...programRow,
    iku_ids: ikuList.map((x) => x.id_iku),
    sdg_ids: sdgList.map((x) => x.id_sdg),
    mitra_ids: mitraList.map((x) => x.id_mitra),
    organisasi_pendukung_ids: orgPendukungList.map((x) => x.id_organisasi),
    iku_list: ikuList,
    sdg_list: sdgList,
    mitra_list: mitraList,
    organisasi_pendukung_list: orgPendukungList,
  };
}

function syncProgramRelations(
  idProgram: string,
  ikuIds: string[],
  sdgIds: string[],
  mitraIds: string[],
  orgPendukungIds: string[]
) {
  db.prepare('DELETE FROM program_iku WHERE id_program = ?').run(idProgram);
  db.prepare('DELETE FROM program_sdgs WHERE id_program = ?').run(idProgram);
  db.prepare('DELETE FROM program_mitra WHERE id_program = ?').run(idProgram);
  db.prepare('DELETE FROM program_organisasi_pendukung WHERE id_program = ?').run(idProgram);

  const insIku = db.prepare('INSERT OR IGNORE INTO program_iku (id_program, id_iku) VALUES (?, ?)');
  for (const x of ikuIds) insIku.run(idProgram, x);

  const insSdg = db.prepare('INSERT OR IGNORE INTO program_sdgs (id_program, id_sdg) VALUES (?, ?)');
  for (const x of sdgIds) insSdg.run(idProgram, x);

  const insMitra = db.prepare('INSERT OR IGNORE INTO program_mitra (id_program, id_mitra) VALUES (?, ?)');
  for (const x of mitraIds) insMitra.run(idProgram, x);

  const insOrg = db.prepare('INSERT OR IGNORE INTO program_organisasi_pendukung (id_program, id_organisasi) VALUES (?, ?)');
  for (const x of orgPendukungIds) insOrg.run(idProgram, x);
}

app.get('/api/program-kerja', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT p.*,
        r.nama_renstra,
        s.nama_sasaran,
        opem.nama_organisasi as nama_organisasi_pemilik,
        opel.nama_organisasi as nama_organisasi_pelaksana,
        prs.nama_personel as nama_pic,
        COALESCE((SELECT SUM(ra.jumlah) FROM realisasi_anggaran ra WHERE ra.id_program = p.id_program), 0) as realisasi_anggaran
      FROM program_kerja p
      LEFT JOIN renstra r ON r.id_renstra = p.id_renstra
      LEFT JOIN sasaran_strategis s ON s.id_sasaran = p.id_sasaran
      LEFT JOIN organisasi opem ON opem.id_organisasi = p.id_organisasi_pemilik
      LEFT JOIN organisasi opel ON opel.id_organisasi = p.id_organisasi_pelaksana
      LEFT JOIN personel prs ON prs.id_personel = p.id_pic
      ORDER BY p.created_at DESC, p.id_program ASC
    `)
    .all() as Record<string, unknown>[];

  res.json(rows.map(hydrateProgramRelations));
});

app.get('/api/program-kerja/:id', (req, res) => {
  const row = db
    .prepare(`
      SELECT p.*,
        r.nama_renstra,
        s.nama_sasaran,
        opem.nama_organisasi as nama_organisasi_pemilik,
        opel.nama_organisasi as nama_organisasi_pelaksana,
        prs.nama_personel as nama_pic,
        COALESCE((SELECT SUM(ra.jumlah) FROM realisasi_anggaran ra WHERE ra.id_program = p.id_program), 0) as realisasi_anggaran
      FROM program_kerja p
      LEFT JOIN renstra r ON r.id_renstra = p.id_renstra
      LEFT JOIN sasaran_strategis s ON s.id_sasaran = p.id_sasaran
      LEFT JOIN organisasi opem ON opem.id_organisasi = p.id_organisasi_pemilik
      LEFT JOIN organisasi opel ON opel.id_organisasi = p.id_organisasi_pelaksana
      LEFT JOIN personel prs ON prs.id_personel = p.id_pic
      WHERE p.id_program = ?
    `)
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Program Kerja tidak ditemukan.' });
    return;
  }

  const aktivitas = db
    .prepare(`
      SELECT a.*,
        ja.nama_jenis_aktivitas,
        prs.nama_personel as nama_pic,
        (SELECT COUNT(*) FROM pelaksanaan_kegiatan pk WHERE pk.id_aktivitas = a.id_aktivitas AND pk.status = 'Selesai') as realisasi_pelaksanaan,
        (SELECT COUNT(*) FROM pelaksanaan_kegiatan pk WHERE pk.id_aktivitas = a.id_aktivitas) as total_pelaksanaan
      FROM aktivitas a
      LEFT JOIN jenis_aktivitas ja ON ja.id_jenis_aktivitas = a.id_jenis_aktivitas
      LEFT JOIN personel prs ON prs.id_personel = a.id_pic
      WHERE a.id_program = ?
      ORDER BY a.tanggal_mulai ASC
    `)
    .all(req.params.id);

  const evaluasi = db
    .prepare('SELECT * FROM evaluasi_program WHERE id_program = ? ORDER BY tanggal_evaluasi DESC')
    .all(req.params.id);

  const keputusan = db
    .prepare('SELECT * FROM keputusan_program WHERE id_program = ? ORDER BY tanggal_keputusan DESC')
    .all(req.params.id);

  const dokumen = db
    .prepare('SELECT * FROM dokumen_program WHERE id_program = ? ORDER BY tanggal_dokumen DESC')
    .all(req.params.id);

  const bukti = db
    .prepare('SELECT * FROM bukti_capaian WHERE id_program = ? ORDER BY tanggal_capaian DESC')
    .all(req.params.id);

  const risiko = db
    .prepare(`
      SELECT rp.*, prs.nama_personel as nama_pic
      FROM risiko_program rp
      LEFT JOIN personel prs ON prs.id_personel = rp.id_pic
      WHERE rp.id_program = ?
    `)
    .all(req.params.id);

  const realisasi_anggaran_list = db
    .prepare('SELECT * FROM realisasi_anggaran WHERE id_program = ? ORDER BY tanggal DESC')
    .all(req.params.id);

  res.json({
    program: hydrateProgramRelations(row),
    aktivitas,
    evaluasi,
    keputusan,
    dokumen,
    bukti,
    risiko,
    realisasi_anggaran_list,
  });
});

app.post('/api/program-kerja', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.nama_program)) {
      res.status(400).json({ error: 'Nama Program Kerja wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_program) || generateId('PRG');
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO program_kerja (
          id_program, kode_program, nama_program, deskripsi, komisi,
          id_renstra, id_sasaran, tujuan_program,
          id_organisasi_pemilik, id_organisasi_pelaksana, id_pic, pic_teks,
          prioritas, kode_prioritas, tahun_target, tanggal_mulai, tanggal_selesai, jangka_waktu, cakupan,
          indikator, baseline, target, realisasi_target, satuan, luaran, hasil_dampak,
          sumber_dana, anggaran, status_program, iku_teks,
          skor_keselarasan_strategis, status_keselarasan, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        cleanString(b.kode_program),
        cleanString(b.nama_program),
        cleanString(b.deskripsi),
        cleanString(b.komisi),
        nullableId(b.id_renstra),
        nullableId(b.id_sasaran),
        cleanString(b.tujuan_program),
        nullableId(b.id_organisasi_pemilik),
        nullableId(b.id_organisasi_pelaksana),
        nullableId(b.id_pic),
        cleanString(b.pic_teks),
        cleanString(b.prioritas) || 'Sedang',
        cleanString(b.kode_prioritas),
        b.tahun_target ? Number(b.tahun_target) : null,
        cleanString(b.tanggal_mulai),
        cleanString(b.tanggal_selesai),
        cleanString(b.jangka_waktu),
        cleanString(b.cakupan),
        cleanString(b.indikator),
        cleanString(b.baseline),
        cleanString(b.target),
        cleanString(b.realisasi_target),
        cleanString(b.satuan),
        cleanString(b.luaran),
        cleanString(b.hasil_dampak),
        cleanString(b.sumber_dana),
        toNumber(b.anggaran, 0),
        cleanString(b.status_program) || 'Draft',
        cleanString(b.iku_teks),
        b.skor_keselarasan_strategis !== null && b.skor_keselarasan_strategis !== undefined && b.skor_keselarasan_strategis !== ''
          ? toNumber(b.skor_keselarasan_strategis, 0)
          : null,
        cleanString(b.status_keselarasan),
        cleanString(b.catatan)
      );

      syncProgramRelations(
        id,
        Array.isArray(b.iku_ids) ? b.iku_ids : [],
        Array.isArray(b.sdg_ids) ? b.sdg_ids : [],
        Array.isArray(b.mitra_ids) ? b.mitra_ids : [],
        Array.isArray(b.organisasi_pendukung_ids) ? b.organisasi_pendukung_ids : []
      );
    });
    tx();
    res.status(201).json({ id_program: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/program-kerja/:id', (req, res) => {
  try {
    const b = req.body;
    const id = req.params.id;
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE program_kerja SET
          kode_program = ?, nama_program = ?, deskripsi = ?, komisi = ?,
          id_renstra = ?, id_sasaran = ?, tujuan_program = ?,
          id_organisasi_pemilik = ?, id_organisasi_pelaksana = ?, id_pic = ?, pic_teks = ?,
          prioritas = ?, kode_prioritas = ?, tahun_target = ?, tanggal_mulai = ?, tanggal_selesai = ?, jangka_waktu = ?, cakupan = ?,
          indikator = ?, baseline = ?, target = ?, realisasi_target = ?, satuan = ?,
          luaran = ?, hasil_dampak = ?, sumber_dana = ?, anggaran = ?,
          status_program = ?, iku_teks = ?, skor_keselarasan_strategis = ?, status_keselarasan = ?, catatan = ?
        WHERE id_program = ?
      `).run(
        cleanString(b.kode_program),
        cleanString(b.nama_program),
        cleanString(b.deskripsi),
        cleanString(b.komisi),
        nullableId(b.id_renstra),
        nullableId(b.id_sasaran),
        cleanString(b.tujuan_program),
        nullableId(b.id_organisasi_pemilik),
        nullableId(b.id_organisasi_pelaksana),
        nullableId(b.id_pic),
        cleanString(b.pic_teks),
        cleanString(b.prioritas) || 'Sedang',
        cleanString(b.kode_prioritas),
        b.tahun_target ? Number(b.tahun_target) : null,
        cleanString(b.tanggal_mulai),
        cleanString(b.tanggal_selesai),
        cleanString(b.jangka_waktu),
        cleanString(b.cakupan),
        cleanString(b.indikator),
        cleanString(b.baseline),
        cleanString(b.target),
        cleanString(b.realisasi_target),
        cleanString(b.satuan),
        cleanString(b.luaran),
        cleanString(b.hasil_dampak),
        cleanString(b.sumber_dana),
        toNumber(b.anggaran, 0),
        cleanString(b.status_program) || 'Draft',
        cleanString(b.iku_teks),
        b.skor_keselarasan_strategis !== null && b.skor_keselarasan_strategis !== undefined && b.skor_keselarasan_strategis !== ''
          ? toNumber(b.skor_keselarasan_strategis, 0)
          : null,
        cleanString(b.status_keselarasan),
        cleanString(b.catatan),
        id
      );

      syncProgramRelations(
        id,
        Array.isArray(b.iku_ids) ? b.iku_ids : [],
        Array.isArray(b.sdg_ids) ? b.sdg_ids : [],
        Array.isArray(b.mitra_ids) ? b.mitra_ids : [],
        Array.isArray(b.organisasi_pendukung_ids) ? b.organisasi_pendukung_ids : []
      );
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/program-kerja/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM program_kerja WHERE id_program = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// AKTIVITAS
// ==========================================
app.get('/api/aktivitas', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT a.*,
        p.nama_program,
        p.kode_program,
        ja.nama_jenis_aktivitas,
        prs.nama_personel as nama_pic,
        (SELECT COUNT(*) FROM pelaksanaan_kegiatan pk WHERE pk.id_aktivitas = a.id_aktivitas AND pk.status = 'Selesai') as realisasi_pelaksanaan,
        (SELECT COUNT(*) FROM pelaksanaan_kegiatan pk WHERE pk.id_aktivitas = a.id_aktivitas) as total_pelaksanaan
      FROM aktivitas a
      JOIN program_kerja p ON p.id_program = a.id_program
      LEFT JOIN jenis_aktivitas ja ON ja.id_jenis_aktivitas = a.id_jenis_aktivitas
      LEFT JOIN personel prs ON prs.id_personel = a.id_pic
      ORDER BY a.created_at DESC
    `)
    .all() as Array<Record<string, unknown>>;

  const enriched = rows.map((r) => {
    const targetF = Number(r.target_frekuensi || 0);
    const realisasi = Number(r.realisasi_pelaksanaan || 0);
    const persentase_capaian = targetF > 0 ? Number(((realisasi / targetF) * 100).toFixed(2)) : 0;
    return { ...r, persentase_capaian };
  });

  res.json(enriched);
});

app.post('/api/aktivitas', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_program) || !cleanString(b.nama_aktivitas)) {
      res.status(400).json({ error: 'Program Kerja dan Nama Aktivitas wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_aktivitas) || generateId('AKT');
    db.prepare(`
      INSERT INTO aktivitas (
        id_aktivitas, id_program, id_jenis_aktivitas, nama_aktivitas,
        pola_aktivitas, frekuensi, target_frekuensi, tanggal_mulai,
        tanggal_selesai, id_pic, status, keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_program),
      nullableId(b.id_jenis_aktivitas),
      cleanString(b.nama_aktivitas),
      cleanString(b.pola_aktivitas) || 'Sekali',
      cleanString(b.frekuensi),
      toNumber(b.target_frekuensi, 1),
      cleanString(b.tanggal_mulai),
      cleanString(b.tanggal_selesai),
      nullableId(b.id_pic),
      cleanString(b.status) || 'Direncanakan',
      cleanString(b.keterangan)
    );
    res.status(201).json({ id_aktivitas: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/aktivitas/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE aktivitas SET
        id_program = ?, id_jenis_aktivitas = ?, nama_aktivitas = ?,
        pola_aktivitas = ?, frekuensi = ?, target_frekuensi = ?,
        tanggal_mulai = ?, tanggal_selesai = ?, id_pic = ?, status = ?, keterangan = ?
      WHERE id_aktivitas = ?
    `).run(
      cleanString(b.id_program),
      nullableId(b.id_jenis_aktivitas),
      cleanString(b.nama_aktivitas),
      cleanString(b.pola_aktivitas) || 'Sekali',
      cleanString(b.frekuensi),
      toNumber(b.target_frekuensi, 1),
      cleanString(b.tanggal_mulai),
      cleanString(b.tanggal_selesai),
      nullableId(b.id_pic),
      cleanString(b.status) || 'Direncanakan',
      cleanString(b.keterangan),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/aktivitas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM aktivitas WHERE id_aktivitas = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// PELAKSANAAN KEGIATAN
// ==========================================
app.get('/api/pelaksanaan-kegiatan', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT pk.*,
        a.nama_aktivitas,
        a.id_program,
        p.nama_program,
        o.nama_organisasi as nama_organisasi_pelaksana,
        prs.nama_personel as nama_pic
      FROM pelaksanaan_kegiatan pk
      JOIN aktivitas a ON a.id_aktivitas = pk.id_aktivitas
      JOIN program_kerja p ON p.id_program = a.id_program
      LEFT JOIN organisasi o ON o.id_organisasi = pk.id_organisasi_pelaksana
      LEFT JOIN personel prs ON prs.id_personel = pk.id_pic
      ORDER BY pk.tanggal DESC, pk.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/pelaksanaan-kegiatan', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_aktivitas) || !cleanString(b.nama_pelaksanaan)) {
      res.status(400).json({ error: 'Aktivitas dan Nama Pelaksanaan wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_pelaksanaan) || generateId('PLK');
    db.prepare(`
      INSERT INTO pelaksanaan_kegiatan (
        id_pelaksanaan, id_aktivitas, nama_pelaksanaan, tanggal, lokasi,
        id_organisasi_pelaksana, id_pic, target_peserta, realisasi_peserta,
        status, luaran, catatan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_aktivitas),
      cleanString(b.nama_pelaksanaan),
      cleanString(b.tanggal),
      cleanString(b.lokasi),
      nullableId(b.id_organisasi_pelaksana),
      nullableId(b.id_pic),
      toNumber(b.target_peserta, 0),
      toNumber(b.realisasi_peserta, 0),
      cleanString(b.status) || 'Direncanakan',
      cleanString(b.luaran),
      cleanString(b.catatan)
    );
    res.status(201).json({ id_pelaksanaan: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/pelaksanaan-kegiatan/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE pelaksanaan_kegiatan SET
        id_aktivitas = ?, nama_pelaksanaan = ?, tanggal = ?, lokasi = ?,
        id_organisasi_pelaksana = ?, id_pic = ?, target_peserta = ?, realisasi_peserta = ?,
        status = ?, luaran = ?, catatan = ?
      WHERE id_pelaksanaan = ?
    `).run(
      cleanString(b.id_aktivitas),
      cleanString(b.nama_pelaksanaan),
      cleanString(b.tanggal),
      cleanString(b.lokasi),
      nullableId(b.id_organisasi_pelaksana),
      nullableId(b.id_pic),
      toNumber(b.target_peserta, 0),
      toNumber(b.realisasi_peserta, 0),
      cleanString(b.status) || 'Direncanakan',
      cleanString(b.luaran),
      cleanString(b.catatan),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/pelaksanaan-kegiatan/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pelaksanaan_kegiatan WHERE id_pelaksanaan = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// EVALUASI PROGRAM
// ==========================================
app.get('/api/evaluasi', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT e.*, p.nama_program
      FROM evaluasi_program e
      JOIN program_kerja p ON p.id_program = e.id_program
      ORDER BY e.tanggal_evaluasi DESC, e.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/evaluasi', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_program)) {
      res.status(400).json({ error: 'Program Kerja wajib dipilih.' });
      return;
    }
    const id = cleanString(b.id_evaluasi) || generateId('EVL');
    db.prepare(`
      INSERT INTO evaluasi_program (
        id_evaluasi, id_program, jenis_evaluasi, tanggal_evaluasi, id_evaluator, evaluator,
        skor_keselarasan_strategis, status_keselarasan, temuan, rekomendasi,
        status_evaluasi, tindak_lanjut, status_tindak_lanjut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_program),
      cleanString(b.jenis_evaluasi),
      cleanString(b.tanggal_evaluasi),
      nullableId(b.id_evaluator),
      cleanString(b.evaluator),
      toNumber(b.skor_keselarasan_strategis, 0),
      cleanString(b.status_keselarasan) || 'Selaras',
      cleanString(b.temuan),
      cleanString(b.rekomendasi),
      cleanString(b.status_evaluasi) || 'Draft',
      cleanString(b.tindak_lanjut),
      cleanString(b.status_tindak_lanjut) || 'Belum Ditindaklanjuti'
    );
    res.status(201).json({ id_evaluasi: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/evaluasi/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE evaluasi_program SET
        id_program = ?, jenis_evaluasi = ?, tanggal_evaluasi = ?, id_evaluator = ?, evaluator = ?,
        skor_keselarasan_strategis = ?, status_keselarasan = ?, temuan = ?, rekomendasi = ?,
        status_evaluasi = ?, tindak_lanjut = ?, status_tindak_lanjut = ?
      WHERE id_evaluasi = ?
    `).run(
      cleanString(b.id_program),
      cleanString(b.jenis_evaluasi),
      cleanString(b.tanggal_evaluasi),
      nullableId(b.id_evaluator),
      cleanString(b.evaluator),
      toNumber(b.skor_keselarasan_strategis, 0),
      cleanString(b.status_keselarasan) || 'Selaras',
      cleanString(b.temuan),
      cleanString(b.rekomendasi),
      cleanString(b.status_evaluasi) || 'Draft',
      cleanString(b.tindak_lanjut),
      cleanString(b.status_tindak_lanjut) || 'Belum Ditindaklanjuti',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/evaluasi/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM evaluasi_program WHERE id_evaluasi = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// KEPUTUSAN PROGRAM
// ==========================================
app.get('/api/keputusan', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT k.*, p.nama_program
      FROM keputusan_program k
      JOIN program_kerja p ON p.id_program = k.id_program
      ORDER BY k.tanggal_keputusan DESC, k.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/keputusan', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_program) || !cleanString(b.keputusan)) {
      res.status(400).json({ error: 'Program Kerja dan Keputusan wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_keputusan) || generateId('KPT');
    db.prepare(`
      INSERT INTO keputusan_program (id_keputusan, id_program, tanggal_keputusan, keputusan, catatan_keputusan, diputuskan_oleh)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_program),
      cleanString(b.tanggal_keputusan),
      cleanString(b.keputusan),
      cleanString(b.catatan_keputusan),
      cleanString(b.diputuskan_oleh)
    );
    res.status(201).json({ id_keputusan: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/keputusan/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE keputusan_program SET
        id_program = ?, tanggal_keputusan = ?, keputusan = ?, catatan_keputusan = ?, diputuskan_oleh = ?
      WHERE id_keputusan = ?
    `).run(
      cleanString(b.id_program),
      cleanString(b.tanggal_keputusan),
      cleanString(b.keputusan),
      cleanString(b.catatan_keputusan),
      cleanString(b.diputuskan_oleh),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/keputusan/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM keputusan_program WHERE id_keputusan = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// DOKUMEN & BUKTI CAPAIAN
// ==========================================
app.get('/api/dokumen', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT d.*, p.nama_program, pk.nama_pelaksanaan
      FROM dokumen_program d
      LEFT JOIN program_kerja p ON p.id_program = d.id_program
      LEFT JOIN pelaksanaan_kegiatan pk ON pk.id_pelaksanaan = d.id_pelaksanaan
      ORDER BY d.tanggal_dokumen DESC, d.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/dokumen', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.judul) || !cleanString(b.jenis_dokumen)) {
      res.status(400).json({ error: 'Judul dan Jenis Dokumen wajib diisi.' });
      return;
    }
    if (!nullableId(b.id_program) && !nullableId(b.id_pelaksanaan)) {
      res.status(400).json({ error: 'Dokumen harus dikaitkan dengan Program Kerja atau Pelaksanaan Kegiatan.' });
      return;
    }
    const id = cleanString(b.id_dokumen) || generateId('DOK');
    db.prepare(`
      INSERT INTO dokumen_program (
        id_dokumen, jenis_dokumen, judul, nomor_dokumen, tanggal_dokumen,
        tautan, deskripsi, id_program, id_pelaksanaan, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.jenis_dokumen),
      cleanString(b.judul),
      cleanString(b.nomor_dokumen),
      cleanString(b.tanggal_dokumen),
      cleanString(b.tautan),
      cleanString(b.deskripsi),
      nullableId(b.id_program),
      nullableId(b.id_pelaksanaan),
      cleanString(b.status) || 'Draft'
    );
    res.status(201).json({ id_dokumen: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/dokumen/:id', (req, res) => {
  try {
    const b = req.body;
    if (!nullableId(b.id_program) && !nullableId(b.id_pelaksanaan)) {
      res.status(400).json({ error: 'Dokumen harus dikaitkan dengan Program Kerja atau Pelaksanaan Kegiatan.' });
      return;
    }
    db.prepare(`
      UPDATE dokumen_program SET
        jenis_dokumen = ?, judul = ?, nomor_dokumen = ?, tanggal_dokumen = ?,
        tautan = ?, deskripsi = ?, id_program = ?, id_pelaksanaan = ?, status = ?
      WHERE id_dokumen = ?
    `).run(
      cleanString(b.jenis_dokumen),
      cleanString(b.judul),
      cleanString(b.nomor_dokumen),
      cleanString(b.tanggal_dokumen),
      cleanString(b.tautan),
      cleanString(b.deskripsi),
      nullableId(b.id_program),
      nullableId(b.id_pelaksanaan),
      cleanString(b.status) || 'Draft',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/dokumen/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM dokumen_program WHERE id_dokumen = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/bukti-capaian', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT bc.*, p.nama_program, pk.nama_pelaksanaan
      FROM bukti_capaian bc
      LEFT JOIN program_kerja p ON p.id_program = bc.id_program
      LEFT JOIN pelaksanaan_kegiatan pk ON pk.id_pelaksanaan = bc.id_pelaksanaan
      ORDER BY bc.tanggal_capaian DESC, bc.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/bukti-capaian', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.judul) || !cleanString(b.jenis_bukti)) {
      res.status(400).json({ error: 'Judul dan Jenis Bukti/Capaian wajib diisi.' });
      return;
    }
    if (!nullableId(b.id_program) && !nullableId(b.id_pelaksanaan)) {
      res.status(400).json({ error: 'Bukti/Capaian harus dikaitkan dengan Program Kerja atau Pelaksanaan Kegiatan.' });
      return;
    }
    const id = cleanString(b.id_bukti) || generateId('BKT');
    db.prepare(`
      INSERT INTO bukti_capaian (
        id_bukti, jenis_bukti, judul, tanggal_capaian, tautan,
        deskripsi, id_program, id_pelaksanaan, status_verifikasi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.jenis_bukti),
      cleanString(b.judul),
      cleanString(b.tanggal_capaian),
      cleanString(b.tautan),
      cleanString(b.deskripsi),
      nullableId(b.id_program),
      nullableId(b.id_pelaksanaan),
      cleanString(b.status_verifikasi) || 'Menunggu'
    );
    res.status(201).json({ id_bukti: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/bukti-capaian/:id', (req, res) => {
  try {
    const b = req.body;
    if (!nullableId(b.id_program) && !nullableId(b.id_pelaksanaan)) {
      res.status(400).json({ error: 'Bukti/Capaian harus dikaitkan dengan Program Kerja atau Pelaksanaan Kegiatan.' });
      return;
    }
    db.prepare(`
      UPDATE bukti_capaian SET
        jenis_bukti = ?, judul = ?, tanggal_capaian = ?, tautan = ?,
        deskripsi = ?, id_program = ?, id_pelaksanaan = ?, status_verifikasi = ?
      WHERE id_bukti = ?
    `).run(
      cleanString(b.jenis_bukti),
      cleanString(b.judul),
      cleanString(b.tanggal_capaian),
      cleanString(b.tautan),
      cleanString(b.deskripsi),
      nullableId(b.id_program),
      nullableId(b.id_pelaksanaan),
      cleanString(b.status_verifikasi) || 'Menunggu',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/bukti-capaian/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM bukti_capaian WHERE id_bukti = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// RISIKO PROGRAM
// ==========================================
app.get('/api/risiko', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT rp.*, p.nama_program, prs.nama_personel as nama_pic
      FROM risiko_program rp
      JOIN program_kerja p ON p.id_program = rp.id_program
      LEFT JOIN personel prs ON prs.id_personel = rp.id_pic
      ORDER BY rp.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/risiko', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_program) || !cleanString(b.risiko)) {
      res.status(400).json({ error: 'Program Kerja dan Uraian Risiko wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_risiko) || generateId('RSK');
    db.prepare(`
      INSERT INTO risiko_program (
        id_risiko, id_program, risiko, penyebab, dampak, tingkat_risiko, mitigasi, id_pic, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_program),
      cleanString(b.risiko),
      cleanString(b.penyebab),
      cleanString(b.dampak),
      cleanString(b.tingkat_risiko) || 'Sedang',
      cleanString(b.mitigasi),
      nullableId(b.id_pic),
      cleanString(b.status) || 'Teridentifikasi'
    );
    res.status(201).json({ id_risiko: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/risiko/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE risiko_program SET
        id_program = ?, risiko = ?, penyebab = ?, dampak = ?, tingkat_risiko = ?,
        mitigasi = ?, id_pic = ?, status = ?
      WHERE id_risiko = ?
    `).run(
      cleanString(b.id_program),
      cleanString(b.risiko),
      cleanString(b.penyebab),
      cleanString(b.dampak),
      cleanString(b.tingkat_risiko) || 'Sedang',
      cleanString(b.mitigasi),
      nullableId(b.id_pic),
      cleanString(b.status) || 'Teridentifikasi',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/risiko/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM risiko_program WHERE id_risiko = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// REALISASI ANGGARAN
// ==========================================
app.get('/api/realisasi-anggaran', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT ra.*, p.nama_program, pk.nama_pelaksanaan
      FROM realisasi_anggaran ra
      JOIN program_kerja p ON p.id_program = ra.id_program
      LEFT JOIN pelaksanaan_kegiatan pk ON pk.id_pelaksanaan = ra.id_pelaksanaan
      ORDER BY ra.tanggal DESC, ra.created_at DESC
    `)
    .all();
  res.json(rows);
});

app.post('/api/realisasi-anggaran', (req, res) => {
  try {
    const b = req.body;
    if (!cleanString(b.id_program) || !cleanString(b.uraian)) {
      res.status(400).json({ error: 'Program Kerja dan Uraian belanja wajib diisi.' });
      return;
    }
    const id = cleanString(b.id_realisasi) || generateId('ANG');
    db.prepare(`
      INSERT INTO realisasi_anggaran (
        id_realisasi, id_program, id_pelaksanaan, tanggal, uraian, kategori_belanja, jumlah, nomor_bukti, keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanString(b.id_program),
      nullableId(b.id_pelaksanaan),
      cleanString(b.tanggal),
      cleanString(b.uraian),
      cleanString(b.kategori_belanja),
      toNumber(b.jumlah, 0),
      cleanString(b.nomor_bukti),
      cleanString(b.keterangan)
    );
    res.status(201).json({ id_realisasi: id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/realisasi-anggaran/:id', (req, res) => {
  try {
    const b = req.body;
    db.prepare(`
      UPDATE realisasi_anggaran SET
        id_program = ?, id_pelaksanaan = ?, tanggal = ?, uraian = ?,
        kategori_belanja = ?, jumlah = ?, nomor_bukti = ?, keterangan = ?
      WHERE id_realisasi = ?
    `).run(
      cleanString(b.id_program),
      nullableId(b.id_pelaksanaan),
      cleanString(b.tanggal),
      cleanString(b.uraian),
      cleanString(b.kategori_belanja),
      toNumber(b.jumlah, 0),
      cleanString(b.nomor_bukti),
      cleanString(b.keterangan),
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/realisasi-anggaran/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM realisasi_anggaran WHERE id_realisasi = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ==========================================
// MANAJEMEN DATA: RECORD COUNTS, VALIDASI, EXPORT CSV, IMPORT CSV, BACKUP, RESET
// ==========================================
const ENTITY_TABLES: Record<string, { table: string; pk: string; label: string }> = {
  organisasi: { table: 'organisasi', pk: 'id_organisasi', label: 'Organisasi' },
  personel: { table: 'personel', pk: 'id_personel', label: 'Personel' },
  penugasan_jabatan: { table: 'penugasan_jabatan', pk: 'id_penugasan', label: 'Penugasan Jabatan' },
  jenis_aktivitas: { table: 'jenis_aktivitas', pk: 'id_jenis_aktivitas', label: 'Jenis Aktivitas' },
  mitra: { table: 'mitra', pk: 'id_mitra', label: 'Mitra' },
  iku: { table: 'iku', pk: 'id_iku', label: 'IKU' },
  sdgs: { table: 'sdgs', pk: 'id_sdg', label: 'SDGs' },
  renstra: { table: 'renstra', pk: 'id_renstra', label: 'Renstra' },
  sasaran_strategis: { table: 'sasaran_strategis', pk: 'id_sasaran', label: 'Sasaran Strategis' },
  program_kerja: { table: 'program_kerja', pk: 'id_program', label: 'Program Kerja' },
  aktivitas: { table: 'aktivitas', pk: 'id_aktivitas', label: 'Aktivitas' },
  pelaksanaan_kegiatan: { table: 'pelaksanaan_kegiatan', pk: 'id_pelaksanaan', label: 'Pelaksanaan Kegiatan' },
  evaluasi_program: { table: 'evaluasi_program', pk: 'id_evaluasi', label: 'Evaluasi Program' },
  keputusan_program: { table: 'keputusan_program', pk: 'id_keputusan', label: 'Keputusan Program' },
  dokumen_program: { table: 'dokumen_program', pk: 'id_dokumen', label: 'Dokumen' },
  bukti_capaian: { table: 'bukti_capaian', pk: 'id_bukti', label: 'Bukti/Capaian' },
  risiko_program: { table: 'risiko_program', pk: 'id_risiko', label: 'Risiko Program' },
  realisasi_anggaran: { table: 'realisasi_anggaran', pk: 'id_realisasi', label: 'Realisasi Anggaran' },
};

app.get('/api/data-management/summary', (_req, res) => {
  const summary = Object.entries(ENTITY_TABLES).map(([key, meta]) => {
    const count = (db.prepare(`SELECT COUNT(*) as c FROM ${meta.table}`).get() as { c: number }).c;
    return { key, label: meta.label, table: meta.table, count };
  });
  res.json(summary);
});

app.get('/api/data-management/validate', (_req, res) => {
  const issues: Array<{ level: 'peringatan' | 'kritis'; entity: string; message: string }> = [];

  const fkChecks = db.pragma('foreign_key_check') as Array<{ table: string; rowid: number; parent: string }>;
  for (const fk of fkChecks) {
    issues.push({
      level: 'kritis',
      entity: fk.table,
      message: `Pelanggaran relasi referensi ke tabel ${fk.parent} pada baris ${fk.rowid}.`,
    });
  }

  const programNoOrg = (
    db.prepare('SELECT COUNT(*) as c FROM program_kerja WHERE id_organisasi_pemilik IS NULL').get() as { c: number }
  ).c;
  if (programNoOrg > 0) {
    issues.push({
      level: 'peringatan',
      entity: 'Program Kerja',
      message: `${programNoOrg} Program Kerja belum memiliki Organisasi Pemilik.`,
    });
  }

  const programNoSasaran = (
    db.prepare('SELECT COUNT(*) as c FROM program_kerja WHERE id_sasaran IS NULL').get() as { c: number }
  ).c;
  if (programNoSasaran > 0) {
    issues.push({
      level: 'peringatan',
      entity: 'Program Kerja',
      message: `${programNoSasaran} Program Kerja belum dikaitkan dengan Sasaran Strategis.`,
    });
  }

  const orphanDokumen = (
    db.prepare('SELECT COUNT(*) as c FROM dokumen_program WHERE id_program IS NULL AND id_pelaksanaan IS NULL').get() as { c: number }
  ).c;
  if (orphanDokumen > 0) {
    issues.push({
      level: 'peringatan',
      entity: 'Dokumen',
      message: `${orphanDokumen} Dokumen tidak terhubung ke Program Kerja maupun Pelaksanaan Kegiatan.`,
    });
  }

  const orphanBukti = (
    db.prepare('SELECT COUNT(*) as c FROM bukti_capaian WHERE id_program IS NULL AND id_pelaksanaan IS NULL').get() as { c: number }
  ).c;
  if (orphanBukti > 0) {
    issues.push({
      level: 'peringatan',
      entity: 'Bukti/Capaian',
      message: `${orphanBukti} Bukti/Capaian tidak terhubung ke Program Kerja maupun Pelaksanaan Kegiatan.`,
    });
  }

  res.json({
    valid: issues.length === 0,
    checked_at: new Date().toISOString(),
    issues,
  });
});

app.get('/api/data-management/export-csv/:entity', (req, res) => {
  const meta = ENTITY_TABLES[req.params.entity];
  if (!meta) {
    res.status(404).json({ error: 'Entity tidak ditemukan.' });
    return;
  }
  const cols = db.prepare(`PRAGMA table_info(${meta.table})`).all() as Array<{ name: string }>;
  const headers = cols.map((c) => c.name);
  const rows = db.prepare(`SELECT * FROM ${meta.table}`).all() as Array<Record<string, unknown>>;

  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${meta.table}_fmipa_unm.csv"`);
  res.send(lines.join('\n'));
});

app.post('/api/data-management/import-csv/:entity', (req, res) => {
  const meta = ENTITY_TABLES[req.params.entity];
  if (!meta) {
    res.status(404).json({ error: 'Entity tidak ditemukan.' });
    return;
  }
  if (req.params.entity === 'sdgs') {
    res.status(400).json({ error: 'Master SDGs bersifat standar (1–17) dan tidak dapat ditambah via CSV.' });
    return;
  }
  const csvText = cleanString(req.body?.csv);
  if (!csvText) {
    res.status(400).json({ error: 'Konten CSV kosong.' });
    return;
  }

  try {
    const records = parseCsv(csvText);
    if (records.length === 0) {
      res.status(400).json({ error: 'Tidak ada baris data yang valid dalam CSV.' });
      return;
    }
    const colsInfo = db.prepare(`PRAGMA table_info(${meta.table})`).all() as Array<{ name: string }>;
    const validCols = new Set(colsInfo.map((c) => c.name));
    validCols.delete('created_at');

    let inserted = 0;
    const tx = db.transaction(() => {
      for (const rec of records) {
        const keys = Object.keys(rec).filter((k) => validCols.has(k));
        if (keys.length === 0) continue;
        if (!rec[meta.pk]) {
          rec[meta.pk] = generateId(meta.pk.slice(3, 6).toUpperCase());
          if (!keys.includes(meta.pk)) keys.unshift(meta.pk);
        }
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((k) => (rec[k] === '' && k.startsWith('id_') && k !== meta.pk ? null : rec[k]));
        db.prepare(`INSERT OR REPLACE INTO ${meta.table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
        inserted++;
      }
    });
    tx();
    res.json({ ok: true, imported: inserted });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/data-management/backup', (_req, res) => {
  const backup: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    application: 'Sistem Manajemen Program Kerja FMIPA UNM',
    data: {} as Record<string, unknown[]>,
  };
  const dataObj = backup.data as Record<string, unknown[]>;
  for (const [key, meta] of Object.entries(ENTITY_TABLES)) {
    dataObj[key] = db.prepare(`SELECT * FROM ${meta.table}`).all();
  }
  dataObj.program_iku = db.prepare('SELECT * FROM program_iku').all();
  dataObj.program_sdgs = db.prepare('SELECT * FROM program_sdgs').all();
  dataObj.program_mitra = db.prepare('SELECT * FROM program_mitra').all();
  dataObj.program_organisasi_pendukung = db.prepare('SELECT * FROM program_organisasi_pendukung').all();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="backup_fmipa_unm_${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

app.post('/api/data-management/reset', (req, res) => {
  const target = cleanString(req.body?.target);
  const confirmToken = cleanString(req.body?.confirm);
  if (confirmToken !== 'KONFIRMASI_HAPUS') {
    res.status(400).json({ error: 'Konfirmasi eksplisit diperlukan.' });
    return;
  }

  try {
    const tx = db.transaction(() => {
      if (target === 'transaksi_program') {
        db.exec(`
          DELETE FROM realisasi_anggaran;
          DELETE FROM risiko_program;
          DELETE FROM bukti_capaian;
          DELETE FROM dokumen_program;
          DELETE FROM keputusan_program;
          DELETE FROM evaluasi_program;
          DELETE FROM pelaksanaan_kegiatan;
          DELETE FROM aktivitas;
          DELETE FROM program_iku;
          DELETE FROM program_sdgs;
          DELETE FROM program_mitra;
          DELETE FROM program_organisasi_pendukung;
          DELETE FROM program_kerja;
        `);
      } else if (target === 'perencanaan_strategis') {
        db.exec(`
          UPDATE program_kerja SET id_renstra = NULL, id_sasaran = NULL;
          DELETE FROM sasaran_strategis;
          DELETE FROM renstra;
        `);
      } else if (ENTITY_TABLES[target] && target !== 'sdgs') {
        db.prepare(`DELETE FROM ${ENTITY_TABLES[target].table}`).run();
      } else {
        throw new Error('Target reset tidak valid atau tidak diizinkan.');
      }
    });
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/data-management/sync-master-csv', (_req, res) => {
  try {
    const report = importOfficialMasterCsv(db);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/data-management/sync-renstra-csv', (_req, res) => {
  try {
    const report = importRenstraAndSasaranCsv(db);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/data-management/sync-program-work-csv', (_req, res) => {
  try {
    const report = importProgramWork2027Csv(db);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer();
