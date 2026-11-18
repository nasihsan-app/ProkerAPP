import { useEffect, useState } from 'react';
import { type RouteKey } from '../components/layout/AppShell';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../lib/api';
import { formatAngka, formatPersen, formatRupiah } from '../lib/format';
import { type DashboardSummary } from '../types';

function BreakdownSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: { label: string; count: number }[];
  emptyLabel: string;
}) {
  const max = items.reduce((acc, i) => Math.max(acc, i.count), 0);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-md">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-700 font-medium truncate">{item.label}</span>
                  <span className="font-mono tabular-nums text-slate-900 font-semibold shrink-0">
                    {formatAngka(item.count)}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate: (route: RouteKey) => void }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<DashboardSummary>('/api/dashboard')
      .then((res) => {
        if (mounted) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Program Kerja"
          description="Ringkasan perencanaan, pelaksanaan, anggaran, dan pemantauan program kerja FMIPA UNM."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-lg p-6 text-sm text-rose-700">
        Gagal memuat ringkasan dashboard: {error || 'Data tidak tersedia.'}
      </div>
    );
  }

  const programMetrics = [
    { label: 'Total Program Kerja', value: formatAngka(data.total_program), note: 'Seluruh program kerja terdaftar' },
    { label: 'Program Disetujui', value: formatAngka(data.program_disetujui), note: 'Status Disetujui' },
    { label: 'Program Berjalan', value: formatAngka(data.program_berjalan), note: 'Sedang dalam pelaksanaan' },
    { label: 'Program Selesai', value: formatAngka(data.program_selesai), note: 'Telah dituntaskan' },
    { label: 'Program Terlambat', value: formatAngka(data.program_terlambat), note: 'Melewati jadwal target' },
    { label: 'Program Berisiko', value: formatAngka(data.program_berisiko), note: 'Memerlukan perhatian khusus' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Program Kerja"
        description="Ringkasan langsung dari basis data Sistem Manajemen Program Kerja FMIPA UNM."
        actionLabel="Tambah Program Kerja"
        onAction={() => onNavigate('program-kerja')}
      />

      {/* Metrik Program Kerja */}
      <section aria-label="Ringkasan Status Program Kerja">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programMetrics.map((m) => (
            <div key={m.label} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="text-xs font-medium text-slate-500">{m.label}</div>
              <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                {m.value}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">{m.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrik Anggaran */}
      <section aria-label="Ringkasan Anggaran">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500">Total Anggaran</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
              {formatRupiah(data.total_anggaran)}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">Akumulasi alokasi anggaran Program Kerja</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500">Realisasi Anggaran</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
              {formatRupiah(data.realisasi_anggaran)}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">Total realisasi pengeluaran tercatat</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500">Persentase Realisasi</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
              {formatPersen(data.persentase_realisasi)}
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-slate-900 rounded-full transition-all"
                style={{ width: `${Math.min(100, data.persentase_realisasi)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Distribusi Program Kerja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownSection
          title="Program berdasarkan Status"
          items={data.by_status}
          emptyLabel="Belum ada Program Kerja terdaftar."
        />
        <BreakdownSection
          title="Program berdasarkan Prioritas"
          items={data.by_prioritas}
          emptyLabel="Belum ada Program Kerja terdaftar."
        />
        <BreakdownSection
          title="Program berdasarkan Organisasi"
          items={data.by_organisasi}
          emptyLabel="Belum ada Program Kerja yang dikaitkan dengan Organisasi."
        />
        <BreakdownSection
          title="Program berdasarkan IKU"
          items={data.by_iku}
          emptyLabel="Belum ada Program Kerja yang dikaitkan dengan IKU."
        />
      </div>

      <BreakdownSection
        title="Program berdasarkan SDGs"
        items={data.by_sdgs}
        emptyLabel="Belum ada Program Kerja yang berkontribusi terhadap SDGs."
      />

      {/* Ringkasan Entitas Basis Data */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Ringkasan Jumlah Record Basis Data</h2>
          <button
            type="button"
            onClick={() => onNavigate('manajemen-data')}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap"
          >
            Buka Manajemen Data
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Organisasi', count: data.counts.organisasi ?? 0 },
            { label: 'Personel', count: data.counts.personel ?? 0 },
            { label: 'Renstra', count: data.counts.renstra ?? 0 },
            { label: 'Sasaran Strategis', count: data.counts.sasaran_strategis ?? 0 },
            { label: 'Aktivitas', count: data.counts.aktivitas ?? 0 },
            { label: 'Pelaksanaan', count: data.counts.pelaksanaan_kegiatan ?? 0 },
            { label: 'Evaluasi', count: data.counts.evaluasi_program ?? 0 },
            { label: 'Keputusan', count: data.counts.keputusan_program ?? 0 },
            { label: 'Dokumen', count: data.counts.dokumen_program ?? 0 },
            { label: 'Bukti/Capaian', count: data.counts.bukti_capaian ?? 0 },
            { label: 'Risiko', count: data.counts.risiko_program ?? 0 },
            { label: 'SDGs (Standar)', count: data.counts.sdgs ?? 17 },
          ].map((c) => (
            <div key={c.label} className="border border-slate-200 rounded-md p-3 bg-slate-50/50">
              <div className="text-xs text-slate-500 truncate">{c.label}</div>
              <div className="text-lg font-semibold text-slate-900 font-mono tabular-nums mt-1">
                {formatAngka(c.count)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
