import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Product } from '../types';

/**
 * Pilih produk dengan mengetik (nama, SKU, atau barcode), pengganti <select> yang berisi
 * seluruh katalog. Dengan belasan ribu produk, <select> biasa tidak bisa dipakai.
 * Pola combobox WAI-ARIA: panah atas/bawah untuk berpindah, Enter memilih, Escape menutup.
 * Barcode yang diketik/discan persis langsung terpilih.
 */
interface ProductPickerProps {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  ariaLabel: string;
  /** Hanya tampilkan produk yang memenuhi syarat ini (mis. stok > 0 untuk retur) */
  filter?: (p: Product) => boolean;
  placeholder?: string;
  /** Teks tambahan di tiap hasil (mis. "Stok: 5") */
  describe?: (p: Product) => string;
  required?: boolean;
  maxResults?: number;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  products,
  value,
  onChange,
  ariaLabel,
  filter,
  placeholder = 'Ketik nama, SKU, atau scan barcode...',
  describe,
  required,
  maxResults = 30,
}) => {
  const selected = useMemo(() => products.find((p) => p.id === value), [products, value]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const pool = useMemo(() => (filter ? products.filter(filter) : products), [products, filter]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool.slice(0, maxResults);
    const exact: Product[] = [];
    const starts: Product[] = [];
    const contains: Product[] = [];
    for (const p of pool) {
      const name = p.name.toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      if (barcode === q || sku === q) exact.push(p);
      else if (name.startsWith(q) || sku.startsWith(q) || barcode.startsWith(q)) starts.push(p);
      else if (name.includes(q) || sku.includes(q)) contains.push(p);
      if (exact.length + starts.length >= maxResults) break;
    }
    return [...exact, ...starts, ...contains].slice(0, maxResults);
  }, [pool, query, maxResults]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (p: Product) => {
    onChange(p.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation(); // tutup daftar saja, bukan jendela modal
      setOpen(false);
    }
  };

  const onInput = (text: string) => {
    setQuery(text);
    setOpen(true);
    // Barcode/SKU persis (mis. hasil scan) langsung terpilih
    const t = text.trim().toLowerCase();
    if (t.length >= 4) {
      const hit = pool.find((p) => (p.barcode || '').toLowerCase() === t);
      if (hit) choose(hit);
    }
  };

  const shown = open ? query : selected ? selected.name : query;

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
        aria-required={required || undefined}
        value={shown}
        placeholder={selected ? selected.name : placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full p-1.5 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      />
      {/* Nilai tersembunyi agar validasi 'required' formulir tetap berjalan */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
        />
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Hasil: ${ariaLabel}`}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md text-xs"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-slate-500">Tidak ada produk yang cocok.</li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={p.id === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-1.5 cursor-pointer ${
                  i === active ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''
                } ${p.id === value ? 'font-bold' : ''}`}
              >
                <div className="text-slate-900 dark:text-slate-100 truncate">{p.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {p.sku}
                  {p.barcode ? ` • ${p.barcode}` : ''}
                  {describe ? ` • ${describe(p)}` : ''}
                </div>
              </li>
            ))
          )}
          {results.length >= maxResults && (
            <li className="px-3 py-1.5 text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800">
              Menampilkan {maxResults} hasil teratas. Ketik lebih spesifik untuk mempersempit.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
