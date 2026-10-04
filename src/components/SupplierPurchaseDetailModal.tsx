import React, { useRef } from 'react';
import {
  X,
  Printer,
  Calendar,
  Building2,
  Clock,
  Tag,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SupplierPurchase, StoreSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { parsePaymentTermsInfo } from '../utils/paymentTermsHelper';
import { printViaIframe } from '../utils/printHelper';
import { UlilMartLogo } from './UlilMartLogo';

interface SupplierPurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: SupplierPurchase | null;
  settings: StoreSettings;
  onPrintPriceTags?: (purchase: SupplierPurchase) => void;
}

export const SupplierPurchaseDetailModal: React.FC<SupplierPurchaseDetailModalProps> = ({
  isOpen,
  onClose,
  purchase,
  settings,
  onPrintPriceTags,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !purchase) return null;

  const dueInfo = parsePaymentTermsInfo(purchase.createdAt, purchase.paymentTerms);
  const totalItemsCount = (purchase.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handlePrintDocument = (paper: 'a4' | '80mm') => {
    if (!printAreaRef.current) return;
    const content = printAreaRef.current.innerHTML;
    printViaIframe(content, `Faktur_${purchase.invoiceNumber}`, paper);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Nota Faktur Masuk #{purchase.invoiceNumber}
                </h3>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${dueInfo.badgeClasses.bg} ${dueInfo.badgeClasses.border} ${dueInfo.badgeClasses.text}`}
                >
                  {dueInfo.badgeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penerimaan stok masuk dari supplier: <strong className="text-slate-700 dark:text-slate-200">{purchase.supplierName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Printable Area Container */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Status Alert Banner according to Payment Terms */}
          {dueInfo.category === 'tempo' ? (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                dueInfo.urgency === 'overdue'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : dueInfo.urgency === 'urgent'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              }`}
            >
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>Nota Pembelian Tempo (Term of Payment - TOP)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-slate-900 font-bold border border-current shadow-2xs">
                    {dueInfo.statusBadgeText}
                  </span>
                </div>
                <p>
                  Faktur ini tercatat sebagai <strong>Utang Dagang Supplier (Akun 2010)</strong> senilai{' '}
                  <span className="font-mono font-bold">{formatCurrency(purchase.finalTotal ?? purchase.totalAmount, settings.currency)}</span>.
                  Jatuh tempo pelunasan: <strong>{dueInfo.dueDateFormatted}</strong>.
                </p>
              </div>
            </div>
          ) : dueInfo.category === 'consignment' ? (
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex items-start gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>Nota Titip Jual (Konsinyasi Supplier)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-slate-900 font-bold border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
                    Akun 2030 • Titip Jual
                  </span>
                </div>
                <p>
                  Stok barang ini adalah titipan supplier. <strong>Kas toko tidak berkurang saat barang masuk</strong>.
                  Kewajiban pembayaran diselesaikan secara periodik sesuai jumlah fisik yang laku terjual di meja kasir.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-bold">Pembayaran Tunai (Lunas Langsung): </span>
                Faktur ini telah dibayar tunai saat pengiriman barang masuk dan dicatat keluar dari laci kasir (Akun 1010).
              </div>
            </div>
          )}

          {/* Printable Invoice Sheet */}
          <div
            ref={printAreaRef}
            className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6 text-slate-800 dark:text-slate-200"
          >
            {/* Header Nota */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UlilMartLogo variant="mark" width={32} height={32} />
                  <div>
                    <h4 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                      {settings.storeName || 'ULIL Mart'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {settings.branchName || 'Cabang Parang, Magetan'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  {settings.address}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Telp: {settings.phone}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="inline-block px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                  FAKTUR PENERIMAAN BARANG
                </div>
                <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {purchase.invoiceNumber}
                </div>
                <div className="text-xs text-slate-500 flex sm:justify-end items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tanggal: {formatDate(purchase.createdAt)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Penerima: <span className="font-semibold text-slate-700 dark:text-slate-300">{purchase.receivedBy || 'Staff Gudang'}</span>
                </div>
              </div>
            </div>

            {/* Supplier & Commercial Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Distributor / Pemasok
                </span>
                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span>{purchase.supplierName}</span>
                </div>
                {purchase.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    Catatan: {purchase.notes}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Syarat & Ketentuan Pembayaran
                </span>
                <div className="font-bold text-slate-900 dark:text-white flex items-center sm:justify-end gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>{dueInfo.badgeLabel}</span>
                </div>
                {dueInfo.dueDateFormatted && dueInfo.category === 'tempo' && (
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Jatuh Tempo: {dueInfo.dueDateFormatted} ({dueInfo.statusBadgeText})
                  </div>
                )}
              </div>
            </div>

            {/* Item Table */}
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Rincian Barang Diterima ({purchase.items.length} Macam Barang, {totalItemsCount} pcs)</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Produk & Barcode</th>
                      <th className="py-2.5 px-3 text-center">Qty Masuk</th>
                      <th className="py-2.5 px-3 text-right">Harga Beli (HPP)</th>
                      <th className="py-2.5 px-3 text-center">Tgl Expired</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {purchase.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {item.productId}</div>
                        </td>
                        <td className="py-2 px-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatCurrency(item.costPrice, settings.currency)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                          {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.subtotal || item.quantity * item.costPrice, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Calculation */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              <div className="text-xs text-slate-500 max-w-sm space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">Catatan Validasi:</p>
                <p>{dueInfo.description}</p>
              </div>

              <div className="w-full sm:w-72 space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal Bruto:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(purchase.subtotal || purchase.totalAmount, settings.currency)}
                  </span>
                </div>

                {purchase.discountAmount && purchase.discountAmount > 0 ? (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Diskon Supplier ({purchase.discountRate || 0}%):</span>
                    <span className="font-mono font-semibold">
                      -{formatCurrency(purchase.discountAmount, settings.currency)}
                    </span>
                  </div>
                ) : null}

                {purchase.dppAmount ? (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>DPP (Dasar Pengenaan Pajak):</span>
                    <span className="font-mono">{formatCurrency(purchase.dppAmount, settings.currency)}</span>
                  </div>
                ) : null}

                {purchase.ppnAmount && purchase.ppnAmount > 0 ? (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>PPN ({purchase.ppnRate || 11}%):</span>
                    <span className="font-mono font-semibold">
                      +{formatCurrency(purchase.ppnAmount, settings.currency)}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                    {formatCurrency(purchase.finalTotal ?? purchase.totalAmount, settings.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
              <div>
                <p className="mb-14">Petugas Penerima (ULIL Mart):</p>
                <div className="border-b border-slate-400 dark:border-slate-600 w-44 mx-auto"></div>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                  ( {purchase.receivedBy || 'Staff Gudang / Kasir'} )
                </p>
              </div>
              <div>
                <p className="mb-14">Pengirim / Sales Distributor:</p>
                <div className="border-b border-slate-400 dark:border-slate-600 w-44 mx-auto"></div>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                  ( {purchase.supplierName} )
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {onPrintPriceTags && (
              <button
                type="button"
                onClick={() => {
                  onPrintPriceTags(purchase);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
              >
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Cetak Pricetag Rak ({purchase.items.length} Item)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrintDocument('80mm')}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
              title="Cetak struk penerimaan versi kasir (printer thermal)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Struk Thermal (80mm)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintDocument('a4')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              title="Cetak dokumen faktur lembar A4 resmi"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Faktur (A4 / F4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
