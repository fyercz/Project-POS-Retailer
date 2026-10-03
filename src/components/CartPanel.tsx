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
  ChevronDown,
  ChevronUp,
  Check,
  Percent,
  Heart,
  MessageSquare,
  Zap,
  Boxes,
  AlertTriangle,
  HelpCircle,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  usePOSCart,
  usePOSCartActions,
  usePOSTransactions,
  usePOSUI,
  usePOSAuthShift,
} from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { CustomerModal } from './CustomerModal';
import { WholesaleUnit, CustomerDiscount } from '../types';

interface CartPanelProps {
  onBackToCatalog?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({ onBackToCatalog }) => {
  const {
    cart,
    selectedCustomer,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
    customerDiscount,
    applyCustomerDiscount,
    removeCustomerDiscount,
    customerDiscountAmount,
    customerDiscountSuggestions,
    usePoints,
    setUsePoints,
    pointsToRedeem,
    setPointsToRedeem,
    maxRedeemablePoints,
    pointRedemptionRate,
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
  } = usePOSCart();

  const {
    addToCart,
    updateCartItemQuantity,
    updateCartItemUnit,
    updateCartItemDiscount,
    removeFromCart,
    clearCart,
    updateCartItemNote,
  } = usePOSCartActions();

  const { setIsPaymentModalOpen } = usePOSTransactions();
  const { settings, aiUpsellSuggestions, openGeminiCopilot } = usePOSUI();
  const { activeEmployee, lockScreen } = usePOSAuthShift();

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [activeEditingNoteId, setActiveEditingNoteId] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState('');
  const [isDiscountSuggestionsOpen, setIsDiscountSuggestionsOpen] = useState(true);

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

  const tierMultiplier =
    selectedCustomer?.tier === 'Platinum'
      ? 2
      : selectedCustomer?.tier === 'Gold'
      ? 1.5
      : selectedCustomer?.tier === 'Silver'
      ? 1.2
      : 1;
  const baseEstimated = Math.floor(pointsEligibleSpend / (settings.pointsRatio || 10000));
  const estimatedPoints = Math.floor(baseEstimated * tierMultiplier);
  const nonEligibleSpend = Math.max(0, subtotal - pointsEligibleSpend);

  return (
    <div
      id="pos-cart-panel"
      className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 select-none shadow-sm"
    >
      {/* Mobile Back to Catalog Bar */}
      {onBackToCatalog && (
        <div className="md:hidden px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white cursor-pointer active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>&larr; Kembali ke Katalog</span>
          </button>
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
            {cart.reduce((s, i) => s + i.quantity, 0)} Item
          </span>
        </div>
      )}

      {/* Active Cashier & Quick Switch / Authority Bar */}
      <div className="px-3 py-1.5 bg-slate-100/90 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-5 h-5 rounded-md ${
              activeEmployee?.avatarColor || 'bg-emerald-600'
            } text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs`}
          >
            {activeEmployee?.avatar || 'KR'}
          </div>
          <div className="truncate flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {activeEmployee?.name || 'Kasir 01'}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              {activeEmployee?.roleTitle || (activeEmployee?.role === 'owner' ? 'Owner' : activeEmployee?.role === 'supervisor' ? 'Supervisor' : 'Kasir')}
            </span>
          </div>
        </div>
        <button
          type="button"
          id="btn-cart-switch-employee"
          onClick={lockScreen}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
          title="Ganti Akun Kasir atau Login Otoritas Supervisor / Owner (Alt+L)"
        >
          <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>Ganti Akun</span>
        </button>
      </div>

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

        {/* Customer Discount Quick Highlight */}
        {selectedCustomer && (
          customerDiscount ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 text-[11px] shadow-2xs animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-bold text-indigo-950 dark:text-indigo-200 truncate">
                  {customerDiscount.title}
                </span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                  (-{formatCurrency(customerDiscountAmount, settings.currency)})
                </span>
              </div>
              <button
                type="button"
                onClick={removeCustomerDiscount}
                className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold ml-2 cursor-pointer shrink-0"
                title="Hapus diskon khusus member ini"
              >
                Hapus
              </button>
            </div>
          ) : customerDiscountSuggestions.filter((s) => s.isApplicable).length > 0 ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/20 border border-amber-200 dark:border-emerald-800/60 text-[11px] shadow-2xs animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-bounce" />
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  Tersedia <strong>{customerDiscountSuggestions.filter((s) => s.isApplicable).length}</strong> saran diskon untuk {selectedCustomer.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const top = customerDiscountSuggestions.find((s) => s.isApplicable);
                  if (top) applyCustomerDiscount(top);
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer shrink-0 transition-transform active:scale-95 shadow-2xs"
                title="Klaim diskon rekomendasi terbaik"
              >
                Klaim Cepat
              </button>
            </div>
          ) : null
        )}
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

      {/* Gemini AI Smart Upsell strip (Desktop/Tablet only) */}
      {cart.length > 0 && aiUpsellSuggestions.length > 0 && (
        <div className="hidden sm:block p-2.5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border-t border-emerald-500/30 text-white space-y-2 shrink-0 animate-in fade-in">
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
                  {appliedVoucher.minProfitMargin && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                      Margin ≥ {appliedVoucher.minProfitMargin}%
                    </span>
                  )}
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

            {/* Customer Loyalty & History-Based Discount Suggestions Accordion */}
            {selectedCustomer ? (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 text-xs overflow-hidden shadow-2xs">
                {/* Header */}
                <div
                  onClick={() => setIsDiscountSuggestionsOpen(!isDiscountSuggestionsOpen)}
                  className="p-2.5 flex items-center justify-between cursor-pointer select-none hover:bg-indigo-100/40 dark:hover:bg-indigo-950/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Diskon Loyalitas & Riwayat Belanja
                        </span>
                        {customerDiscount && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {customerDiscount
                          ? `Terpasang: ${customerDiscount.title} (-${formatCurrency(customerDiscountAmount, settings.currency)})`
                          : `${customerDiscountSuggestions.filter((s) => s.isApplicable).length} saran promo siap klaim untuk ${selectedCustomer.name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {customerDiscount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomerDiscount();
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Batalkan diskon ini"
                      >
                        Hapus
                      </button>
                    )}
                    {isDiscountSuggestionsOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Suggestions List Body */}
                {isDiscountSuggestionsOpen && (
                  <div className="p-2.5 pt-0 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2">
                    {/* Active Discount Banner if applied */}
                    {customerDiscount && (
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-900 dark:text-emerald-200">
                              {customerDiscount.title}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                              {customerDiscount.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-tight">
                            {customerDiscount.reason}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300">
                            -{formatCurrency(customerDiscountAmount, settings.currency)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Suggestions list */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {customerDiscountSuggestions.length > 0 ? (
                        customerDiscountSuggestions.map((suggestion) => {
                          const isCurrentlyApplied = customerDiscount?.id === suggestion.id;

                          return (
                            <div
                              key={suggestion.id}
                              className={`p-2 rounded-lg border transition-all text-[11px] ${
                                isCurrentlyApplied
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                                  : suggestion.isApplicable
                                  ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {suggestion.title}
                                    </span>
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      {suggestion.badge}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                    {suggestion.reason}
                                  </p>
                                  {!suggestion.isApplicable && suggestion.unmetSpendAmount && suggestion.unmetSpendAmount > 0 && (
                                    <p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold pt-0.5">
                                      Belanja kurang {formatCurrency(suggestion.unmetSpendAmount, settings.currency)} untuk dapat menggunakan promo ini.
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-xs">
                                    -{formatCurrency(suggestion.amount, settings.currency)}
                                  </span>

                                  {isCurrentlyApplied ? (
                                    <button
                                      type="button"
                                      onClick={() => removeCustomerDiscount()}
                                      className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Terpasang</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!suggestion.isApplicable}
                                      onClick={() => applyCustomerDiscount(suggestion)}
                                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                                        suggestion.isApplicable
                                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs active:scale-95'
                                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                      }`}
                                    >
                                      Terapkan
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-slate-400 italic text-center py-2">
                          Belum ada diskon riwayat yang cocok untuk produk di keranjang saat ini.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full p-2.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left flex items-center justify-between text-[11px] text-indigo-900 dark:text-indigo-300 transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span>Pilih Member untuk klaim <strong>Diskon Loyalitas Tier & Riwayat Belanja</strong></span>
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  Pilih Member &rarr;
                </span>
              </button>
            )}

            {/* Interactive Loyalty Points Redemption Card */}
            {selectedCustomer && selectedCustomer.points > 0 ? (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-slate-900 border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Award className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Diskon Poin Loyalitas</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-200/60 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                          {selectedCustomer.tier}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Saldo: <strong className="text-amber-700 dark:text-amber-400">{selectedCustomer.points} Pts</strong> (Setara {formatCurrency(selectedCustomer.points * (pointRedemptionRate || 100), settings.currency)})
                      </p>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => setUsePoints(!usePoints)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      usePoints
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                    }`}
                  >
                    {usePoints ? 'Aktif' : 'Gunakan'}
                  </button>
                </div>

                {usePoints && (
                  <div className="pt-2 border-t border-amber-200/70 dark:border-amber-900/50 space-y-2 animate-in fade-in duration-150">
                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">Preset:</span>
                      {[10, 50, 100].map((roundPts) => (
                        maxRedeemablePoints >= roundPts ? (
                          <button
                            key={roundPts}
                            type="button"
                            onClick={() => setPointsToRedeem(roundPts)}
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition cursor-pointer ${
                              pointsToRedeem === roundPts
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500'
                            }`}
                          >
                            {roundPts} Pts
                          </button>
                        ) : null
                      ))}
                      <button
                        type="button"
                        onClick={() => setPointsToRedeem(Math.floor(maxRedeemablePoints * 0.5))}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500 cursor-pointer"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                          pointsToRedeem === maxRedeemablePoints
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500'
                        }`}
                      >
                        Semua ({maxRedeemablePoints} Pts)
                      </button>
                    </div>

                    {/* Stepper / Input */}
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900/90 p-1.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[10px] text-slate-400">Poin Ditukar:</span>
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemablePoints}
                          step={1}
                          value={pointsToRedeem || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setPointsToRedeem(Math.min(maxRedeemablePoints, Math.max(0, Math.floor(val))));
                          }}
                          className="w-20 px-2 py-0.5 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="0"
                        />
                        <span className="text-[10px] text-slate-500">Pts</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">Potongan:</span>
                        <span className="font-bold font-mono text-xs text-amber-600 dark:text-amber-400">
                          -{formatCurrency(pointsDiscount, settings.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>Sisa Poin: <strong className="text-slate-700 dark:text-slate-300">{Math.max(0, selectedCustomer.points - pointsToRedeem)}</strong> pts</span>
                      <span>Dapat Belanja Ini: <strong className="text-emerald-600 dark:text-emerald-400">+{estimatedPoints}</strong> pts</span>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedCustomer ? (
              <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Member: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.points} Poin)</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  + {estimatedPoints} Poin transaksi ini
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pilih member untuk klaim diskon poin loyalitas</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Pilih Member &rarr;</span>
              </button>
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

          {customerDiscountAmount > 0 && customerDiscount && (
            <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Diskon Member ({customerDiscount.title})</span>
              </span>
              <span className="font-mono">-{formatCurrency(customerDiscountAmount, settings.currency)}</span>
            </div>
          )}

          {voucherDiscount > 0 && appliedVoucher && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                <span>Voucher Promo ({appliedVoucher.code})</span>
              </span>
              <span className="font-mono">-{formatCurrency(voucherDiscount, settings.currency)}</span>
            </div>
          )}

          {pointsDiscount > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Poin Loyalitas ({pointsToRedeem} Pts)</span>
              </span>
              <span className="font-mono">-{formatCurrency(pointsDiscount, settings.currency)}</span>
            </div>
          )}

          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold border-t border-dashed border-slate-200 dark:border-slate-800 pt-1">
              <span>Total Diskon</span>
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
                <p className="hidden sm:flex text-[9px] text-amber-700 dark:text-amber-400/90 leading-tight pt-0.5 items-start gap-1">
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
            <span className="hidden sm:inline text-[10px] px-1 py-0.2 rounded bg-slate-950/20 text-slate-950 font-mono ml-1 font-bold">F9</span>
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
