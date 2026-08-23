import React, { useState } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  Plus,
  Minus,
  Edit3,
  Check,
  X,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Truck,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Building2,
  ShieldAlert,
  Percent,
  Receipt,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Product, PurchaseReturn, PurchaseReturnItem, SupplierPurchase, SupplierPurchaseItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ReceivingItem {
  productId: string;
  quantity: number;
  costPrice: number;
  expiryDate?: string;
}

interface SupplierReturnItemRow {
  productId: string;
  quantity: number;
  costPrice: number;
  expiryDate?: string;
}

export const InventoryView: React.FC = () => {
  const {
    products,
    updateProductStock,
    settings,
    openGeminiCopilot,
    purchaseReturns,
    processPurchaseReturn,
    supplierPurchases,
    processSupplierPurchase,
  } = usePOS();
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases' | 'returns'>('inventory');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');

  // Supplier Goods Receiving Modal State with VAT/PPN & Discount Adjustments
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('PT Indomarco Adi Prima (Indofood)');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-SUP-${Date.now().toString().slice(-6)}`);
  const [paymentTerms, setPaymentTerms] = useState('Tunai / Cash');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [ppnRate, setPpnRate] = useState<number>(11);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([
    { productId: products[0]?.id || '', quantity: 24, costPrice: products[0]?.costPrice || 0, expiryDate: '2027-06-30' },
  ]);

  // Supplier Purchase Return Modal State
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnSupplierName, setReturnSupplierName] = useState('PT Indomarco Adi Prima (Indofood)');
  const [returnRefInvoice, setReturnRefInvoice] = useState('');
  const [returnReason, setReturnReason] = useState('Barang Rusak / Bad Stock');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<SupplierReturnItemRow[]>([
    { productId: products[0]?.id || '', quantity: 1, costPrice: products[0]?.costPrice || 0 },
  ]);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'return'; text: string } | null>(null);

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalValuation = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);

  const filteredProducts = products.filter((p) => {
    const query = search.toLowerCase();
    const matchQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.barcode.includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query));
    const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
    return matchQuery && matchCat;
  });

  const filteredPurchases = supplierPurchases.filter((p) => {
    const query = search.toLowerCase();
    return (
      p.invoiceNumber.toLowerCase().includes(query) ||
      p.supplierName.toLowerCase().includes(query) ||
      p.items.some((i) => i.productName.toLowerCase().includes(query))
    );
  });

  const filteredPurchaseReturns = purchaseReturns.filter((r) => {
    const query = search.toLowerCase();
    return (
      r.returnNumber.toLowerCase().includes(query) ||
      r.supplierName.toLowerCase().includes(query) ||
      (r.referenceInvoice && r.referenceInvoice.toLowerCase().includes(query)) ||
      r.items.some((i) => i.productName.toLowerCase().includes(query))
    );
  });

  const handleOpenAdjust = (prod: Product) => {
    setEditingProduct(prod);
    setAdjustmentValue(0);
    setAdjustmentType('add');
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    let newStock = editingProduct.stock;
    if (adjustmentType === 'add') {
      newStock += adjustmentValue;
    } else if (adjustmentType === 'subtract') {
      newStock = Math.max(0, newStock - adjustmentValue);
    } else {
      newStock = Math.max(0, adjustmentValue);
    }

    updateProductStock(editingProduct.id, newStock);
    setEditingProduct(null);
  };

  // Handle Goods Receiving from Supplier
  const handleAddReceivingRow = () => {
    const available = products.find((p) => !receivingItems.some((item) => item.productId === p.id)) || products[0];
    if (available) {
      setReceivingItems([
        ...receivingItems,
        {
          productId: available.id,
          quantity: 12,
          costPrice: available.costPrice,
          expiryDate: available.expiryDate || '2027-12-31',
        },
      ]);
    }
  };

  const handleRemoveReceivingRow = (index: number) => {
    setReceivingItems(receivingItems.filter((_, idx) => idx !== index));
  };

  const handleReceivingItemChange = (index: number, field: keyof ReceivingItem, value: any) => {
    const updated = [...receivingItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        updated[index].costPrice = prod.costPrice;
        if (prod.expiryDate) updated[index].expiryDate = prod.expiryDate;
      }
    }
    setReceivingItems(updated);
  };

  // Calculations for Supplier Purchase Receiving
  const grossReceivingAmount = receivingItems.reduce((sum, item) => {
    return sum + (item.quantity * item.costPrice);
  }, 0);

  const discountAmount = discountType === 'percentage'
    ? Math.round((grossReceivingAmount * Math.max(0, discountRate)) / 100)
    : Math.min(grossReceivingAmount, Math.max(0, discountRate));

  const dppAmount = Math.max(0, grossReceivingAmount - discountAmount);
  const ppnAmount = Math.round((dppAmount * Math.max(0, ppnRate)) / 100);
  const finalReceivingTotal = dppAmount + ppnAmount;

  const handleSubmitReceiving = (e: React.FormEvent) => {
    e.preventDefault();
    if (receivingItems.length === 0) return;

    const mappedItems: SupplierPurchaseItem[] = receivingItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: prod?.name || 'Produk',
        quantity: item.quantity,
        costPrice: item.costPrice,
        subtotal: item.quantity * item.costPrice,
        expiryDate: item.expiryDate,
      };
    });

    processSupplierPurchase({
      invoiceNumber,
      supplierName,
      paymentTerms,
      items: mappedItems,
      grossAmount: grossReceivingAmount,
      discountType,
      discountRate,
      discountAmount,
      dppAmount,
      ppnRate,
      ppnAmount,
      finalTotal: finalReceivingTotal,
      receivedBy: 'Supervisor Gudang',
      notes: purchaseNotes || undefined,
    });

    const totalPcs = receivingItems.reduce((sum, item) => sum + item.quantity, 0);

    setNotificationMsg({
      type: 'success',
      text: `Faktur Pembelian ${invoiceNumber} berhasil dicatat! ${totalPcs} unit barang dari ${supplierName} ditambahkan ke stok (DPP: ${formatCurrency(dppAmount, settings.currency)}, PPN: ${formatCurrency(ppnAmount, settings.currency)}, Diskon: ${formatCurrency(discountAmount, settings.currency)}).`,
    });
    setIsReceivingOpen(false);
    setInvoiceNumber(`INV-SUP-${Date.now().toString().slice(-6)}`);
    setDiscountRate(0);
    setPurchaseNotes('');
    setTimeout(() => setNotificationMsg(null), 6000);
  };

  // Handle Supplier Purchase Return
  const handleAddReturnRow = () => {
    const available = products.find((p) => !returnItems.some((item) => item.productId === p.id)) || products[0];
    if (available) {
      setReturnItems([
        ...returnItems,
        {
          productId: available.id,
          quantity: 1,
          costPrice: available.costPrice,
          expiryDate: available.expiryDate,
        },
      ]);
    }
  };

  const handleRemoveReturnRow = (index: number) => {
    setReturnItems(returnItems.filter((_, idx) => idx !== index));
  };

  const handleReturnItemChange = (index: number, field: keyof SupplierReturnItemRow, value: any) => {
    const updated = [...returnItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        updated[index].costPrice = prod.costPrice;
        if (prod.expiryDate) updated[index].expiryDate = prod.expiryDate;
      }
    }
    setReturnItems(updated);
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => {
    return sum + (item.quantity * item.costPrice);
  }, 0);

  const handleSubmitSupplierReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnItems.length === 0) return;

    const returnNumber = `RET-SUP-${Date.now().toString().slice(-6)}`;
    const mappedItems: PurchaseReturnItem[] = returnItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: prod?.name || 'Produk',
        quantity: item.quantity,
        costPrice: item.costPrice,
        totalAmount: item.quantity * item.costPrice,
        expiryDate: item.expiryDate,
      };
    });

    processPurchaseReturn({
      returnNumber,
      supplierName: returnSupplierName,
      referenceInvoice: returnRefInvoice || undefined,
      reason: returnReason,
      items: mappedItems,
      totalAmount: totalReturnAmount,
      status: 'completed',
      processedBy: 'Supervisor Gudang',
      notes: returnNotes,
    });

    const totalQty = returnItems.reduce((s, i) => s + i.quantity, 0);
    setNotificationMsg({
      type: 'return',
      text: `Surat Retur ${returnNumber} diproses! ${totalQty} unit barang telah dikeluarkan dari stok untuk dikembalikan ke ${returnSupplierName}.`,
    });
    setIsReturnOpen(false);
    setReturnRefInvoice('');
    setReturnNotes('');
    setTimeout(() => setNotificationMsg(null), 6000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Success Notification Banner */}
      {notificationMsg && (
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in ${
            notificationMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : (
              <RotateCcw className="w-4 h-4 text-rose-200" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span>Inventaris, Pembelian & Retur Supplier</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Pelacakan stok per rak (FEFO), input pembelian supplier (PPN & Diskon), dan retur barang distributor
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Stok Produk ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-300 hover:text-emerald-400'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Faktur Pembelian ({supplierPurchases.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-300 hover:text-rose-400'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retur Pembelian ({purchaseReturns.length})</span>
            </button>
          </div>
        </div>

        {/* Action & Metric Badges */}
        <div className="flex items-center gap-2.5">
          {/* INPUT PEMBELIAN / PENERIMAAN SUPPLIER */}
          <button
            onClick={() => setIsReceivingOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
          >
            <Truck className="w-4 h-4" />
            <span>+ Input Pembelian Supplier</span>
          </button>

          {/* INPUT RETUR PEMBELIAN KE SUPPLIER */}
          <button
            onClick={() => setIsReturnOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>+ Retur ke Supplier</span>
          </button>

          {/* AI RESTOCK FORECAST TRIGGER */}
          <button
            onClick={() => openGeminiCopilot('forecast')}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span>Prediksi AI</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'inventory'
                  ? 'Cari nama produk, brand, SKU, barcode...'
                  : activeTab === 'purchases'
                  ? 'Cari no. faktur supplier, nama distributor, item...'
                  : 'Cari no. retur, nama supplier, invoice...'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {activeTab === 'inventory' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option value="sembako">Sembako & Pokok</option>
              <option value="beverages">Minuman & Susu</option>
              <option value="snacks">Snack & Biskuit</option>
              <option value="instant">Makanan Instan</option>
              <option value="personal_care">Perawatan Diri</option>
              <option value="household">Kebersihan Rumah</option>
              <option value="dairy">Dairy & Fresh</option>
            </select>
          )}
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200">
              Total: <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{products.length} SKU</span> ({totalStockUnits} pcs)
            </div>
            {lowStockCount > 0 && (
              <div className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{lowStockCount} Kritis</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {activeTab === 'inventory' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Informasi Produk</th>
                  <th className="py-3 px-4">Brand & Lorong</th>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4 text-right">Harga Modal (HPP)</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-center">Sisa Stok</th>
                  <th className="py-3 px-4 text-center">Status & FEFO</th>
                  <th className="py-3 px-4 text-right">Penyesuaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredProducts.map((prod) => {
                  const isLow = prod.stock <= prod.minStock;
                  const isZero = prod.stock === 0;
                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Product Title (No Image Preview) */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {prod.name}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Satuan: {prod.unit}
                          </span>
                        </div>
                      </td>

                      {/* Brand & Aisle */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {prod.brand || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {prod.aisle || 'Rak Reguler'}
                        </div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="font-bold">{prod.sku}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">{prod.barcode}</div>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(prod.costPrice, settings.currency)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(prod.price, settings.currency)}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-black text-sm ${
                            isZero
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {prod.stock}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                          min: {prod.minStock}
                        </span>
                      </td>

                      {/* Status / FEFO */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isZero ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              HABIS
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              MENIPIS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              AMAN
                            </span>
                          )}

                          {prod.expiryDate && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Exp: {prod.expiryDate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenAdjust(prod)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Koreksi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'purchases' ? (
            /* Supplier Purchases Invoices Table (PPN & Diskon Included) */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Faktur / Waktu</th>
                  <th className="py-3 px-4">Supplier & Syarat</th>
                  <th className="py-3 px-4">Barang Dibeli</th>
                  <th className="py-3 px-4 text-right">Diskon & DPP</th>
                  <th className="py-3 px-4 text-right">PPN Masukan</th>
                  <th className="py-3 px-4 text-right">Total Tagihan Faktur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purch) => (
                    <tr key={purch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {purch.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(purch.createdAt)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {purch.supplierName}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {purch.paymentTerms}
                        </div>
                        {purch.notes && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                            {purch.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {purch.items.map((i, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {i.quantity}x {i.productName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                @{formatCurrency(i.costPrice, settings.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {purch.discountAmount > 0 ? (
                          <div className="text-rose-600 dark:text-rose-400 text-[11px]">
                            Diskon: -{formatCurrency(purch.discountAmount, settings.currency)} ({purch.discountRate}{purch.discountType === 'percentage' ? '%' : ' Rp'})
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[10px]">Tanpa Diskon</div>
                        )}
                        <div className="font-bold text-slate-900 dark:text-white">
                          DPP: {formatCurrency(purch.dppAmount, settings.currency)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block mb-1">
                          PPN {purch.ppnRate}%
                        </span>
                        <div className="text-slate-900 dark:text-white font-bold">
                          +{formatCurrency(purch.ppnAmount, settings.currency)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(purch.finalTotal, settings.currency)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-400">
                      Belum ada riwayat faktur pembelian supplier. Klik <b>"+ Input Pembelian Supplier"</b> untuk menambah faktur pertama.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* Purchase Returns Table */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Retur / Waktu</th>
                  <th className="py-3 px-4">Supplier & Ref Faktur</th>
                  <th className="py-3 px-4">Alasan Retur</th>
                  <th className="py-3 px-4">Daftar Produk Diretur</th>
                  <th className="py-3 px-4 text-right">Total Nilai Retur (HPP)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPurchaseReturns.length > 0 ? (
                  filteredPurchaseReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-rose-600 dark:text-rose-400">
                          {ret.returnNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(ret.createdAt)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {ret.supplierName}
                        </div>
                        {ret.referenceInvoice && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Ref: {ret.referenceInvoice}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <ShieldAlert className="w-3 h-3" />
                          <span>{ret.reason}</span>
                        </span>
                        {ret.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                            {ret.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {ret.items.map((i, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {i.quantity}x {i.productName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                @{formatCurrency(i.costPrice, settings.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                          {formatCurrency(ret.totalAmount, settings.currency)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          DIKEMBALIKAN
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-400">
                      Belum ada riwayat retur pembelian ke supplier tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Koreksi Stok Fisik
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingProduct.name} (Sisa saat ini: {editingProduct.stock})
              </p>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-3">
              <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('add')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    adjustmentType === 'add' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  + Tambah
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('subtract')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    adjustmentType === 'subtract' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  - Kurang
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('set')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    adjustmentType === 'set' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Set Baru
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                  Jumlah Penyesuaian:
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                  className="w-full p-2 text-center font-mono font-bold text-base rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Simpan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Purchase / Receiving Modal (with VAT/PPN & Discount Adjustments) */}
      {isReceivingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Input Pembelian Melalui Supplier (Faktur Pembelian)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tambah stok gudang, update harga beli (HPP), serta sesuaikan Diskon dan PPN supplier
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReceivingOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitReceiving} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-5 space-y-4 flex-1">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Nama Supplier / Distributor
                    </label>
                    <select
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="PT Indomarco Adi Prima (Indofood)">PT Indomarco (Indofood)</option>
                      <option value="PT Wings Surya (Wings)">PT Wings Surya</option>
                      <option value="PT Unilever Indonesia Tbk">PT Unilever Indonesia</option>
                      <option value="PT Mayora Indah Tbk">PT Mayora Indah</option>
                      <option value="Distributor Sembako & Beras Nusantara">Distributor Sembako & Beras</option>
                      <option value="Agen Telur & Fresh Farm">Agen Telur & Fresh Farm</option>
                      <option value="Supplier Lainnya / Grosir Lokal">Supplier Lainnya / Grosir Lokal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      No. Faktur / Surat Jalan Supplier
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full p-2 font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Syarat Pembayaran
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Tunai / Cash">Tunai / Cash (Lunas)</option>
                      <option value="Tempo 7 Hari">Tempo TOP 7 Hari</option>
                      <option value="Tempo 14 Hari">Tempo TOP 14 Hari</option>
                      <option value="Tempo 30 Hari">Tempo TOP 30 Hari</option>
                      <option value="Konsinyasi / Titip Jual">Konsinyasi / Titip Jual</option>
                    </select>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Daftar Barang Yang Dibeli dari Supplier</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddReceivingRow}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Produk</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Produk / SKU</th>
                          <th className="py-2.5 px-3 w-24">Jumlah Masuk</th>
                          <th className="py-2.5 px-3 w-32">Harga Beli Satuan (HPP)</th>
                          <th className="py-2.5 px-3 w-28">Exp Date (FEFO)</th>
                          <th className="py-2.5 px-3 text-right w-32">Subtotal (Rp)</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {receivingItems.map((item, idx) => {
                          const subtotal = item.quantity * item.costPrice;
                          return (
                            <tr key={idx} className="bg-white dark:bg-slate-900/60">
                              <td className="py-2 px-3">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleReceivingItemChange(idx, 'productId', e.target.value)}
                                  className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium text-xs truncate"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      [{p.brand || p.sku}] {p.name} (Stok: {p.stock})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min={1}
                                  required
                                  value={item.quantity || ''}
                                  onChange={(e) => handleReceivingItemChange(idx, 'quantity', Number(e.target.value))}
                                  className="w-full p-1.5 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  required
                                  value={item.costPrice || ''}
                                  onChange={(e) => handleReceivingItemChange(idx, 'costPrice', Number(e.target.value))}
                                  className="w-full p-1.5 text-right font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={item.expiryDate || ''}
                                  onChange={(e) => handleReceivingItemChange(idx, 'expiryDate', e.target.value)}
                                  className="w-full p-1.5 font-mono text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrency(subtotal, settings.currency)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {receivingItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveReceivingRow(idx)}
                                    className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
                                    title="Hapus baris"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Penyesuaian Diskon & PPN Pembelian Supplier Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  {/* PENYESUAIAN DISKON SUPPLIER */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-amber-500" />
                        <span>Penyesuaian Diskon Pembelian Supplier</span>
                      </label>
                      <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setDiscountType('percentage')}
                          className={`px-2 py-0.5 rounded-md cursor-pointer ${
                            discountType === 'percentage'
                              ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Persen (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('nominal')}
                          className={`px-2 py-0.5 rounded-md cursor-pointer ${
                            discountType === 'nominal'
                              ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Nominal (Rp)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={discountType === 'percentage' ? 100 : grossReceivingAmount}
                        value={discountRate}
                        onChange={(e) => setDiscountRate(Math.max(0, Number(e.target.value)))}
                        placeholder={discountType === 'percentage' ? 'Contoh: 5%' : 'Contoh: 50000'}
                        className="flex-1 p-2 font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex gap-1">
                        {[0, 2, 5, 10].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setDiscountType('percentage');
                              setDiscountRate(preset);
                            }}
                            className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border cursor-pointer ${
                              discountType === 'percentage' && discountRate === preset
                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between font-mono">
                      <span>Potongan Diskon:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(discountAmount, settings.currency)}
                      </span>
                    </div>
                  </div>

                  {/* PENYESUAIAN PPN MASUKAN (PAJAK SUPPLIER) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-500" />
                        <span>Penyesuaian PPN Masukan (Faktur Pajak)</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Tarif: {ppnRate}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ppnRate}
                        onChange={(e) => setPpnRate(Math.max(0, Number(e.target.value)))}
                        placeholder="Contoh: 11"
                        className="w-24 p-2 font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 text-center"
                      />
                      <div className="flex gap-1 flex-1">
                        {[
                          { label: '0% Non-PPN', val: 0 },
                          { label: '11% PPN Standar', val: 11 },
                          { label: '12% PPN Baru', val: 12 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setPpnRate(preset.val)}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border cursor-pointer ${
                              ppnRate === preset.val
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between font-mono">
                      <span>Nilai Pajak PPN ({ppnRate}%):</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        +{formatCurrency(ppnAmount, settings.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                    Catatan Pembelian / No. PO
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PO-2026-088 / Diskon promo distributor awal bulan..."
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Detailed Accounting Breakdown Card */}
                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pb-2 border-b border-emerald-200 dark:border-emerald-800/60">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Subtotal Bruto:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(grossReceivingAmount, settings.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Diskon Supplier:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(discountAmount, settings.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Dasar Pengenaan Pajak (DPP):</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(dppAmount, settings.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">PPN ({ppnRate}%):</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        +{formatCurrency(ppnAmount, settings.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold block text-xs">
                        Total Tagihan Faktur Pembelian (Bersih):
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {receivingItems.reduce((sum, item) => sum + item.quantity, 0)} total pcs barang akan ditambahkan ke inventaris toko
                      </span>
                    </div>
                    <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(finalReceivingTotal, settings.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReceivingOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 transition-all active:scale-95 text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Proses & Tambah ke Stok Toko</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Purchase Return Modal */}
      {isReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Form Retur Pembelian ke Supplier (Pengembalian Barang)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Keluarkan barang rusak/kadaluarsa dari stok toko dan buat nota retur distributor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitSupplierReturn} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-5 space-y-4 flex-1">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Nama Supplier Tujuan
                    </label>
                    <select
                      value={returnSupplierName}
                      onChange={(e) => setReturnSupplierName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="PT Indomarco Adi Prima (Indofood)">PT Indomarco (Indofood)</option>
                      <option value="PT Wings Surya (Wings)">PT Wings Surya</option>
                      <option value="PT Unilever Indonesia Tbk">PT Unilever Indonesia</option>
                      <option value="PT Mayora Indah Tbk">PT Mayora Indah</option>
                      <option value="Distributor Sembako & Beras Nusantara">Distributor Sembako & Beras</option>
                      <option value="Agen Telur & Fresh Farm">Agen Telur & Fresh Farm</option>
                      <option value="Supplier Lainnya / Grosir Lokal">Supplier Lainnya / Grosir Lokal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Alasan Retur Supplier
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Barang Rusak / Bad Stock">Barang Rusak / Bad Stock</option>
                      <option value="Kadaluarsa / Near Expired (FEFO)">Kadaluarsa / Near Expired (FEFO)</option>
                      <option value="Salah Kirim / Tidak Sesuai PO">Salah Kirim / Tidak Sesuai PO</option>
                      <option value="Kelebihan Qty Kiriman">Kelebihan Qty Kiriman</option>
                      <option value="Kemasan Bocor / Segel Terbuka">Kemasan Bocor / Segel Terbuka</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      No. Faktur Pembelian Asal (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: INV-SUP-9821..."
                      value={returnRefInvoice}
                      onChange={(e) => setReturnRefInvoice(e.target.value)}
                      className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-rose-500" />
                      <span>Daftar Barang Yang Dikembalikan</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddReturnRow}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Produk / SKU</th>
                          <th className="py-2.5 px-3 w-28">Jumlah Retur</th>
                          <th className="py-2.5 px-3 w-32">Harga Beli (HPP)</th>
                          <th className="py-2.5 px-3 text-right w-32">Subtotal Retur</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {returnItems.map((item, idx) => {
                          const prod = products.find((p) => p.id === item.productId);
                          const subtotal = item.quantity * item.costPrice;
                          return (
                            <tr key={idx} className="bg-white dark:bg-slate-900/60">
                              <td className="py-2 px-3">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleReturnItemChange(idx, 'productId', e.target.value)}
                                  className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium text-xs truncate"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      [{p.brand || p.sku}] {p.name} (Tersedia: {p.stock})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min={1}
                                  max={prod ? prod.stock : 999}
                                  required
                                  value={item.quantity || ''}
                                  onChange={(e) => handleReturnItemChange(idx, 'quantity', Number(e.target.value))}
                                  className="w-full p-1.5 text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  required
                                  value={item.costPrice || ''}
                                  onChange={(e) => handleReturnItemChange(idx, 'costPrice', Number(e.target.value))}
                                  className="w-full p-1.5 text-right font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(subtotal, settings.currency)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {returnItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveReturnRow(idx)}
                                    className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
                                    title="Hapus baris"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                    Catatan Khusus Retur
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Barang kadaluarsa dititipkan ke sales kanvas yang berkunjung..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Total Summary Footer Box */}
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-rose-800 dark:text-rose-300 font-semibold block text-xs">
                      Total Nilai Klaim Retur Supplier:
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {returnItems.reduce((sum, item) => sum + item.quantity, 0)} total pcs barang akan dikurangkan dari stok toko
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
                    {formatCurrency(totalReturnAmount, settings.currency)}
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReturnOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Proses Retur & Potong Stok Toko</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

