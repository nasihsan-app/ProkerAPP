import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileEdit,
  MinusCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';

const GREEN_STATES = new Set([
  'Aktif',
  'Active',
  'Disetujui',
  'Selesai',
  'Sesuai Target',
  'Selaras',
  'Sangat Selaras',
  'Sangat selaras',
  'Terverifikasi',
  'Ditindaklanjuti',
  'Final',
  'Disahkan',
  'Terselesaikan',
  'Rendah',
]);

const AMBER_STATES = new Set([
  'Diajukan',
  'Berisiko',
  'Terlambat',
  'Ditunda',
  'Direvisi',
  'Digabung',
  'Cukup Selaras',
  'Cukup selaras',
  'Perlu Penyesuaian',
  'Menunggu',
  'Dalam Proses',
  'Sedang',
  'Dimitigasi',
  'Dipantau',
  'Belum Ditindaklanjuti',
  'Perlu Perbaikan',
]);

const BLUE_STATES = new Set(['Berjalan', 'Direncanakan', 'Teridentifikasi']);

const RED_STATES = new Set([
  'Dibatalkan',
  'Ditolak',
  'Nonaktif',
  'Inactive',
  'Tidak Selaras',
  'Tinggi',
  'Kritis',
]);

export function StatusText({ value }: { value: string | null | undefined }) {
  const label = (value ?? '').trim();
  if (!label) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (GREEN_STATES.has(label)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (RED_STATES.has(label)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (AMBER_STATES.has(label)) {
    const isWarning = label === 'Berisiko' || label === 'Terlambat' || label === 'Perlu Perbaikan';
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        {isWarning ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{label}</span>
      </span>
    );
  }

  if (BLUE_STATES.has(label)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 whitespace-nowrap">
        {label === 'Berjalan' ? (
          <PlayCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{label}</span>
      </span>
    );
  }

  if (label === 'Draft' || label === 'Arsip') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
        <FileEdit className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
