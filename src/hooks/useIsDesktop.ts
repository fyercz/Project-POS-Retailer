import { useEffect, useState } from 'react';

/** Batas lebar "md" Tailwind (768px): di atasnya tata letak desktop/tablet. */
const DESKTOP_QUERY = '(min-width: 768px)';

function matches(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof window.matchMedia === 'function') return window.matchMedia(DESKTOP_QUERY).matches;
  return (window.innerWidth || 1024) >= 768;
}

/**
 * true bila layar selebar desktop/tablet. Dipakai agar hanya SATU tata letak (desktop ATAU HP)
 * yang dirender. Sebelumnya keduanya dirender sekaligus dan salah satunya disembunyikan CSS,
 * sehingga seluruh katalog produk dibuat dua kali (beban ganda & ID HTML kembar).
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(matches);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return isDesktop;
}
