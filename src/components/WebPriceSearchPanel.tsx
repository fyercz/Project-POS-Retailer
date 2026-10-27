import React, { useState } from 'react';
import { Globe, Landmark, Loader2, ExternalLink } from 'lucide-react';
import type { CompetitorPrice, Product } from '../types';
import { usePOS } from '../context/POSContext';
import { stapleCommodityOf, packSizeOf, type ValidatedPrice } from '../domain/webPriceResults';
import { formatCurrency } from '../utils/formatters';

/**
 * Cari harga pembanding di web dengan AI (Google Search):
 *  - "Cari harga di web": harga eceran produk di minimarket/supermarket online
 *  - "Harga acuan pemerintah": komoditas pokok dari situs .go.id (Panel Harga Bapanas, PIHPS BI)
 * Server hanya mengembalikan harga yang sumbernya terbukti muncul di hasil pencarian. Harga
 * baru dipakai setelah pengguna menekan "Pakai" (tidak ada yang tersimpan otomatis).
 */
interface Props {
  product?: Product;
  productName: string;
  onUse: (entry: CompetitorPrice) => void;
}

export const WebPriceSearchPanel: React.FC<Props> = ({ product, productName, onUse }) => {
  const { settings, updateSettings } = usePOS();
  const commodity = stapleCommodityOf(productName);
  const size = commodity ? packSizeOf(productName, commodity.unit) : null;
  const [region, setRegion] = useState(settings.priceRegion || settings.address || '');
  const [loading, setLoading] = useState<null | 'competitor' | 'official'>(null);
  const [results, setResults] = useState<{ mode: 'competitor' | 'official'; items: ValidatedPrice[]; discarded: number } | null>(null);
  const [error, setError] = useState('');

  const search = async (mode: 'competitor' | 'official') => {
    setLoading(mode);
    setError('');
    setResults(null);
    try {
      if (mode === 'official' && region.trim() && region.trim() !== settings.priceRegion) {
        updateSettings({ priceRegion: region.trim() });
      }
      const res = await fetch('/api/ai/price-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'official'
            ? { mode, commodity: commodity?.label, unit: commodity?.unit, region }
            : { mode, productName, brand: product?.brand, barcode: product?.barcode }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Server menjawab ${res.status}`);
      setResults({ mode, items: data.results || [], discarded: data.discarded || 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  };

  const toEntry = (r: ValidatedPrice, mode: 'competitor' | 'official'): CompetitorPrice => {
    const perPack = mode === 'official' && size ? Math.round(r.price * size) : r.price;
    return {
      competitorName: mode === 'official' ? `Acuan pemerintah (${r.domain})` : r.sourceName,
      price: perPack,
      isEstimate: false,
      origin: mode === 'official' ? 'official' : 'web_ai',
      sourceUrl: r.url,
      lastUpdated: r.observedAt,
      notes:
        mode === 'official'
          ? `Acuan pemerintah · ${r.domain}${r.region ? ` · ${r.region}` : ''} · ${r.observedAt}${size ? ` · Rp ${r.price.toLocaleString('id-ID')}/${commodity?.unit} x ${size}` : ''}`
          : `Dari web (AI) · ${r.domain} · ${r.observedAt}${r.note ? ` · ${r.note}` : ''}`,
    };
  };

  const btn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => search('competitor')}
          className={`${btn} border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}
        >
          {loading === 'competitor' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          Cari harga di web (AI)
        </button>
        {commodity && (
          <button
            type="button"
            disabled={loading !== null || !region.trim()}
            onClick={() => search('official')}
            className={`${btn} border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}
          >
            {loading === 'official' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
            Harga acuan pemerintah ({commodity.label})
          </button>
        )}
      </div>
      {commodity && (
        <label className="block text-[11px] text-slate-600 dark:text-slate-400">
          Wilayah harga acuan
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Mis. Kabupaten Magetan, Jawa Timur"
            className="mt-0.5 w-full px-2 py-1 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
      {results && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 space-y-1.5" role="status">
          {results.items.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {results.mode === 'official'
                ? 'Tidak ditemukan harga dari sumber pemerintah (.go.id) untuk wilayah ini.'
                : 'Tidak ditemukan harga dengan sumber yang bisa diverifikasi.'}
              {results.discarded > 0 && ` ${results.discarded} hasil AI dibuang karena sumbernya tidak terbukti.`}
            </p>
          ) : (
            results.items.map((r, i) => {
              const entry = toEntry(r, results.mode);
              return (
                <div key={`${r.domain}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatCurrency(entry.price)}
                      {results.mode === 'official' && (
                        <span className="font-normal text-slate-500">
                          {' '}
                          ({formatCurrency(r.price)}/{commodity?.unit}
                          {size ? ` x ${size}` : ', ukuran kemasan tidak terbaca'})
                        </span>
                      )}
                    </div>
                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 hover:underline truncate">
                      {r.domain}
                      {r.region ? ` · ${r.region}` : ''} · {r.observedAt}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUse(entry)}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                  >
                    Pakai
                  </button>
                </div>
              );
            })
          )}
          <p className="text-[11px] text-slate-500">
            Hasil dari pencarian AI: buka tautan untuk memastikan sebelum memakai. Harga online minimarket bisa berbeda dari harga rak.
          </p>
        </div>
      )}
    </div>
  );
};
