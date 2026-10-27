import React from 'react';

/**
 * Tombol standar (DESIGN_SYSTEM.md). Varian:
 * - primary: aksi utama (Bayar, Simpan, Terapkan) — tulisan putih di emerald-700, hover emerald-800
 * - secondary: aksi pendamping (Batal, Tutup)
 * - danger: tindakan merusak (Hapus, Void)
 * - ghost: aksi ringan di dalam daftar/tabel
 * Dulu 6 versi tombol hijau berbeda; sebagian menyala ke emerald-500 saat hover (kontras 2,5:1).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-700 hover:bg-emerald-800 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700',
  secondary:
    'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:text-slate-400',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700',
  ghost: 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-400',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-8',
  md: 'px-4 py-2 text-xs sm:text-sm min-h-9',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', type = 'button', className = '', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    />
  );
});
