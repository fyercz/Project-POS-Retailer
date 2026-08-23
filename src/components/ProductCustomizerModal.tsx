import React, { useState } from 'react';
import { X, Plus, Check, Coffee, Sparkles } from 'lucide-react';
import { Product, SelectedOption } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';

interface ProductCustomizerModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductCustomizerModal: React.FC<ProductCustomizerModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { addToCart, settings } = usePOS();
  const [selectedChoices, setSelectedChoices] = useState<Record<string, { name: string; extraPrice: number }>>({});
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !product) return null;

  // Initialize default options
  const handleOptionSelect = (groupName: string, choiceName: string, extraPrice: number) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [groupName]: { name: choiceName, extraPrice },
    }));
  };

  const choicesList = Object.values(selectedChoices) as { name: string; extraPrice: number }[];
  const calculatedExtra = choicesList.reduce((sum, item) => sum + item.extraPrice, 0);
  const finalUnitPrice = product.price + calculatedExtra;

  const handleConfirmAddToCart = () => {
    const formattedOptions: SelectedOption[] = (
      Object.entries(selectedChoices) as [string, { name: string; extraPrice: number }][]
    ).map(([groupName, choice]) => ({
      groupName,
      choiceName: choice.name,
      extraPrice: choice.extraPrice,
    }));

    addToCart(product, formattedOptions, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="product-customizer-dialog"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Clean Header without image preview */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-slate-950 uppercase tracking-wider">
                {product.categoryId}
              </span>
              <span className="text-xs text-slate-400 font-mono">SKU: {product.sku}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">{product.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Stok: {product.stock} {product.unit} {product.brand && `• Brand: ${product.brand}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {product.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              {product.description}
            </p>
          )}

          {/* Option Groups */}
          {product.options && product.options.length > 0 ? (
            product.options.map((group) => {
              const selectedForGroup = selectedChoices[group.name]?.name;
              return (
                <div key={group.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {group.name}
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Select one</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.choices.map((choice) => {
                      const isSelected = selectedForGroup === choice.name;
                      return (
                        <button
                          key={choice.name}
                          type="button"
                          onClick={() => handleOptionSelect(group.name, choice.name, choice.extraPrice)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                                  : 'border-slate-400 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{choice.name}</span>
                          </div>
                          {choice.extraPrice > 0 && (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                              +{formatCurrency(choice.extraPrice, settings.currency)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-2 text-xs text-slate-500 dark:text-slate-400">
              No variant choices required for this item.
            </div>
          )}

          {/* Special Kitchen / Barista Notes */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Special Notes / Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra hot, separate sauce, packaging preference..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Footer with Price Summary and Add to Cart Button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Total Item Price</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(finalUnitPrice, settings.currency)}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-add-custom-product"
              onClick={handleConfirmAddToCart}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
