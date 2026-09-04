import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Transaction } from '../types';
import { printViaIframe, openPrintWindow } from '../utils/printHelper';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, isOpen, onClose }) => {
  const { settings, setActiveReceipt } = usePOS();
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    const el = document.getElementById('thermal-receipt-print-area');
    if (el) {
      printViaIframe(el.outerHTML, `Struk_${transaction.invoiceNumber}`, paperSize);
    } else {
      window.print();
    }
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

        {/* Controls Toolbar: Paper Size toggle */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Thermal Paper Size:</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPaperSize('58mm')}
              className={`px-2.5 py-1 rounded-lg font-mono font-semibold cursor-pointer ${
                paperSize === '58mm'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              58mm (Small)
            </button>
            <button
              onClick={() => setPaperSize('80mm')}
              className={`px-2.5 py-1 rounded-lg font-mono font-semibold cursor-pointer ${
                paperSize === '80mm'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              80mm (Wide)
            </button>
          </div>
        </div>

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
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-thermal-receipt"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal</span>
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
