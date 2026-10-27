import React, { useId } from 'react';

/** Kelas kolom isian standar: garis slate-500 (kontras >= 3:1), rounded-xl. */
export const inputClass =
  'w-full px-2.5 py-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 aria-[invalid=true]:border-rose-600';

/**
 * Label + kolom isian + keterangan + pesan galat. Anak (input/select/textarea) otomatis menerima
 * id, aria-describedby, dan aria-invalid; pesan galat berperan "alert".
 */
export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactElement<any>;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control = React.cloneElement(children, {
    id: children.props.id ?? id,
    'aria-describedby': [children.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : children.props['aria-invalid'],
  });
  return (
    <div>
      <label htmlFor={children.props.id ?? id} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
