import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const baseControlClass =
  'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:border-slate-900 transition-colors disabled:bg-slate-100 disabled:text-slate-500';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseControlClass} ${props.className || ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseControlClass} ${props.className || ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseControlClass} ${props.className || ''}`} />;
}

export function FormActions({
  onCancel,
  saving,
  submitLabel = 'Simpan',
}: {
  onCancel: () => void;
  saving?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-slate-200">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        {saving ? 'Menyimpan...' : submitLabel}
      </button>
    </div>
  );
}
