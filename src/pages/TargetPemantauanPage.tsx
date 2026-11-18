import { useEffect, useState } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusText } from '../components/ui/StatusText';
import { api } from '../lib/api';
import { formatAngka, formatPersen } from '../lib/format';
import { type Aktivitas, type ProgramKerja } from '../types';

export function TargetPemantauanPage() {
  const [programs, setPrograms] = useState<ProgramKerja[]>([]);
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'aktivitas' | 'program'>('aktivitas');

  useEffect(() => {
    Promise.all([
      api.get<ProgramKerja[]>('/api/program-kerja'),
      api.get<Aktivitas[]>('/api/aktivitas'),
    ])
      .then(([prg, akt]) => {
        setPrograms(prg);
        setAktivitas(akt);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target dan Pemantauan"
        description="Pemantauan capaian target Program Kerja dan frekuensi realisasi Aktivitas berulang."
      />

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
        <button
          type="button"
          onClick={() => setTab('aktivitas')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === 'aktivitas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pemantauan Frekuensi Aktivitas ({aktivitas.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('program')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === 'program' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Target Kinerja Program Kerja ({programs.length})
        </button>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : tab === 'aktivitas' ? (
        aktivitas.length === 0 ? (
          <EmptyState
            title="Belum ada data Aktivitas untuk dipantau"
            description="Target frekuensi, realisasi pelaksanaan kegiatan, dan persentase capaian akan dihitung otomatis setelah Aktivitas dan Pelaksanaan Kegiatan tercatat."
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3">Aktivitas & Program Kerja</th>
                    <th className="px-4 py-3">Pola</th>
                    <th className="px-4 py-3 text-right">Target Kegiatan</th>
                    <th className="px-4 py-3 text-right">Realisasi (Selesai)</th>
                    <th className="px-4 py-3 text-right">Total Tercatat</th>
                    <th className="px-4 py-3 text-right">Capaian</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {aktivitas.map((a) => (
                    <tr key={a.id_aktivitas} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{a.nama_aktivitas}</div>
                        <div className="text-xs text-slate-500">{a.nama_program}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{a.pola_aktivitas}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatAngka(a.target_frekuensi)} kegiatan</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium">{formatAngka(a.realisasi_pelaksanaan || 0)} kegiatan</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">{formatAngka(a.total_pelaksanaan || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatPersen(a.persentase_capaian || 0)}
                      </td>
                      <td className="px-4 py-3"><StatusText value={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : programs.length === 0 ? (
        <EmptyState
          title="Belum ada Program Kerja untuk dipantau"
          description="Target, baseline, realisasi, dan luaran Program Kerja akan tampil di sini."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Program Kerja</th>
                  <th className="px-4 py-3">Indikator</th>
                  <th className="px-4 py-3 text-right">Baseline</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Realisasi</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {programs.map((p) => (
                  <tr key={p.id_program} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.nama_program}</td>
                    <td className="px-4 py-3 text-slate-600">{p.indikator || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{p.baseline || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{p.target ? `${p.target} ${p.satuan}`.trim() : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{p.realisasi_target ? `${p.realisasi_target} ${p.satuan}`.trim() : '—'}</td>
                    <td className="px-4 py-3"><StatusText value={p.status_program} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
