import { Plus } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  extraActions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  extraActions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight text-balance">{title}</h1>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {extraActions}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
