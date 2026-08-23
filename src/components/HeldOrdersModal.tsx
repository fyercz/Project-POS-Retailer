import React from 'react';
import { X, PauseCircle, Trash2, ArrowRight, Clock, User, ShoppingBag } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({ isOpen, onClose }) => {
  const { heldOrders, recallHeldOrder, deleteHeldOrder, settings } = usePOS();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="held-orders-dialog"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <PauseCircle className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-none">
                Parked & Held Orders
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {heldOrders.length} orders on hold
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

        {/* List of Held Orders */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {heldOrders.length > 0 ? (
            heldOrders.map((held) => (
              <div
                key={held.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-850 flex flex-col gap-2.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs font-mono text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {held.referenceNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDate(held.createdAt)}
                    </span>
                  </div>

                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(held.subtotal, settings.currency)}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                      Penjualan Kasir
                    </span>
                    {held.customer && <span>• Pelanggan: <strong>{held.customer.name}</strong></span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    Item: {held.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => deleteHeldOrder(held.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                    title="Discard order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      recallHeldOrder(held);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <span>Recall Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
              <ShoppingBag className="w-10 h-10 stroke-[1.2] mb-2 opacity-40 text-amber-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Orders On Hold</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                You can park orders anytime by clicking "Hold" or pressing F4.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
