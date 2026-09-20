import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle,
  Download,
  Copy,
  Receipt as ReceiptIcon,
  RotateCcw,
  MessageSquare,
  ExternalLink,
  Zap,
  Radio,
  Usb,
  Check,
  AlertCircle,
  KeyRound,
  Coins,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Transaction } from '../types';
import { printViaIframe, openPrintWindow } from '../utils/printHelper';
import {
  buildTransactionReceiptEscPos,
  printViaWebSerial,
  printViaWebBluetooth,
  kickCashDrawerOnly,
  checkPrinterHardwareSupport,
  getSavedPrinterConfig,
  savePrinterConfig,
  ThermalPaperWidth,
} from '../utils/escposPrinter';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, isOpen, onClose }) => {
  const { settings, setActiveReceipt } = usePOS();
  const [paperSize, setPaperSize] = useState<ThermalPaperWidth>('58mm');
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [directPrinting, setDirectPrinting] = useState(false);
  const [printerFeedback, setPrinterFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [hardwareSupport, setHardwareSupport] = useState({ hasSerial: false, hasBluetooth: false });
  const [printMode, setPrintMode] = useState<'serial' | 'bluetooth' | 'browser'>('browser');

  useEffect(() => {
    const support = checkPrinterHardwareSupport();
    setHardwareSupport(support);
    const saved = getSavedPrinterConfig();
    setPaperSize(saved.paperWidth);
    if (saved.connectionType === 'serial' && support.hasSerial) {
      setPrintMode('serial');
    } else if (saved.connectionType === 'bluetooth' && support.hasBluetooth) {
      setPrintMode('bluetooth');
    }
  }, []);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    if (printMode === 'serial' || printMode === 'bluetooth') {
      handleDirectRawPrint(printMode);
      return;
    }

    const el = document.getElementById('thermal-receipt-print-area');
    if (el) {
      printViaIframe(el.outerHTML, `Struk_${transaction.invoiceNumber}`, paperSize);
    } else {
      window.print();
    }
  };

  const handleDirectRawPrint = async (mode: 'serial' | 'bluetooth') => {
    setDirectPrinting(true);
    setPrinterFeedback(null);

    try {
      const printerConfig = getSavedPrinterConfig();
      const bytes = buildTransactionReceiptEscPos(
        transaction,
        settings,
        paperSize,
        printerConfig.autoCut,
        printerConfig.kickCashDrawer
      );

      let res;
      if (mode === 'serial') {
        res = await printViaWebSerial(bytes, 9600);
      } else {
        res = await printViaWebBluetooth(bytes);
      }

      if (res.success) {
        setPrinterFeedback({ type: 'success', message: res.message });
      } else {
        setPrinterFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setPrinterFeedback({ type: 'error', message: err?.message || 'Gagal cetak thermal langsung.' });
    } finally {
      setDirectPrinting(false);
      setTimeout(() => setPrinterFeedback(null), 5000);
    }
  };

  const handleKickDrawer = async () => {
    setDirectPrinting(true);
    try {
      const mode = printMode === 'bluetooth' ? 'bluetooth' : 'serial';
      const res = await kickCashDrawerOnly(mode, 9600);
      setPrinterFeedback({ type: res.success ? 'success' : 'error', message: res.message });
    } catch (err: any) {
      setPrinterFeedback({ type: 'error', message: 'Gagal membuka laci kas: ' + String(err) });
    } finally {
      setDirectPrinting(false);
      setTimeout(() => setPrinterFeedback(null), 4000);
    }
  };

  const handlePaperSizeChange = (size: ThermalPaperWidth) => {
    setPaperSize(size);
    savePrinterConfig({
      ...getSavedPrinterConfig(),
      paperWidth: size,
    });
  };

  const handleOpenReceiptTab = () => {
    const el = document.getElementById('thermal-receipt-print-area');
    if (el) {
      openPrintWindow(el.outerHTML, `Struk POS - ${transaction.invoiceNumber}`, paperSize);
    }
  };

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(transaction.invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 3000);
  };

  const handleNewSale = () => {
    setActiveReceipt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="receipt-modal-dialog"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <ReceiptIcon className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-none">
                Transaction Receipt
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {transaction.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Toolbar: Mode and Paper Size */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Metode Cetak:</span>
            <div className="flex items-center p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPrintMode('browser')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  printMode === 'browser'
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Printer className="w-3 h-3" />
                <span>Browser/PDF</span>
              </button>

              {hardwareSupport.hasSerial && (
                <button
                  type="button"
                  onClick={() => setPrintMode('serial')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    printMode === 'serial'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                  }`}
                  title="Direct ESC/POS via USB/Serial Virtual COM Port"
                >
                  <Usb className="w-3 h-3" />
                  <span>USB ESC/POS</span>
                </button>
              )}

              {hardwareSupport.hasBluetooth && (
                <button
                  type="button"
                  onClick={() => setPrintMode('bluetooth')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    printMode === 'bluetooth'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                  }`}
                  title="Direct ESC/POS via Bluetooth Mini Printer"
                >
                  <Radio className="w-3 h-3" />
                  <span>Bluetooth</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Ukuran:</span>
            <button
              onClick={() => handlePaperSizeChange('58mm')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold cursor-pointer ${
                paperSize === '58mm'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              58mm
            </button>
            <button
              onClick={() => handlePaperSizeChange('80mm')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold cursor-pointer ${
                paperSize === '80mm'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              80mm
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {printerFeedback && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
              printerFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {printerFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{printerFeedback.message}</span>
            </div>
            <button
              onClick={() => setPrinterFeedback(null)}
              className="p-1 hover:opacity-70 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Receipt Visualizer Container */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-200/60 dark:bg-slate-950 flex justify-center">
          <div
            id="thermal-receipt-print-area"
            className={`bg-white text-slate-900 p-5 shadow-md border border-slate-300 font-mono text-[11px] leading-relaxed select-text transition-all ${
              paperSize === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
          >
            {/* Store Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-bold text-sm tracking-wider uppercase">{settings.storeName}</h2>
              <p className="text-[10px] text-slate-600">{settings.branchName}</p>
              <p className="text-[10px] text-slate-600">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
            </div>

            {/* Meta Info */}
            <div className="py-2 space-y-0.5 text-[10px] text-slate-700 border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Jenis:</span>
                <span className="font-semibold text-emerald-700">Penjualan Langsung</span>
              </div>
              {transaction.customer && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>
                    {transaction.customer.name}
                  </span>
                </div>
              )}
            </div>

            {/* Itemized Line Items */}
            <div className="py-2 space-y-2 border-b border-dashed border-slate-400">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span className="truncate pr-2">{item.product.name}</span>
                    <span>{formatCurrency(item.totalPrice, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.quantity} x {formatCurrency(item.unitPrice, settings.currency)}
                    </span>
                  </div>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="text-[9px] text-slate-500 pl-2 italic">
                      + {item.selectedOptions.map((o) => o.choiceName).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[9px] text-slate-500 pl-2 italic">Note: {item.notes}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(transaction.subtotal, settings.currency)}</span>
              </div>

              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>
                    Diskon {transaction.voucherCode ? `(${transaction.voucherCode})` : ''}
                    {transaction.pointsUsed && transaction.pointsUsed > 0 ? ` (Poin: -${transaction.pointsUsed} pts)` : ''}
                  </span>
                  <span>-{formatCurrency(transaction.discountAmount, settings.currency)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                <span>TOTAL</span>
                <span>{formatCurrency(transaction.finalTotal, settings.currency)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 space-y-0.5 text-[10px] border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="uppercase font-bold">{transaction.payment.method}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Tendered:</span>
                <span>{formatCurrency(transaction.payment.amountTendered, settings.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>{formatCurrency(transaction.payment.change, settings.currency)}</span>
              </div>
              {transaction.payment.referenceCode && (
                <div className="flex justify-between">
                  <span>Ref / Auth:</span>
                  <span>{transaction.payment.referenceCode}</span>
                </div>
              )}
            </div>

            {/* Loyalty Points info */}
            {((transaction.pointsEarned && transaction.pointsEarned > 0) || (transaction.pointsUsed && transaction.pointsUsed > 0)) && (
              <div className="py-1.5 px-2 text-center text-[10px] text-slate-700 bg-slate-100 my-2 rounded space-y-0.5">
                {transaction.pointsUsed && transaction.pointsUsed > 0 ? (
                  <div className="flex justify-between font-mono">
                    <span>Poin Ditukar:</span>
                    <span className="font-bold text-amber-700">-{transaction.pointsUsed} Pts</span>
                  </div>
                ) : null}
                {transaction.pointsEarned && transaction.pointsEarned > 0 ? (
                  <div className="flex justify-between font-mono">
                    <span>Poin Diperoleh:</span>
                    <span className="font-bold text-emerald-700">+{transaction.pointsEarned} Pts</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Footer Message */}
            <div className="pt-3 text-center space-y-2">
              <p className="text-[10px] text-slate-600">{settings.receiptFooterMessage}</p>
              {/* Simulated Thermal Barcode */}
              <div className="flex flex-col items-center">
                <div className="h-6 w-3/4 flex items-center justify-between">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i % 3 === 0 ? 'w-1 bg-black' : i % 2 === 0 ? 'w-0.5 bg-black' : 'w-0.5 bg-transparent'}`}
                    />
                  ))}
                </div>
                <span className="text-[9px] tracking-widest text-slate-500 mt-0.5">
                  {transaction.invoiceNumber}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              disabled={directPrinting}
              id="btn-print-thermal-receipt"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all ${
                printMode === 'serial'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : printMode === 'bluetooth'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              } disabled:opacity-50`}
            >
              <Printer className={`w-4 h-4 ${directPrinting ? 'animate-bounce' : ''}`} />
              <span>
                {directPrinting
                  ? 'Mencetak...'
                  : printMode === 'serial'
                  ? 'Cetak USB Direct'
                  : printMode === 'bluetooth'
                  ? 'Cetak Bluetooth'
                  : 'Cetak Thermal'}
              </span>
            </button>

            {/* Quick Cash Drawer Trigger */}
            <button
              onClick={handleKickDrawer}
              disabled={directPrinting}
              className="px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center gap-1 cursor-pointer transition-colors"
              title="Buka Laci Kas (Cash Drawer RJ11 Kick)"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Buka Laci</span>
            </button>

            <button
              onClick={handleOpenReceiptTab}
              className="px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
              title="Buka struk di jendela cetak baru"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>{whatsappSent ? 'Sent to WhatsApp!' : 'WhatsApp'}</span>
            </button>

            <button
              onClick={handleCopyInvoice}
              className="px-2.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
              title="Copy Invoice ID"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleNewSale}
            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
