import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { Product, PriceHistoryRecord, StoreSettings } from '../types';
import { ProductPriceHistoryView } from './ProductPriceHistoryView';

interface ProductPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProductId?: string;
  settings: StoreSettings;
  onUpdateProductPrice?: (
    productId: string,
    newCostPrice: number,
    newSellingPrice: number,
    historyRecord: PriceHistoryRecord
  ) => void;
}

export const ProductPriceHistoryModal: React.FC<ProductPriceHistoryModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProductId,
  settings,
  onUpdateProductPrice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Riwayat &amp; Fluktuasi Harga Produk</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Modal vs Jual
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pantau pergerakan harga modal (HPP), harga jual eceran, dan deviasi margin keuntungan kotor
              </p>
            </div>
          </div>

          <button
            id="btn-close-price-history-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <ProductPriceHistoryView
            products={products}
            initialProductId={selectedProductId}
            settings={settings}
            onUpdateProductPrice={onUpdateProductPrice}
            onClose={onClose}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
};
