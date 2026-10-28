import React from 'react';
import { UlilMartLogo, type UlilMartLogoProps } from './UlilMartLogo';
import { usePOS } from '../context/POSContext';

/** Toko yang memang bernama ULIL Mart memakai logo bawaannya; toko lain memakai nama sendiri. */
export const isUlilMartStore = (name?: string): boolean => /ulil\s*mart/i.test(name || '');

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'T';

/**
 * Logo toko: logo ULIL Mart hanya bila nama toko di Pengaturan memang "ULIL Mart".
 * Selain itu lencana inisial + nama toko (instalasi baru dari GitHub tetap netral).
 */
export const StoreLogo: React.FC<UlilMartLogoProps & { storeName?: string }> = ({ storeName, ...props }) => {
  const { settings } = usePOS();
  const name = (storeName ?? settings.storeName ?? '').trim();
  if (isUlilMartStore(name)) return <UlilMartLogo {...props} />;

  const label = name || 'Toko';
  const size = Number(props.height) || 36;
  const mark = (
    <span
      aria-hidden="true"
      data-store-initials
      className="inline-flex items-center justify-center rounded-xl bg-emerald-700 text-white font-black shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
    >
      {initialsOf(label)}
    </span>
  );
  if (props.variant === 'mark') {
    return (
      <span className={props.className} role="img" aria-label={label}>
        {mark}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 ${props.className || ''}`} role="img" aria-label={label}>
      {mark}
      <span className="font-black text-slate-900 dark:text-white leading-tight truncate" style={{ fontSize: Math.max(13, Math.round(size * 0.36)) }}>
        {label}
      </span>
    </span>
  );
};
