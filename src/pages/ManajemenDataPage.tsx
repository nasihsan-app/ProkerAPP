import { CheckCircle2, Download, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Field, Select, Textarea } from '../components/ui/FormFields';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../lib/api';
import { formatAngka } from '../lib/format';

interface EntitySummary {
  key: string;
  label: string;
  table: string;
  count: number;
}

interface ValidationResult {
  valid: boolean;
  checked_at: string;
  issues: Array<{ level: 'peringatan' | 'kritis'; entity: string; message: string }>;
}

export function ManajemenDataPage() {
  const [summary, setSummary] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importEntity, setImportEntity] = useState('organisasi');
  const [csvContent, setCsvContent] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ key: string; label: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      setSummary(await api.get<EntitySummary[]>('/api/data-management/summary'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleValidate = async () => {
    setProcessing(true);
    try {
      const res = await api.get<ValidationResult>('/api/data-management/validate');
      setValidation(res);
    } finally {
      setProcessing(false);
    }
  };

  const handleCsvFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvContent(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      setFeedback({ type: 'err', text: 'Pilih berkas CSV atau tempelkan isi CSV terlebih dahulu.' });
      return;
    }
    setProcessing(true);
    setFeedback(null);
    try {
      const res = await api.post<{ ok: boolean; imported: number }>(
        `/api/data-management/import-csv/${importEntity}`,
        { csv: csvContent }
      );
      setFeedback({ type: 'ok', text: `Berhasil mengimpor ${res.imported} baris ke ${importEntity}.` });
      setCsvContent('');
      await loadSummary();
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    setProcessing(true);
    setFeedback(null);
    try {
      await api.post('/api/data-management/reset', {
        target: resetTarget.key,
        confirm: 'KONFIRMASI_HAPUS',
      });
      setFeedback({ type: 'ok', text: `Data "${resetTarget.label}" telah berhasil direset.` });
      setResetTarget(null);
      await loadSummary();
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Data"
        description="Pemantauan jumlah record, ekspor/impor CSV, backup basis data, validasi relasi, dan reset data dengan konfirmasi."
        extraActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleValidate}
              disabled={processing}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Validasi Data</span>
            </button>
            <a
              href="/api/data-management/backup"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Backup Data (JSON)</span>
            </a>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-3.5 rounded-md border text-sm ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {validation && (
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Hasil Validasi Integritas Basis Data</h2>
            <span className="text-xs text-slate-500">Diperiksa: {new Date(validation.checked_at).toLocaleString('id-ID')}</span>
          </div>
          {validation.valid ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Seluruh relasi referensi (foreign key) dan kelengkapan data dalam kondisi valid.</span>
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {validation.issues.map((issue, idx) => (
                <li
                  key={idx}
                  className={`p-2.5 rounded border ${
                    issue.level === 'kritis'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <strong>{issue.entity}:</strong> {issue.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Tabel Jumlah Record & Export/Reset per Entity */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Jumlah Record per Entitas & Export CSV</h2>
          <button
            type="button"
            onClick={loadSummary}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse bg-slate-50" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Entitas</th>
                  <th className="px-4 py-3">Tabel Basis Data</th>
                  <th className="px-4 py-3 text-right">Jumlah Record</th>
                  <th className="px-4 py-3 text-right">Aksi Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.table}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatAngka(item.count)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={`/api/data-management/export-csv/${item.key}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                        >
                          <Download className="w-3 h-3" aria-hidden="true" />
                          <span>Export CSV</span>
                        </a>
                        {item.key !== 'sdgs' && item.count > 0 && (
                          <button
                            type="button"
                            onClick={() => setResetTarget({ key: item.key, label: item.label })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Import CSV */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Import Data CSV</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Target Entitas">
            <Select value={importEntity} onChange={(e) => setImportEntity(e.target.value)}>
              {summary
                .filter((s) => s.key !== 'sdgs')
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.table})
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Pilih Berkas CSV">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileUpload}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50"
            />
          </Field>
        </div>
        <Field label="Pratinjau / Tempel Konten CSV (baris pertama harus berisi nama kolom tabel)">
          <Textarea
            rows={4}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="kode_organisasi,nama_organisasi,jenis_organisasi,status"
            className="font-mono text-xs"
          />
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleImportCsv}
            disabled={processing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Import CSV ke Basis Data</span>
          </button>
        </div>
      </section>

      {/* Reset Terkelompok */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Reset Kelompok Data</h2>
        <p className="text-xs text-slate-600">
          Penghapusan data hanya dilakukan apabila pengguna mengonfirmasi secara eksplisit melalui dialog konfirmasi. Data master standar SDGs tidak pernah dihapus otomatis.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() =>
              setResetTarget({
                key: 'transaksi_program',
                label: 'Seluruh Data Transaksi Program Kerja (Program Kerja, Aktivitas, Pelaksanaan, Evaluasi, Keputusan, Dokumen, Bukti, Risiko, Realisasi Anggaran)',
              })
            }
            className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100"
          >
            Reset Transaksi Program Kerja
          </button>
          <button
            type="button"
            onClick={() =>
              setResetTarget({
                key: 'perencanaan_strategis',
                label: 'Seluruh Data Perencanaan Strategis (Renstra dan Sasaran Strategis)',
              })
            }
            className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100"
          >
            Reset Renstra & Sasaran Strategis
          </button>
        </div>
      </section>

      <ConfirmModal
        open={!!resetTarget}
        title="Konfirmasi Reset Data"
        message={`Anda akan menghapus seluruh data pada: ${resetTarget?.label}. Tindakan ini permanen dan tidak dapat dibatalkan.`}
        confirmLabel="Ya, Reset Data"
        loading={processing}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
