import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Copy,
  Receipt,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  CreditCard,
  Building2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { printViaIframe, openPrintWindow, exportToCSV } from '../utils/printHelper';
import { Transaction, Product, SupplierPurchase, PurchaseReturn, SalesReturn } from '../types';

export type ReportType =
  | 'summary'
  | 'transactions'
  | 'products'
  | 'payments'
  | 'returns'
  | 'purchases';

export type PeriodFilter =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thismonth'
  | 'all';

export type PaperFormat = 'a4' | '80mm' | '58mm';

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: ReportType;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'summary',
}) => {
  const {
    transactions,
    salesReturns,
    products,
    suppliers,
    supplierPurchases,
    purchaseReturns,
    settings,
    activeEmployee,
  } = usePOS();

  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('a4');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  // Filter date helper
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const last7DaysStart = todayStart - 6 * 86400000;
  const last30DaysStart = todayStart - 29 * 86400000;
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const isDateInPeriod = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    switch (period) {
      case 'today':
        return time >= todayStart;
      case 'yesterday':
        return time >= yesterdayStart && time < todayStart;
      case 'last7days':
        return time >= last7DaysStart;
      case 'last30days':
        return time >= last30DaysStart;
      case 'thismonth':
        return time >= thisMonthStart;
      case 'all':
      default:
        return true;
    }
  };

  const periodLabel = {
    today: 'Hari Ini (' + new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' }) + ')',
    yesterday: 'Kemarin (' + new Date(Date.now() - 86400000).toLocaleDateString('id-ID', { dateStyle: 'medium' }) + ')',
    last7days: '7 Hari Terakhir',
    last30days: '30 Hari Terakhir',
    thismonth: 'Bulan Ini (' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + ')',
    all: 'Semua Periode',
  }[period];

  // Filtered dataset
  const filteredTransactions = transactions
    .filter((t) => t.status === 'completed' && isDateInPeriod(t.createdAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredSalesReturns = salesReturns.filter((r) => isDateInPeriod(r.createdAt));
  const filteredSupplierPurchases = supplierPurchases.filter((p) => isDateInPeriod(p.createdAt));
  const filteredPurchaseReturns = purchaseReturns.filter((r) => isDateInPeriod(r.createdAt));

  // Calculations
  const grossSales = filteredTransactions.reduce((sum, t) => sum + t.finalTotal, 0);
  const totalSubtotal = filteredTransactions.reduce((sum, t) => sum + t.subtotal, 0);
  const totalDiscounts = filteredTransactions.reduce((sum, t) => sum + t.discountAmount, 0);
  const totalRefundAmount = filteredSalesReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const netSales = Math.max(0, grossSales - totalRefundAmount);

  let totalCOGS = 0;
  let totalUnitsSold = 0;
  filteredTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      totalUnitsSold += item.quantity;
      totalCOGS += (item.product.costPrice || 0) * item.quantity;
    });
  });
  const grossProfit = Math.max(0, grossSales - totalCOGS);
  const profitMargin = grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : '0';

  // Payment Breakdown
  const paymentBreakdown = {
    cash: filteredTransactions.filter((t) => t.payment.method === 'cash').reduce((s, t) => s + t.finalTotal, 0),
    qris: filteredTransactions.filter((t) => t.payment.method === 'qris').reduce((s, t) => s + t.finalTotal, 0),
    card: filteredTransactions.filter((t) => t.payment.method === 'card').reduce((s, t) => s + t.finalTotal, 0),
    transfer: filteredTransactions.filter((t) => t.payment.method === 'transfer').reduce((s, t) => s + t.finalTotal, 0),
  };

  // Product stats
  const productStatsMap: Record<
    string,
    { id: string; name: string; sku: string; category: string; quantity: number; revenue: number; cogs: number; profit: number }
  > = {};

  filteredTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      if (!productStatsMap[item.product.id]) {
        productStatsMap[item.product.id] = {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          category: item.product.categoryId,
          quantity: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
      }
      const itemCOGS = (item.product.costPrice || 0) * item.quantity;
      productStatsMap[item.product.id].quantity += item.quantity;
      productStatsMap[item.product.id].revenue += item.totalPrice;
      productStatsMap[item.product.id].cogs += itemCOGS;
      productStatsMap[item.product.id].profit += item.totalPrice - itemCOGS;
    });
  });

  const sortedProductStats = Object.values(productStatsMap).sort((a, b) => b.revenue - a.revenue);

  // Generate HTML for printable document
  const generateReportHTML = () => {
    const isThermal = paperFormat === '58mm' || paperFormat === '80mm';
    const reportTitleMap = {
      summary: 'LAPORAN IKHTISAR PENJUALAN & LABA KOTOR',
      transactions: 'LAPORAN RINCIAN TRANSAKSI PENJUALAN KASIR',
      products: 'LAPORAN PENJUALAN & KINERJA PRODUK',
      payments: 'LAPORAN REKONSILIASI METODE PEMBAYARAN',
      returns: 'LAPORAN RETUR PENJUALAN & DISKON',
      purchases: 'LAPORAN PEMBELIAN & PENERIMAAN SUPPLIER',
      shifts: 'LAPORAN REKAPITULASI SHIFT KASIR',
    };

    const activeReportTitle = reportTitleMap[reportType];
    const printedAt = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    if (isThermal) {
      // Thermal Slip Layout
      return `
        <div style="font-family: monospace; font-size: 11px; line-height: 1.3; color: #000;">
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${settings.storeName}</div>
            <div>${settings.branchName}</div>
            <div style="font-size: 9px;">${settings.address}</div>
            <div style="font-size: 9px;">Telp: ${settings.phone}</div>
          </div>

          <div style="text-align: center; font-weight: bold; margin: 6px 0; font-size: 11px;">
            ${activeReportTitle}
          </div>

          <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; font-size: 10px;">
            <div>Periode: ${periodLabel}</div>
            <div>Dicetak: ${printedAt}</div>
            <div>Kasir/Petugas: ${activeEmployee?.name || 'Admin'}</div>
          </div>

          <!-- Thermal Metrics Summary -->
          <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Transaksi:</span>
              <span style="font-weight: bold;">${filteredTransactions.length} Struk</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Item Terjual:</span>
              <span style="font-weight: bold;">${totalUnitsSold} Pcs</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Total Omzet:</span>
              <span style="font-weight: bold;">${formatCurrency(grossSales, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Total Diskon:</span>
              <span>${formatCurrency(totalDiscounts, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Total Retur:</span>
              <span>${formatCurrency(totalRefundAmount, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dotted #000; margin-top: 4px; padding-top: 2px;">
              <span>Penjualan Bersih:</span>
              <span>${formatCurrency(netSales, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>HPP Modal:</span>
              <span>${formatCurrency(totalCOGS, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Laba Kotor:</span>
              <span>${formatCurrency(grossProfit, settings.currency)} (${profitMargin}%)</span>
            </div>
          </div>

          <!-- Method Breakdown Thermal -->
          <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-weight: bold; margin-bottom: 4px;">Metode Pembayaran:</div>
            <div style="display: flex; justify-content: space-between;">
              <span>Tunai (Cash):</span>
              <span>${formatCurrency(paymentBreakdown.cash, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>QRIS / E-Wallet:</span>
              <span>${formatCurrency(paymentBreakdown.qris, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Mesin EDC:</span>
              <span>${formatCurrency(paymentBreakdown.card, settings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Transfer Bank:</span>
              <span>${formatCurrency(paymentBreakdown.transfer, settings.currency)}</span>
            </div>
          </div>

          <!-- Top Products in Thermal -->
          ${
            sortedProductStats.length > 0
              ? `
            <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
              <div style="font-weight: bold; margin-bottom: 4px;">Top Produk Terlaris:</div>
              ${sortedProductStats
                .slice(0, 5)
                .map(
                  (p, idx) => `
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">
                    ${idx + 1}. ${p.name}
                  </span>
                  <span>${p.quantity}x • ${formatCurrency(p.revenue, settings.currency)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }

          <div style="text-align: center; font-size: 10px; margin-top: 10px;">
            <div>*** LAPORAN RESMI POS ***</div>
            <div>Simpan rekapitulasi ini untuk arsip pembukuan</div>
          </div>
        </div>
      `;
    }

    // Standard A4 / Letter Document Layout
    return `
      <div style="max-width: 900px; margin: 0 auto; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Official Header & Store Logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0;">
              ${settings.storeName}
            </h1>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">
              ${settings.branchName} • ${settings.address}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              Telp: ${settings.phone} | Email: info@${settings.storeName.toLowerCase().replace(/\s+/g, '')}.com
            </div>
          </div>

          <div style="text-align: right;">
            <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #0f172a;">
              DOKUMEN LAPORAN INTERNAL
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Ref ID: RPT-${Date.now().toString().slice(-8)}
            </div>
          </div>
        </div>

        <!-- Document Metadata -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
              ${activeReportTitle}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              Periode Analisis: <strong>${periodLabel}</strong>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Waktu Cetak: <strong>${printedAt}</strong></div>
            <div>Dicetak Oleh: <strong>${activeEmployee?.name || 'Administrator'} (${activeEmployee?.roleTitle || 'Head POS'})</strong></div>
          </div>
        </div>

        <!-- Executive KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Omzet Kotor</div>
            <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 2px;">${formatCurrency(grossSales, settings.currency)}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${filteredTransactions.length} Struk • ${totalUnitsSold} Pcs</div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Diskon & Retur</div>
            <div style="font-size: 16px; font-weight: 800; color: #d97706; margin-top: 2px;">${formatCurrency(totalDiscounts + totalRefundAmount, settings.currency)}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Retur: ${formatCurrency(totalRefundAmount, settings.currency)}</div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Penjualan Bersih</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formatCurrency(netSales, settings.currency)}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">HPP Modal: ${formatCurrency(totalCOGS, settings.currency)}</div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Estimasi Laba Kotor</div>
            <div style="font-size: 16px; font-weight: 800; color: #0d9488; margin-top: 2px;">${formatCurrency(grossProfit, settings.currency)}</div>
            <div style="font-size: 10px; color: #0d9488; font-weight: 600; margin-top: 2px;">Margin: ${profitMargin}%</div>
          </div>
        </div>

        <!-- Detail Table Depending on Report Type -->
        ${
          reportType === 'transactions' || reportType === 'summary'
            ? `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>Daftar Transaksi Selesai (${filteredTransactions.length} Data)</span>
              <span style="font-size: 11px; font-weight: normal; color: #64748b;">Urutan Waktu Terbaru</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 6px 8px; text-align: left;">No. Faktur</th>
                  <th style="padding: 6px 8px; text-align: left;">Waktu</th>
                  <th style="padding: 6px 8px; text-align: left;">Kasir</th>
                  <th style="padding: 6px 8px; text-align: left;">Pelanggan</th>
                  <th style="padding: 6px 8px; text-align: center;">Metode</th>
                  <th style="padding: 6px 8px; text-align: right;">Subtotal</th>
                  <th style="padding: 6px 8px; text-align: right;">Diskon</th>
                  <th style="padding: 6px 8px; text-align: right;">Total Akhir</th>
                </tr>
              </thead>
              <tbody>
                ${
                  filteredTransactions.length > 0
                    ? filteredTransactions
                        .map(
                          (t) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #0f172a;">${t.invoiceNumber}</td>
                      <td style="padding: 6px 8px; color: #475569;">${new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style="padding: 6px 8px; color: #475569;">${t.cashierName}</td>
                      <td style="padding: 6px 8px; color: #475569;">${t.customer?.name || 'Umum'}</td>
                      <td style="padding: 6px 8px; text-align: center;">
                        <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
                          ${t.payment.method}
                        </span>
                      </td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${formatCurrency(t.subtotal, settings.currency)}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #d97706;">${t.discountAmount > 0 ? formatCurrency(t.discountAmount, settings.currency) : '-'}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #059669;">${formatCurrency(t.finalTotal, settings.currency)}</td>
                    </tr>
                  `
                        )
                        .join('')
                    : `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #94a3b8;">Tidak ada data transaksi pada periode ini.</td></tr>`
                }
              </tbody>
              ${
                filteredTransactions.length > 0
                  ? `
                <tfoot>
                  <tr style="background: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: bold;">
                    <td colspan="5" style="padding: 8px; text-align: right;">TOTAL:</td>
                    <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(totalSubtotal, settings.currency)}</td>
                    <td style="padding: 8px; text-align: right; font-family: monospace; color: #d97706;">${formatCurrency(totalDiscounts, settings.currency)}</td>
                    <td style="padding: 8px; text-align: right; font-family: monospace; color: #059669;">${formatCurrency(grossSales, settings.currency)}</td>
                  </tr>
                </tfoot>
              `
                  : ''
              }
            </table>
          </div>
        `
            : ''
        }

        ${
          reportType === 'products' || reportType === 'summary'
            ? `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
              Performa Penjualan Produk & Kontribusi Margin
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 6px 8px; text-align: left;">Nama Produk</th>
                  <th style="padding: 6px 8px; text-align: left;">SKU</th>
                  <th style="padding: 6px 8px; text-align: left;">Kategori</th>
                  <th style="padding: 6px 8px; text-align: right;">Qty Terjual</th>
                  <th style="padding: 6px 8px; text-align: right;">Total Omzet</th>
                  <th style="padding: 6px 8px; text-align: right;">Total HPP</th>
                  <th style="padding: 6px 8px; text-align: right;">Laba Kotor</th>
                </tr>
              </thead>
              <tbody>
                ${
                  sortedProductStats.length > 0
                    ? sortedProductStats
                        .map(
                          (p) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${p.name}</td>
                      <td style="padding: 6px 8px; font-family: monospace; color: #64748b;">${p.sku}</td>
                      <td style="padding: 6px 8px; color: #64748b;">${p.category}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">${p.quantity}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${formatCurrency(p.revenue, settings.currency)}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #64748b;">${formatCurrency(p.cogs, settings.currency)}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #0d9488;">${formatCurrency(p.profit, settings.currency)}</td>
                    </tr>
                  `
                        )
                        .join('')
                    : `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #94a3b8;">Belum ada data penjualan produk.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        ${
          reportType === 'payments' || reportType === 'summary'
            ? `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
              Rekapitulasi Arus Kas & Metode Pembayaran
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 6px 8px; text-align: left;">Metode Pembayaran</th>
                  <th style="padding: 6px 8px; text-align: left;">Tipe Kanal</th>
                  <th style="padding: 6px 8px; text-align: right;">Total Transaksi</th>
                  <th style="padding: 6px 8px; text-align: right;">Nominal Diterima</th>
                  <th style="padding: 6px 8px; text-align: right;">Pangsa Pangsa (%)</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  { name: 'Uang Tunai (Cash)', type: 'Laci Kasir Fisik', amount: paymentBreakdown.cash, count: filteredTransactions.filter(t => t.payment.method === 'cash').length },
                  { name: 'QRIS & E-Wallet (GoPay, OVO, ShopeePay)', type: 'Digital Settlement', amount: paymentBreakdown.qris, count: filteredTransactions.filter(t => t.payment.method === 'qris').length },
                  { name: 'Mesin EDC (Debit & Kartu Kredit)', type: 'Merchant Card EDC', amount: paymentBreakdown.card, count: filteredTransactions.filter(t => t.payment.method === 'card').length },
                  { name: 'Transfer Bank / Virtual Account', type: 'Bank Direct Transfer', amount: paymentBreakdown.transfer, count: filteredTransactions.filter(t => t.payment.method === 'transfer').length },
                ].map((m) => {
                  const share = grossSales > 0 ? ((m.amount / grossSales) * 100).toFixed(1) : '0';
                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${m.name}</td>
                      <td style="padding: 6px 8px; color: #64748b;">${m.type}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${m.count} Struk</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #059669;">${formatCurrency(m.amount, settings.currency)}</td>
                      <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${share}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        <!-- Official Signatures Footer -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid;">
          <div style="text-align: center; width: 200px;">
            <div style="font-size: 11px; color: #64748b;">Dibuat Oleh:</div>
            <div style="margin-top: 55px; border-bottom: 1px solid #64748b;"></div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px;">
              ${activeEmployee?.name || 'Kasir / Petugas'}
            </div>
            <div style="font-size: 10px; color: #64748b;">${activeEmployee?.roleTitle || 'Petugas Kasir'}</div>
          </div>

          <div style="text-align: center; width: 200px;">
            <div style="font-size: 11px; color: #64748b;">Disetujui & Diverifikasi:</div>
            <div style="margin-top: 55px; border-bottom: 1px solid #64748b;"></div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px;">
              Manager / Pemilik Toko
            </div>
            <div style="font-size: 10px; color: #64748b;">${settings.branchName}</div>
          </div>
        </div>

        <div style="margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center; font-size: 10px; color: #94a3b8;">
          Dokumen ini digenerate secara otomatis oleh Sistem Kasir POS Modern. Hak Cipta © ${new Date().getFullYear()} ${settings.storeName}.
        </div>
      </div>
    `;
  };

  // Actions
  const handlePrintDocument = () => {
    setIsPrinting(true);
    const html = generateReportHTML();
    const title = `Laporan_${reportType}_${period}_${settings.storeName.replace(/\s+/g, '_')}`;
    printViaIframe(html, title, paperFormat);
    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleOpenPrintWindow = () => {
    const html = generateReportHTML();
    const title = `Laporan POS - ${settings.storeName}`;
    openPrintWindow(html, title, paperFormat);
  };

  const handleExportCSV = () => {
    const filename = `Laporan_${reportType}_${period}_${new Date().toISOString().slice(0, 10)}`;

    if (reportType === 'products') {
      const headers = ['SKU', 'Nama Produk', 'Kategori', 'Qty Terjual', 'Omzet Penjualan (Rp)', 'Total HPP (Rp)', 'Laba Kotor (Rp)'];
      const rows = sortedProductStats.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.quantity,
        Math.round(p.revenue),
        Math.round(p.cogs),
        Math.round(p.profit),
      ]);
      exportToCSV(filename, headers, rows);
    } else {
      const headers = ['No Faktur', 'Waktu', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Subtotal', 'Diskon', 'Total Akhir'];
      const rows = filteredTransactions.map((t) => [
        t.invoiceNumber,
        new Date(t.createdAt).toLocaleString('id-ID'),
        t.cashierName,
        t.customer?.name || 'Umum',
        t.payment.method.toUpperCase(),
        Math.round(t.subtotal),
        Math.round(t.discountAmount),
        Math.round(t.finalTotal),
      ]);
      exportToCSV(filename, headers, rows);
    }
  };

  const handleCopySummary = () => {
    const summaryText = `*${settings.storeName.toUpperCase()} - LAPORAN KASIR*\n` +
      `Periode: ${periodLabel}\n` +
      `Waktu Cetak: ${new Date().toLocaleString('id-ID')}\n\n` +
      `• Total Transaksi: ${filteredTransactions.length} Struk\n` +
      `• Total Produk Terjual: ${totalUnitsSold} Pcs\n` +
      `• Total Omzet Kotor: ${formatCurrency(grossSales, settings.currency)}\n` +
      `• Total Diskon: ${formatCurrency(totalDiscounts, settings.currency)}\n` +
      `• Total Retur: ${formatCurrency(totalRefundAmount, settings.currency)}\n` +
      `• Penjualan Bersih: ${formatCurrency(netSales, settings.currency)}\n` +
      `• Estimasi Laba Kotor: ${formatCurrency(grossProfit, settings.currency)} (${profitMargin}%)\n\n` +
      `*Penerimaan Kas:*\n` +
      `- Tunai: ${formatCurrency(paymentBreakdown.cash, settings.currency)}\n` +
      `- QRIS/E-Wallet: ${formatCurrency(paymentBreakdown.qris, settings.currency)}\n` +
      `- Kartu EDC: ${formatCurrency(paymentBreakdown.card, settings.currency)}\n` +
      `- Transfer: ${formatCurrency(paymentBreakdown.transfer, settings.currency)}\n\n` +
      `Petugas: ${activeEmployee?.name || 'Kasir'}`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="report-print-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="report-print-modal-container"
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                <span>Cetak & Ekspor Laporan Bisnis Toko</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cetak ke printer fisik / thermal kasir, simpan sebagai PDF resmi, atau ekspor ke file Excel CSV.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar: Report Type, Period, Format */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Tipe Laporan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Tipe Laporan:</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="summary">📊 Ringkasan Penjualan & Laba Kotor</option>
              <option value="transactions">🧾 Rincian Transaksi Selesai</option>
              <option value="products">🏆 Produk Terlaris & Margin</option>
              <option value="payments">💳 Rekonsiliasi Metode Pembayaran</option>
            </select>
          </div>

          {/* 2. Filter Periode */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Rentang Waktu:</span>
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="today">📅 Hari Ini (Real-Time)</option>
              <option value="yesterday">⏪ Kemarin</option>
              <option value="last7days">🗓️ 7 Hari Terakhir</option>
              <option value="last30days">🗓️ 30 Hari Terakhir</option>
              <option value="thismonth">📆 Bulan Ini</option>
              <option value="all">🌐 Semua Periode</option>
            </select>
          </div>

          {/* 3. Ukuran Kertas / Format Output */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Ukuran Kertas:</span>
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  paperFormat === 'a4'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                A4 / PDF
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('80mm')}
                className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  paperFormat === '80mm'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('58mm')}
                className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  paperFormat === '58mm'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                58mm
              </button>
            </div>
          </div>
        </div>

        {/* Live Document Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex justify-center">
          <div
            id="printable-report-area"
            className={`bg-white text-slate-900 shadow-xl border border-slate-300 dark:border-slate-700 rounded-xl transition-all ${
              paperFormat === '58mm'
                ? 'w-[280px] p-3'
                : paperFormat === '80mm'
                ? 'w-[360px] p-4'
                : 'w-full max-w-3xl p-6 sm:p-8'
            }`}
            dangerouslySetInnerHTML={{ __html: generateReportHTML() }}
          />
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Ringkasan'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel (CSV)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPrintWindow}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Buka tampilan cetak di jendela terpisah"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Tab Cetak</span>
            </button>

            <button
              onClick={handlePrintDocument}
              disabled={isPrinting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Menyiapkan Cetak...' : 'Cetak Dokumen Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
