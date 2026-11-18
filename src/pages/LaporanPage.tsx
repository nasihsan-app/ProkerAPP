import { Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatAngka, formatPersen, formatRupiah } from '../lib/format';
import { type Aktivitas, type DashboardSummary, type ProgramKerja } from '../types';

export function LaporanPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardSummary>('/api/dashboard'),
      api.get<ProgramKerja[]>('/api/program-kerja'),
      api.get<Aktivitas[]>('/api/aktivitas'),
    ])
      .then(([s, p, a]) => {
        setSummary(s);
        setPrograms(p);
        setAktivitas(a);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Program Kerja"
        description="Rekapitulasi resmi perencanaan, realisasi anggaran, dan capaian aktivitas FMIPA UNM."
        extraActions={
          <div className="flex items-center gap-2 no-print">
            <a
              href="/api/data-management/export-csv/program_kerja"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unduh CSV Program Kerja</span>
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        }
      />

      {loading || !summary ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <>
          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Ringkasan Eksekutif</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Total Program Kerja</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">{formatAngka(summary.total_program)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Program Selesai / Berjalan</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                  {formatAngka(summary.program_selesai)} / {formatAngka(summary.program_berjalan)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Anggaran</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">{formatRupiah(summary.total_anggaran)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Realisasi Anggaran</div>
                <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                  {formatRupiah(summary.realisasi_anggaran)} ({formatPersen(summary.persentase_realisasi)})
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Laporan Daftar Program Kerja</h2>
            {programs.length === 0 ? (
              <EmptyState
                title="Belum ada data Program Kerja dalam laporan"
                description="Laporan akan otomatis menampilkan tabel rekapitulasi setelah Program Kerja dicatat."
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="px-4 py-3">Kode</th>
                        <th className="px-4 py-3">Nama Program</th>
                        <th className="px-4 py-3">Organisasi Pemilik</th>
                        <th className="px-4 py-3 text-right">Anggaran</th>
                        <th className="px-4 py-3 text-right">Realisasi</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {programs.map((p) => (
                        <tr key={p.id_program}>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.kode_program || p.id_program}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{p.nama_program}</td>
                          <td className="px-4 py-3 text-slate-600">{p.nama_organisasi_pemilik || '—'}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatRupiah(p.anggaran)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatRupiah(p.realisasi_anggaran || 0)}</td>
                          <td className="px-4 py-3"><StatusText value={p.status_program} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Laporan Capaian Frekuensi Aktivitas</h2>
            {aktivitas.length === 0 ? (
              <EmptyState
                title="Belum ada data Aktivitas dalam laporan"
                description="Capaian frekuensi pelaksanaan kegiatan per aktivitas akan tampil di sini."
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="px-4 py-3">Program Kerja</th>
                        <th className="px-4 py-3">Aktivitas</th>
                        <th className="px-4 py-3 text-right">Target</th>
                        <th className="px-4 py-3 text-right">Realisasi</th>
                        <th className="px-4 py-3 text-right">Capaian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aktivitas.map((a) => (
                        <tr key={a.id_aktivitas}>
                          <td className="px-4 py-3 text-slate-600">{a.nama_program}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{a.nama_aktivitas}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatAngka(a.target_frekuensi)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatAngka(a.realisasi_pelaksanaan || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{formatPersen(a.persentase_capaian || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
