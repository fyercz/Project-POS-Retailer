import React from 'react';

/**
 * Pesan berwarna sesuai makna (5 warna bermakna). success/info/muted -> role="status" (diumumkan
 * sopan); warning/danger -> role="alert".
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const TONE: Record<StatusTone, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-rose-700 dark:text-rose-400',
  info: 'text-blue-600 dark:text-blue-400',
  muted: 'text-slate-600 dark:text-slate-400',
};

export function StatusText({ tone = 'muted', className = '', children }: { tone?: StatusTone; className?: string; children: React.ReactNode }) {
  return (
    <p role={tone === 'warning' || tone === 'danger' ? 'alert' : 'status'} className={`text-xs font-semibold ${TONE[tone]} ${className}`}>
      {children}
    </p>
  );
}
