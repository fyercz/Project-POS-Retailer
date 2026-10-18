import type React from 'react';

/** Untuk elemen non-tombol yang bisa diklik (role="button"): Enter/Spasi = klik (WCAG 2.1.1). */
export function activateOnKey(e: React.KeyboardEvent<HTMLElement>): void {
  if (e.key === 'Enter' || e.key === ' ') {
    if (e.target !== e.currentTarget) return; // biarkan kontrol di dalamnya menangani tombolnya sendiri
    e.preventDefault();
    e.currentTarget.click();
  }
}
