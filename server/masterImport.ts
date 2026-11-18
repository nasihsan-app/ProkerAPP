import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export interface MasterImportReport {
  organisasi_imported: number;
  personel_imported: number;
  penugasan_imported: number;
  valid_personel_relations: number;
  valid_organisasi_relations: number;
  valid_parent_organisasi_relations: number;
  errors: string[];
}

function parseCsvFile(filePath: string): Array<Record<string, string>> {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];
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

function mapOrganizationType(rawType: string): string {
  switch (rawType) {
    case 'University':
      return 'Universitas';
    case 'Faculty':
      return 'Fakultas';
    case 'Department':
      return 'Jurusan';
    case 'Study Program':
      return 'Program Studi';
    case 'Supporting Unit':
      return 'Unit Pendukung';
    case 'Laboratory':
      return 'Laboratorium';
    case 'Research Center':
      return 'Pusat Penelitian';
    case 'Quality Assurance Unit':
      return 'Unit Penjaminan Mutu';
    default:
      return rawType || 'Unit Lainnya';
  }
}

function mapStatus(rawStatus: string): string {
  if (rawStatus === 'Active') return 'Aktif';
  if (rawStatus === 'Inactive') return 'Nonaktif';
  return rawStatus;
}

export function importOfficialMasterCsv(db: Database.Database): MasterImportReport {
  const assetsDir = path.resolve(process.cwd(), 'public/assets/aistudio');
  const orgPath = path.join(assetsDir, 'Organization_c68f1807.csv');
  const personPath = path.join(assetsDir, 'Person_FMIPA_Import_212e5402.csv');
  const assignPath = path.join(assetsDir, 'Position_Assignment_FMIPA_Final_81af561d.csv');

  const errors: string[] = [];

  if (!fs.existsSync(orgPath) || !fs.existsSync(personPath) || !fs.existsSync(assignPath)) {
    throw new Error('Salah satu file CSV master data tidak ditemukan di public/assets/aistudio/.');
  }

  const orgRows = parseCsvFile(orgPath);
  const personRows = parseCsvFile(personPath);
  const assignRows = parseCsvFile(assignPath);

  const orgIds = new Set<string>();
  const personIds = new Set<string>();

  // Validasi awal Person_ID unik dan tidak kosong
  for (let i = 0; i < personRows.length; i++) {
    const pid = personRows[i]['Person_ID'];
    if (!pid) {
      errors.push(`Person baris ${i + 2}: Person_ID kosong.`);
    } else if (personIds.has(pid)) {
      errors.push(`Person baris ${i + 2}: Person_ID duplikat (${pid}).`);
    } else {
      personIds.add(pid);
    }
  }

  for (let i = 0; i < orgRows.length; i++) {
    const oid = orgRows[i]['Organization ID'];
    if (!oid) {
      errors.push(`Organization baris ${i + 2}: Organization ID kosong.`);
    } else if (orgIds.has(oid)) {
      errors.push(`Organization baris ${i + 2}: Organization ID duplikat (${oid}).`);
    } else {
      orgIds.add(oid);
    }
  }

  let validParentOrgRelations = 0;
  for (const r of orgRows) {
    const parentId = r['Parent Organization ID'];
    if (parentId) {
      if (orgIds.has(parentId)) {
        validParentOrgRelations++;
      } else {
        errors.push(`Organization ${r['Organization ID']}: Parent Organization ID '${parentId}' tidak ditemukan.`);
      }
    }
  }

  let validPersonRelations = 0;
  let validOrgRelations = 0;
  for (const r of assignRows) {
    const aid = r['Assignment_ID'];
    const pid = r['Person_ID'];
    const oid = r['Organization_ID'];
    if (personIds.has(pid)) {
      validPersonRelations++;
    } else {
      errors.push(`Assignment ${aid}: Person_ID '${pid}' tidak ditemukan di Master Personel.`);
    }
    if (orgIds.has(oid)) {
      validOrgRelations++;
    } else {
      errors.push(`Assignment ${aid}: Organization_ID '${oid}' tidak ditemukan di Master Organisasi.`);
    }
  }

  let orgInserted = 0;
  let personInserted = 0;
  let assignInserted = 0;

  const tx = db.transaction(() => {
    // 1. Import Organisasi (pass 1: insert dengan id_induk NULL agar urutan baris bebas; pass 2: set id_induk)
    const upsertOrg = db.prepare(`
      INSERT INTO organisasi (
        id_organisasi, kode_organisasi, nama_organisasi, jenis_organisasi,
        id_induk, nama_singkat, jenjang, status, berlaku_mulai,
        berlaku_sampai, akreditasi, sumber, id_pimpinan
      ) VALUES (?, ?, ?, ?, NULL, '', ?, ?, '', '', ?, ?, NULL)
      ON CONFLICT(id_organisasi) DO UPDATE SET
        kode_organisasi = excluded.kode_organisasi,
        nama_organisasi = excluded.nama_organisasi,
        jenis_organisasi = excluded.jenis_organisasi,
        jenjang = excluded.jenjang,
        status = excluded.status,
        akreditasi = excluded.akreditasi,
        sumber = excluded.sumber
    `);

    for (const r of orgRows) {
      const id = r['Organization ID'];
      if (!id) continue;
      upsertOrg.run(
        id,
        r['Organization Code'] || '',
        r['Organization Name'] || '',
        mapOrganizationType(r['Organization Type'] || ''),
        r['Degree Level'] || '',
        mapStatus(r['Status'] || 'Active'),
        r['Accreditation'] || '',
        r['Source'] || ''
      );
      orgInserted++;
    }

    const updateParent = db.prepare('UPDATE organisasi SET id_induk = ? WHERE id_organisasi = ?');
    for (const r of orgRows) {
      const id = r['Organization ID'];
      const parentId = r['Parent Organization ID'];
      if (!id) continue;
      updateParent.run(parentId && orgIds.has(parentId) ? parentId : null, id);
    }

    // 2. Import Personel (hanya Person_ID, NIP, Person_Name, Status)
    const upsertPerson = db.prepare(`
      INSERT INTO personel (id_personel, nip, nama_personel, status, email, nomor_telepon)
      VALUES (?, ?, ?, ?, '', '')
      ON CONFLICT(id_personel) DO UPDATE SET
        nip = excluded.nip,
        nama_personel = excluded.nama_personel,
        status = excluded.status
    `);

    for (const r of personRows) {
      const pid = r['Person_ID'];
      if (!pid) continue;
      upsertPerson.run(
        pid,
        String(r['NIP'] ?? ''),
        r['Person_Name'] || '',
        mapStatus(r['Status'] ?? '')
      );
      personInserted++;
    }

    // 3. Import Penugasan Jabatan
    const upsertAssign = db.prepare(`
      INSERT INTO penugasan_jabatan (
        id_penugasan, id_personel, id_organisasi, jabatan, status, berlaku_mulai, berlaku_sampai
      ) VALUES (?, ?, ?, ?, ?, '', '')
      ON CONFLICT(id_penugasan) DO UPDATE SET
        id_personel = excluded.id_personel,
        id_organisasi = excluded.id_organisasi,
        jabatan = excluded.jabatan,
        status = excluded.status
    `);

    for (const r of assignRows) {
      const aid = r['Assignment_ID'];
      const pid = r['Person_ID'];
      const oid = r['Organization_ID'];
      if (!aid || !personIds.has(pid) || !orgIds.has(oid)) continue;
      upsertAssign.run(
        aid,
        pid,
        oid,
        r['Position'] || '',
        mapStatus(r['Status'] || 'Active')
      );
      assignInserted++;
    }

    db.prepare(`
      INSERT INTO system_meta (key, value) VALUES ('master_csv_imported', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    `).run();
  });

  tx();

  return {
    organisasi_imported: orgInserted,
    personel_imported: personInserted,
    penugasan_imported: assignInserted,
    valid_personel_relations: validPersonRelations,
    valid_organisasi_relations: validOrgRelations,
    valid_parent_organisasi_relations: validParentOrgRelations,
    errors,
  };
}

export interface RenstraImportReport {
  renstra_imported: number;
  sasaran_imported: number;
  valid_renstra_relations: number;
  errors: string[];
  status: 'Berhasil' | 'Gagal';
}

export function importRenstraAndSasaranCsv(db: Database.Database): RenstraImportReport {
  const assetsDir = path.resolve(process.cwd(), 'public/assets/aistudio');
  const renstraPath = path.join(assetsDir, 'Renstra_a88752a1.csv');
  const sasaranPath = path.join(assetsDir, 'Sasaran_Strategis_f8481e98.csv');

  const errors: string[] = [];

  if (!fs.existsSync(renstraPath) || !fs.existsSync(sasaranPath)) {
    return {
      renstra_imported: 0,
      sasaran_imported: 0,
      valid_renstra_relations: 0,
      errors: ['File CSV Renstra atau Sasaran Strategis tidak ditemukan di public/assets/aistudio/.'],
      status: 'Gagal',
    };
  }

  const renstraRows = parseCsvFile(renstraPath);
  const sasaranRows = parseCsvFile(sasaranPath);

  const renstraIds = new Set<string>();
  for (let i = 0; i < renstraRows.length; i++) {
    const rid = renstraRows[i]['Renstra_ID'];
    if (!rid) {
      errors.push(`Renstra baris ${i + 2}: Renstra_ID kosong.`);
    } else if (renstraIds.has(rid)) {
      errors.push(`Renstra baris ${i + 2}: Duplikasi Renstra_ID '${rid}'.`);
    } else {
      renstraIds.add(rid);
    }
  }

  if (renstraRows.length !== 1) {
    errors.push(`Jumlah record Renstra harus 1, ditemukan ${renstraRows.length}.`);
  } else {
    const r0 = renstraRows[0];
    if (r0['Periode_Mulai'] !== '2024' || r0['Periode_Selesai'] !== '2028') {
      errors.push(`Periode Renstra tidak sesuai 2024–2028 (${r0['Periode_Mulai']}–${r0['Periode_Selesai']}).`);
    }
  }

  const sasaranIds = new Set<string>();
  let validRenstraRelations = 0;
  for (let i = 0; i < sasaranRows.length; i++) {
    const sid = sasaranRows[i]['Sasaran_ID'];
    const rid = sasaranRows[i]['Renstra_ID'];
    if (!sid) {
      errors.push(`Sasaran Strategis baris ${i + 2}: Sasaran_ID kosong.`);
    } else if (sasaranIds.has(sid)) {
      errors.push(`Sasaran Strategis baris ${i + 2}: Duplikasi Sasaran_ID '${sid}'.`);
    } else {
      sasaranIds.add(sid);
    }

    if (!rid || !renstraIds.has(rid)) {
      errors.push(`Sasaran Strategis '${sid}': Renstra_ID '${rid}' tidak ditemukan pada master Renstra.`);
    } else {
      validRenstraRelations++;
    }
  }

  if (sasaranRows.length !== 7) {
    errors.push(`Jumlah record Sasaran Strategis harus 7, ditemukan ${sasaranRows.length}.`);
  }

  if (errors.length > 0) {
    return {
      renstra_imported: 0,
      sasaran_imported: 0,
      valid_renstra_relations: validRenstraRelations,
      errors,
      status: 'Gagal',
    };
  }

  let renstraInserted = 0;
  let sasaranInserted = 0;

  const tx = db.transaction(() => {
    const upsertRenstra = db.prepare(`
      INSERT INTO renstra (
        id_renstra, nama_renstra, periode_mulai, periode_selesai, id_organisasi, visi, dokumen, status, keterangan
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, 'Aktif', '')
      ON CONFLICT(id_renstra) DO UPDATE SET
        nama_renstra = excluded.nama_renstra,
        periode_mulai = excluded.periode_mulai,
        periode_selesai = excluded.periode_selesai,
        visi = excluded.visi,
        dokumen = excluded.dokumen
    `);

    for (const r of renstraRows) {
      upsertRenstra.run(
        r['Renstra_ID'],
        r['Nama_Renstra'] || '',
        r['Periode_Mulai'] || '',
        r['Periode_Selesai'] || '',
        r['Visi'] || '',
        r['Sumber_Dokumen'] || ''
      );
      renstraInserted++;
    }

    const upsertSasaran = db.prepare(`
      INSERT INTO sasaran_strategis (
        id_sasaran, id_renstra, nomor, kode_sasaran, nama_sasaran,
        periode_mulai, periode_selesai, sumber, deskripsi, indikator, target, satuan, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', 'Aktif')
      ON CONFLICT(id_sasaran) DO UPDATE SET
        id_renstra = excluded.id_renstra,
        nomor = excluded.nomor,
        kode_sasaran = excluded.kode_sasaran,
        nama_sasaran = excluded.nama_sasaran,
        periode_mulai = excluded.periode_mulai,
        periode_selesai = excluded.periode_selesai,
        sumber = excluded.sumber
    `);

    for (const s of sasaranRows) {
      upsertSasaran.run(
        s['Sasaran_ID'],
        s['Renstra_ID'],
        s['Nomor'] || '',
        s['Nomor'] || '',
        s['Sasaran_Strategis'] || '',
        s['Periode_Mulai'] || '',
        s['Periode_Selesai'] || '',
        s['Sumber'] || ''
      );
      sasaranInserted++;
    }

    db.prepare(`
      INSERT INTO system_meta (key, value) VALUES ('renstra_sasaran_csv_imported', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    `).run();
  });

  tx();

  return {
    renstra_imported: renstraInserted,
    sasaran_imported: sasaranInserted,
    valid_renstra_relations: validRenstraRelations,
    errors: [],
    status: 'Berhasil',
  };
}

export interface ProgramWorkImportReport {
  programs_imported: number;
  sdg_links_created: number;
  valid_sasaran_relations: number;
  valid_org_relations: number;
  errors: string[];
  status: 'Berhasil' | 'Gagal';
}

function mapPriorityLevel(raw: string): 'Tinggi' | 'Sedang' | 'Rendah' {
  const val = raw.trim().toUpperCase();
  if (val === 'P1' || val === 'TINGGI') return 'Tinggi';
  if (val === 'P3' || val === 'RENDAH') return 'Rendah';
  return 'Sedang';
}

function mapProgramStatus(raw: string): string {
  const val = raw.trim();
  const lower = val.toLowerCase();
  if (lower === 'proposed') return 'Diajukan';
  if (lower === 'approved') return 'Disetujui';
  if (lower === 'draft') return 'Draft';
  if (lower === 'active' || lower === 'ongoing' || lower === 'running') return 'Berjalan';
  if (lower === 'completed' || lower === 'done') return 'Selesai';
  if (lower === 'cancelled' || lower === 'canceled') return 'Dibatalkan';
  return val || 'Draft';
}

export function importProgramWork2027Csv(db: Database.Database): ProgramWorkImportReport {
  const assetsDir = path.resolve(process.cwd(), 'public/assets/aistudio');
  const csvPath = path.join(assetsDir, 'Program_Work_FMIPA_2027_Import_06bf4c8f.csv');

  if (!fs.existsSync(csvPath)) {
    return {
      programs_imported: 0,
      sdg_links_created: 0,
      valid_sasaran_relations: 0,
      valid_org_relations: 0,
      errors: ['File CSV Program Kerja tidak ditemukan di public/assets/aistudio/Program_Work_FMIPA_2027_Import_06bf4c8f.csv.'],
      status: 'Gagal',
    };
  }

  const rows = parseCsvFile(csvPath);
  const errors: string[] = [];

  const sasaranRows = db.prepare('SELECT id_sasaran, id_renstra FROM sasaran_strategis').all() as Array<{
    id_sasaran: string;
    id_renstra: string;
  }>;
  const sasaranMap = new Map(sasaranRows.map((s) => [s.id_sasaran, s.id_renstra]));

  const orgRows = db.prepare('SELECT id_organisasi FROM organisasi').all() as Array<{ id_organisasi: string }>;
  const validOrgIds = new Set(orgRows.map((o) => o.id_organisasi));

  const sdgRows = db.prepare('SELECT id_sdg FROM sdgs').all() as Array<{ id_sdg: string }>;
  const validSdgIds = new Set(sdgRows.map((s) => s.id_sdg));

  const personelRows = db.prepare('SELECT id_personel, nama_personel FROM personel').all() as Array<{
    id_personel: string;
    nama_personel: string;
  }>;
  const personelByName = new Map(personelRows.map((p) => [p.nama_personel.trim().toLowerCase(), p.id_personel]));

  const seenProgramIds = new Set<string>();
  let validSasaranRelations = 0;
  let validOrgRelations = 0;

  const preparedRows = rows.map((r, idx) => {
    const lineNo = idx + 2;
    const idProgram = (r['Program_ID'] || '').trim();
    const namaProgram = (r['Program_Name'] || '').trim();
    const sasaranId = (r['Sasaran_ID'] || '').trim();
    const ownerOrgId = (r['Owner_Organization_ID'] || '').trim();

    if (!idProgram) {
      errors.push(`Baris ${lineNo}: Program_ID kosong.`);
    } else if (seenProgramIds.has(idProgram)) {
      errors.push(`Baris ${lineNo}: Duplikasi Program_ID '${idProgram}'.`);
    } else {
      seenProgramIds.add(idProgram);
    }

    if (!namaProgram) {
      errors.push(`Baris ${lineNo} (${idProgram}): Program_Name kosong.`);
    }

    let idRenstra: string | null = null;
    if (sasaranId) {
      const renstraId = sasaranMap.get(sasaranId);
      if (!renstraId) {
        errors.push(`Baris ${lineNo} (${idProgram}): Sasaran_ID '${sasaranId}' tidak ditemukan pada master Sasaran Strategis.`);
      } else {
        idRenstra = renstraId;
        validSasaranRelations++;
      }
    }

    if (ownerOrgId) {
      if (!validOrgIds.has(ownerOrgId)) {
        errors.push(`Baris ${lineNo} (${idProgram}): Owner_Organization_ID '${ownerOrgId}' tidak ditemukan pada master Organisasi.`);
      } else {
        validOrgRelations++;
      }
    }

    const sdgMatches = (r['SDGs'] || '').match(/\d+/g) || [];
    const sdgIds = [...new Set(sdgMatches.map((n) => `SDG-${String(Number(n)).padStart(2, '0')}`))];
    for (const sid of sdgIds) {
      if (!validSdgIds.has(sid)) {
        errors.push(`Baris ${lineNo} (${idProgram}): SDG '${sid}' tidak valid pada master SDGs.`);
      }
    }

    const picTeks = (r['PIC_Names'] || '').trim();
    const matchedPicId = personelByName.get(picTeks.toLowerCase()) ?? null;

    const rawBudget = (r['Budget'] || '').trim();
    const budgetNum = rawBudget ? Number(rawBudget.replace(/[^\d.-]/g, '')) : 0;

    const rawScore = (r['Strategic_Alignment_Score'] || '').trim();
    const scoreNum = rawScore && Number.isFinite(Number(rawScore)) ? Number(rawScore) : null;

    const rawYear = (r['Target_Year'] || '').trim();
    const targetYear = rawYear && Number.isFinite(Number(rawYear)) ? Number(rawYear) : null;

    return {
      id_program: idProgram,
      kode_program: (r['Program_Code'] || '').trim(),
      komisi: (r['Commission'] || '').trim(),
      nama_program: namaProgram,
      tujuan_program: (r['Objective'] || '').trim(),
      deskripsi: (r['Main_Activities'] || '').trim(),
      indikator: (r['Indicators_Target_2027'] || '').trim(),
      id_renstra: idRenstra,
      id_sasaran: sasaranId || null,
      sdg_ids: sdgIds,
      iku_teks: (r['IKU'] || '').trim(),
      id_pic: matchedPicId,
      pic_teks: picTeks,
      jangka_waktu: (r['Timeframe'] || '').trim(),
      tahun_target: targetYear,
      cakupan: (r['Scope'] || '').trim(),
      id_organisasi_pemilik: ownerOrgId || null,
      prioritas: mapPriorityLevel(r['Priority_Level'] || ''),
      kode_prioritas: (r['Priority_Level'] || '').trim(),
      skor_keselarasan_strategis: scoreNum,
      status_keselarasan: (r['Alignment_Status'] || '').trim(),
      status_program: mapProgramStatus(r['Status'] || ''),
      anggaran: Number.isFinite(budgetNum) ? budgetNum : 0,
      baseline: (r['Baseline'] || '').trim(),
    };
  });

  if (errors.length > 0) {
    return {
      programs_imported: 0,
      sdg_links_created: 0,
      valid_sasaran_relations: validSasaranRelations,
      valid_org_relations: validOrgRelations,
      errors,
      status: 'Gagal',
    };
  }

  let programsImported = 0;
  let sdgLinksCreated = 0;

  const tx = db.transaction(() => {
    const upsertProgram = db.prepare(`
      INSERT INTO program_kerja (
        id_program, kode_program, nama_program, deskripsi, komisi,
        id_renstra, id_sasaran, tujuan_program,
        id_organisasi_pemilik, id_organisasi_pelaksana, id_pic, pic_teks,
        prioritas, kode_prioritas, tahun_target, tanggal_mulai, tanggal_selesai, jangka_waktu, cakupan,
        indikator, baseline, target, realisasi_target, satuan, luaran, hasil_dampak,
        sumber_dana, anggaran, status_program, iku_teks,
        skor_keselarasan_strategis, status_keselarasan, catatan
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, NULL, ?, ?,
        ?, ?, ?, '', '', ?, ?,
        ?, ?, '', '', '', '', '',
        '', ?, ?, ?,
        ?, ?, ''
      )
      ON CONFLICT(id_program) DO UPDATE SET
        kode_program = excluded.kode_program,
        nama_program = excluded.nama_program,
        deskripsi = excluded.deskripsi,
        komisi = excluded.komisi,
        id_renstra = excluded.id_renstra,
        id_sasaran = excluded.id_sasaran,
        tujuan_program = excluded.tujuan_program,
        id_organisasi_pemilik = excluded.id_organisasi_pemilik,
        id_pic = COALESCE(excluded.id_pic, program_kerja.id_pic),
        pic_teks = excluded.pic_teks,
        prioritas = excluded.prioritas,
        kode_prioritas = excluded.kode_prioritas,
        tahun_target = excluded.tahun_target,
        jangka_waktu = excluded.jangka_waktu,
        cakupan = excluded.cakupan,
        indikator = excluded.indikator,
        baseline = excluded.baseline,
        anggaran = excluded.anggaran,
        status_program = excluded.status_program,
        iku_teks = excluded.iku_teks,
        skor_keselarasan_strategis = excluded.skor_keselarasan_strategis,
        status_keselarasan = excluded.status_keselarasan
    `);

    const delSdg = db.prepare('DELETE FROM program_sdgs WHERE id_program = ?');
    const insSdg = db.prepare('INSERT OR IGNORE INTO program_sdgs (id_program, id_sdg) VALUES (?, ?)');

    for (const p of preparedRows) {
      upsertProgram.run(
        p.id_program,
        p.kode_program,
        p.nama_program,
        p.deskripsi,
        p.komisi,
        p.id_renstra,
        p.id_sasaran,
        p.tujuan_program,
        p.id_organisasi_pemilik,
        p.id_pic,
        p.pic_teks,
        p.prioritas,
        p.kode_prioritas,
        p.tahun_target,
        p.jangka_waktu,
        p.cakupan,
        p.indikator,
        p.baseline,
        p.anggaran,
        p.status_program,
        p.iku_teks,
        p.skor_keselarasan_strategis,
        p.status_keselarasan
      );
      programsImported++;

      delSdg.run(p.id_program);
      for (const sdgId of p.sdg_ids) {
        insSdg.run(p.id_program, sdgId);
        sdgLinksCreated++;
      }
    }

    db.prepare(`
      INSERT INTO system_meta (key, value) VALUES ('program_work_2027_csv_imported', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    `).run();
  });

  tx();

  return {
    programs_imported: programsImported,
    sdg_links_created: sdgLinksCreated,
    valid_sasaran_relations: validSasaranRelations,
    valid_org_relations: validOrgRelations,
    errors: [],
    status: 'Berhasil',
  };
}
