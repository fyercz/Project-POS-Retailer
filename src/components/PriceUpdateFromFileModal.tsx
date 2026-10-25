import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { readXlsx, type SheetData } from '../utils/xlsxReader';
import { planPriceUpdates, parseDelimitedText, type PriceUpdatePlan } from '../domain/priceUpdatePlan';
import { formatCurrency } from '../utils/formatters';

/**
 * Perbarui harga jual dari file (.xlsx / .csv), mis. lembar "Harga Rp0" / "Rugi & Impas" dari file
 * kerja Perbaikan_Data_Produk. Dicocokkan lewat barcode (cadangan SKU), ditinjau dulu, lalu hanya
 * yang dicentang diterapkan. Dulu impor ulang melewati barcode yang sudah ada sehingga harga tidak
 * bisa diperbarui massal.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PriceUpdateFromFileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { products, applyPriceUpdates, settings } = usePOS();
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFileName('');
    setSheets([]);
    setSheetIdx(0);
    setSelected(new Set());
    setOnlyWarnings(false);
    setMessage('');
    setError('');
  }, [isOpen]);

  const plan = useMemo<PriceUpdatePlan | { error: string } | null>(() => {
    const sheet = sheets[sheetIdx];
    return sheet ? planPriceUpdates(sheet.rows, products) : null;
  }, [sheets, sheetIdx, products]);

  useEffect(() => {
    if (plan && !('error' in plan)) setSelected(new Set(plan.changes.map((c) => c.productId)));
  }, [plan]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    setFileName(file.name);
    try {
      let list: SheetData[];
      if (/\.xlsx$/i.test(file.name)) list = readXlsx(await file.arrayBuffer());
      else if (/\.xls$/i.test(file.name)) throw new Error('Format .xls lama tidak didukung. Simpan ulang sebagai .xlsx atau .csv.');
      else list = [{ name: file.name, rows: parseDelimitedText(await file.text()) }];
      // Pilih otomatis lembar pertama yang punya kolom barcode & harga
      const first = list.findIndex((s) => !('error' in planPriceUpdates(s.rows, products)));
      setSheets(list);
      setSheetIdx(first >= 0 ? first : 0);
    } catch (err: unknown) {
      setSheets([]);
      setError(err instanceof Error ? err.message : 'Berkas tidak bisa dibaca.');
    }
  };

  if (!isOpen) return null;
  const ok = plan && !('error' in plan) ? plan : null;
  const rows = ok ? ok.changes.filter((c) => !onlyWarnings || c.warnings.length > 0) : [];
  const toApply = ok ? ok.changes.filter((c) => selected.has(c.productId)) : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" /> Perbarui Harga dari File
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Excel (.xlsx) atau CSV berisi kolom barcode (atau SKU) dan harga baru, mis. lembar &quot;Rugi &amp; Impas&quot; dari file
              kerja perbaikan harga (kolom &quot;Harga Dipakai&quot;). Tinjau dulu; hanya yang dicentang diterapkan dan tercatat di Riwayat Harga.
            </p>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">
            Tutup
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer">
              Pilih Berkas
              <input type="file" accept=".xlsx,.csv,.txt,.tsv" aria-label="Berkas harga" onChange={handleFile} className="hidden" />
            </label>
            {fileName && <span className="text-xs text-slate-600 dark:text-slate-300">{fileName}</span>}
            {sheets.length > 1 && (
              <select aria-label="Lembar" value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                {sheets.map((s, i) => (
                  <option key={s.name + i} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-400">{error}</p>}
          {plan && 'error' in plan && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-400">{plan.error}</p>}

          {ok && (
            <>
              <p role="status" className="text-xs text-slate-700 dark:text-slate-300">
                Kolom: <strong>{ok.keyColumn}</strong> → <strong>{ok.priceColumn}</strong>. {ok.changes.length} harga berubah, {ok.unchanged} sama,{' '}
                {ok.unmatched.length} tidak ditemukan di katalog, {ok.invalid.length} tidak valid.
              </p>
              {ok.changes.some((c) => c.warnings.length) && (
                <label className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                  <input type="checkbox" checked={onlyWarnings} onChange={(e) => setOnlyWarnings(e.target.checked)} />
                  Tampilkan hanya yang berperingatan ({ok.changes.filter((c) => c.warnings.length).length})
                </label>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="p-2 text-left">
                        <input
                          type="checkbox"
                          aria-label="Pilih semua"
                          checked={toApply.length === ok.changes.length && ok.changes.length > 0}
                          onChange={(e) => setSelected(e.target.checked ? new Set(ok.changes.map((c) => c.productId)) : new Set())}
                        />
                      </th>
                      <th className="p-2 text-left">Produk</th>
                      <th className="p-2 text-right">Harga lama</th>
                      <th className="p-2 text-right">Harga baru</th>
                      <th className="p-2 text-right">Modal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 500).map((c) => (
                      <tr key={c.productId} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            aria-label={`Terapkan harga ${c.name}`}
                            checked={selected.has(c.productId)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(c.productId);
                              else next.delete(c.productId);
                              setSelected(next);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</div>
                          {c.warnings.length > 0 && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {c.warnings.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono">{formatCurrency(c.oldPrice, settings.currency)}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatCurrency(c.newPrice, settings.currency)}</td>
                        <td className="p-2 text-right font-mono text-slate-500">{formatCurrency(c.costPrice, settings.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 500 && <p className="text-[11px] text-slate-500">Menampilkan 500 dari {rows.length} baris; semua yang dicentang tetap diterapkan.</p>}
            </>
          )}
          {message && <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{message}</p>}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">
            Batal
          </button>
          <button
            type="button"
            disabled={toApply.length === 0}
            onClick={() => {
              const n = applyPriceUpdates(
                toApply.map((c) => ({ productId: c.productId, newPrice: c.newPrice })),
                `File: ${fileName}${sheets.length > 1 ? ` (${sheets[sheetIdx]?.name})` : ''}`
              );
              if (n === 0) {
                setError('Tidak diterapkan: hanya Owner/Supervisor yang boleh memperbarui harga.');
                return;
              }
              setMessage(`${toApply.length} harga diperbarui dan dicatat di Riwayat Harga.`);
              setSelected(new Set());
            }}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
          >
            Terapkan {toApply.length} Perubahan Harga
          </button>
        </div>
      </div>
    </div>
  );
};
