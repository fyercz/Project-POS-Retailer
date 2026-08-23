import React, { useState } from 'react';
import { Plus, SlidersHorizontal, AlertTriangle, Check, Flame } from 'lucide-react';
import { Product } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { ProductCustomizerModal } from './ProductCustomizerModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, settings, cart } = usePOS();
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const hasOptions = Boolean(product.options && product.options.length > 0);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.minStock;

  // Check how many of this product are in current cart
  const cartQuantity = cart
    .filter((item) => item.product.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (hasOptions) {
      setIsCustomizerOpen(true);
    } else {
      addToCart(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 600);
    }
  };

  return (
    <>
      <div
        id={`product-card-${product.id}`}
        onClick={handleCardClick}
        className={`group relative rounded-xl border transition-all duration-150 p-3.5 flex flex-col justify-between cursor-pointer select-none
          ${
            isOutOfStock
              ? 'opacity-50 grayscale cursor-not-allowed bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/5 active:scale-98'
          }
        `}
      >
        {/* Card Header: Brand/Category & Badges */}
        <div>
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate uppercase tracking-wider">
              {product.brand || product.sku}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {cartQuantity > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow-xs">
                  {cartQuantity}
                </span>
              )}
              {product.isPopular && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Flame className="w-2.5 h-2.5 fill-current text-amber-500" />
                  Hot
                </span>
              )}
              {isLowStock && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                  Sisa {product.stock}
                </span>
              )}
              {isOutOfStock && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  Habis
                </span>
              )}
            </div>
          </div>

          {/* Product Name */}
          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
            {product.name}
          </h4>

          {/* SKU, Barcode, Aisle & Exp */}
          <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <div className="flex items-center justify-between">
              <span>SKU: {product.sku}</span>
              <span className="font-sans font-medium text-slate-600 dark:text-slate-300">
                Stok: {product.stock} {product.unit}
              </span>
            </div>
            {product.aisle && (
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                  {product.aisle}
                </span>
                {product.expiryDate && (
                  <span>Exp: {product.expiryDate}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Footer: Price & Add Button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Harga</span>
            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(product.price, settings.currency)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasOptions && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                <SlidersHorizontal className="w-2.5 h-2.5 text-emerald-500" />
                Varian
              </span>
            )}
            <button
              type="button"
              id={`btn-add-${product.id}`}
              disabled={isOutOfStock}
              aria-label={`Add ${product.name}`}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                justAdded
                  ? 'bg-emerald-500 text-slate-950 scale-110'
                  : 'bg-emerald-50 hover:bg-emerald-500 hover:text-slate-950 text-emerald-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-500 dark:hover:text-slate-950 border border-emerald-200 dark:border-slate-700'
              }`}
            >
              {justAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Product Customizer Modal */}
      {isCustomizerOpen && (
        <ProductCustomizerModal
          product={product}
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
        />
      )}
    </>
  );
};
