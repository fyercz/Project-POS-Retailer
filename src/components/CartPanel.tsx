import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  User,
  Plus,
  Minus,
  Trash2,
  Tag,
  PauseCircle,
  CreditCard,
  X,
  Award,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Zap,
  Boxes,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { CustomerModal } from './CustomerModal';
import { WholesaleUnit } from '../types';

export const CartPanel: React.FC = () => {
  const {
    cart,
    addToCart,
    updateCartItemQuantity,
    updateCartItemUnit,
    updateCartItemDiscount,
    removeFromCart,
    clearCart,
    updateCartItemNote,
    selectedCustomer,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
    usePoints,
    setUsePoints,
    subtotal,
    taxAmount,
    serviceChargeAmount,
    voucherDiscount,
    pointsDiscount,
    totalDiscount,
    finalTotal,
    pointsEligibleSpend,
    minProfitPercentForPoints,
    holdCurrentOrder,
    setIsPaymentModalOpen,
    settings,
    aiUpsellSuggestions,
    openGeminiCopilot,
  } = usePOS();

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [activeEditingNoteId, setActiveEditingNoteId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState('');

  // Keyboard shortcuts (F4: Hold, F9: Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          holdCurrentOrder();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, holdCurrentOrder, setIsPaymentModalOpen]);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherInput.trim()) return;
    const res = applyVoucher(voucherInput);
    if (!res.success) {
      setVoucherError(res.message);
    } else {
      setVoucherError('');
      setVoucherInput('');
    }
  };

  const handleOpenNoteEdit = (cartItemId: string, currentNote?: string) => {
    setActiveEditingNoteId(cartItemId);
    setItemNoteText(currentNote || '');
  };

  const handleSaveNote = (cartItemId: string) => {
    updateCartItemNote(cartItemId, itemNoteText.trim());
    setActiveEditingNoteId(null);
  };

  const estimatedPoints = Math.floor(pointsEligibleSpend / (settings.pointsRatio || 10000));
  const nonEligibleSpend = Math.max(0, subtotal - pointsEligibleSpend);

  return (
    <div
      id="pos-cart-panel"
      className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 select-none shadow-sm"
    >
      {/* Top Order Header - Retail direct sale & Customer */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/90">
        {/* Direct Sale Header with Quick Reset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>Penjualan Langsung (Kasir)</span>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Kosongkan Keranjang"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Customer Assignment Button */}
        <button
          type="button"
          id="btn-select-customer"
          onClick={() => setIsCustomerModalOpen(true)}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-left flex items-center justify-between text-xs transition-colors cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum (Walk-in)'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {selectedCustomer
                  ? `Member ${selectedCustomer.tier} • ${selectedCustomer.points} Poin (Dapat +${estimatedPoints} Poin)`
                  : 'Klik untuk pilih / tambah member (kumpulkan poin)'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30 dark:bg-slate-900">
        {cart.length > 0 ? (
          cart.map((item) => {
            const hasWholesaleOptions =
              item.product.wholesaleUnits && item.product.wholesaleUnits.length > 0;

            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-slate-950/70 hover:border-emerald-500/50 transition-all flex flex-col gap-1.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {item.product.name}
                    </h5>

                    {/* Unit Selector (Eceran vs Grosir/Dus/Slop/Lusin) */}
                    {hasWholesaleOptions && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => updateCartItemUnit(item.id, undefined)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-colors ${
                            !item.selectedUnit
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                              : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Eceran ({item.product.unit || 'pcs'})
                        </button>
                        {item.product.wholesaleUnits?.map((wu) => (
                          <button
                            key={wu.id}
                            type="button"
                            onClick={() => updateCartItemUnit(item.id, wu)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-colors ${
                              item.selectedUnit?.id === wu.id
                                ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                                : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {wu.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Selected Modifiers */}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-x-1 mt-0.5">
                        {item.selectedOptions.map((opt, idx) => (
                          <span key={idx} className="bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                            {opt.choiceName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Profit Margin & Points Eligibility Badge */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.isPointsEligible ? (
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <Award className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                          <span>Margin {(item.profitMarginPercent ?? 0).toFixed(1)}% • Poin Aktif</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span>Margin {(item.profitMarginPercent ?? 0).toFixed(1)}% • Non-Poin (&lt;15%)</span>
                        </span>
                      )}
                    </div>

                    {/* Notes / Special Instructions */}
                    {item.notes && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 italic flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.totalPrice, settings.currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      @{formatCurrency(item.unitPrice, settings.currency)}
                      {item.selectedUnit ? `/${item.selectedUnit.name}` : `/${item.product.unit || 'pcs'}`}
                    </div>
                  </div>
                </div>

                {/* Quantity Stepper & Notes Editor */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenNoteEdit(item.id, item.notes)}
                    className="text-[11px] text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{item.notes ? 'Ubah catatan' : '+ Catatan'}</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-6 text-center font-bold text-xs font-mono text-slate-900 dark:text-slate-100">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* In-line Note Editor Form */}
                {activeEditingNoteId === item.id && (
                  <div className="pt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={itemNoteText}
                      onChange={(e) => setItemNoteText(e.target.value)}
                      placeholder="Masukkan catatan item..."
                      className="flex-1 text-[11px] p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveNote(item.id)}
                      className="px-2 py-1 text-[11px] bg-emerald-500 text-slate-950 rounded-lg font-bold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => setActiveEditingNoteId(null)}
                      className="px-1.5 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <ShoppingBag className="w-12 h-12 stroke-[1.3] mb-2 opacity-40 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keranjang Kosong</p>
            <p className="text-xs text-slate-400 max-w-[200px] mt-1">
              Pilih produk dari katalog atau scan barcode untuk memulai transaksi.
            </p>
          </div>
        )}
      </div>

      {/* Gemini AI Smart Upsell strip (if suggestions exist) */}
      {cart.length > 0 && aiUpsellSuggestions.length > 0 && (
        <div className="p-2.5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border-t border-emerald-500/30 text-white space-y-2 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
              <span>Saran Kasir Gemini AI</span>
            </div>
            <button
              onClick={() => openGeminiCopilot('upsell')}
              className="text-[10px] text-slate-300 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer underline"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Primary Top Suggestion Card */}
          {aiUpsellSuggestions[0] && (
            <div className="p-2 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                    {aiUpsellSuggestions[0].urgency}
                  </span>
                  <span className="text-xs font-semibold truncate text-white">
                    {aiUpsellSuggestions[0].product.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                  {aiUpsellSuggestions[0].reason}
                </p>
                <div className="text-[11px] font-mono font-bold text-emerald-400">
                  {formatCurrency(aiUpsellSuggestions[0].product.price, settings.currency)}
                </div>
              </div>

              <button
                onClick={() => addToCart(aiUpsellSuggestions[0].product)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition-colors"
                title="Tambahkan ke Keranjang"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cart Summary & Checkout Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 space-y-2.5">
        {/* Voucher & Loyalty Points Accordion */}
        {cart.length > 0 && (
          <div className="space-y-1.5">
            {/* Voucher input or applied voucher */}
            {appliedVoucher ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-medium">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold">{appliedVoucher.code}</span>
                  <span>(-{formatCurrency(voucherDiscount, settings.currency)})</span>
                </div>
                <button
                  onClick={removeVoucher}
                  className="text-emerald-700 dark:text-emerald-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyVoucher} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Kode promo / voucher..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-emerald-500 hover:text-slate-950 cursor-pointer transition-colors"
                >
                  Pakai
                </button>
              </form>
            )}

            {voucherError && <p className="text-[11px] text-rose-500">{voucherError}</p>}

            {/* Member Points Redemption toggle */}
            {selectedCustomer && selectedCustomer.points > 0 && (
              <label className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    Tukarkan {selectedCustomer.points} poin belanja
                  </span>
                </div>
                {pointsDiscount > 0 && (
                  <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">
                    -{formatCurrency(pointsDiscount, settings.currency)}
                  </span>
                )}
              </label>
            )}
          </div>
        )}

        {/* Pricing Line items & Loyalty Points Logic */}
        <div className="space-y-1 text-xs pt-1 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(subtotal, settings.currency)}
            </span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Diskon</span>
              <span className="font-mono">-{formatCurrency(totalDiscount, settings.currency)}</span>
            </div>
          )}

          {/* Points Eligibility Breakdown */}
          {cart.length > 0 && (
            <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-emerald-900 dark:text-emerald-300 font-semibold">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Belanja Berpoin (Margin ≥15%)</span>
                </span>
                <span className="font-mono">{formatCurrency(pointsEligibleSpend, settings.currency)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                <span>Estimasi Poin Diperoleh:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  +{estimatedPoints} Poin
                </span>
              </div>

              {nonEligibleSpend > 0 && (
                <p className="text-[9px] text-amber-700 dark:text-amber-400/90 leading-tight pt-0.5 flex items-start gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Item senilai {formatCurrency(nonEligibleSpend)} memiliki margin &lt;15% (rokok/promo margin tipis) sehingga tidak dihitung dalam akumulasi poin member.
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <span className="font-bold text-sm">Total Tagihan</span>
            <span className="font-black text-lg text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(finalTotal, settings.currency)}
            </span>
          </div>
        </div>

        {/* Cart Action Buttons: Clear, Hold (F4), Pay (F9) */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Clear Cart */}
          <button
            type="button"
            id="btn-clear-cart"
            onClick={clearCart}
            disabled={cart.length === 0}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
            title="Kosongkan seluruh isi keranjang"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Hold Order (F4) */}
          <button
            type="button"
            id="btn-hold-order"
            onClick={() => holdCurrentOrder()}
            disabled={cart.length === 0}
            className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
            title="Parkir / tunda transaksi sementara (F4)"
          >
            <PauseCircle className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Parkir</span>
          </button>

          {/* Checkout & Pay Button (F9) */}
          <button
            type="button"
            id="btn-checkout-pay"
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.length === 0}
            className="col-span-2 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>Bayar Sekarang</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-950/20 text-slate-950 font-mono ml-1 font-bold">F9</span>
          </button>
        </div>
      </div>

      {/* Customer Selector Modal */}
      {isCustomerModalOpen && (
        <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} />
      )}
    </div>
  );
};
