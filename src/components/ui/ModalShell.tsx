import React from 'react';

/**
 * Kerangka modal standar: lapisan gelap fixed inset-0 + panel rounded-2xl shadow-xl dengan judul,
 * tombol "Tutup", isi bergulir, dan kaki. useGlobalDialogA11y otomatis menambahkan role="dialog",
 * aria-modal, label dari judul, perangkap fokus, dan Escape (tombol "Tutup").
 * Jangan menambahkan role="dialog" sendiri di panel (dulu menyebabkan dialog ganda).
 */
export interface ModalShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const WIDTH = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' };

export function ModalShell({ title, description, icon, onClose, footer, size = 'lg', children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3">
      <div className={`w-full ${WIDTH[size]} max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {icon}
              {title}
            </h3>
            {description && <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{description}</div>}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="shrink-0 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Tutup
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">{children}</div>
        {footer && <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
