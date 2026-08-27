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
  Camera,
  Video,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  SlidersHorizontal,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Product, PurchaseReturn, PurchaseReturnItem, SupplierPurchase, SupplierPurchaseItem, Supplier } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { printViaIframe, exportToCSV } from '../../utils/printHelper';
import { AIInvoiceScannerModal } from '../AIInvoiceScannerModal';
import { AIVisualStockOpnameModal } from '../AIVisualStockOpnameModal';
import { ProductFormModal } from '../ProductFormModal';
import { SupplierFormModal } from '../SupplierFormModal';
import { PriceTagModal } from '../PriceTagModal';

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
    deleteProduct,
    settings,
    openGeminiCopilot,
    purchaseReturns,
    processPurchaseReturn,
    supplierPurchases,
    processSupplierPurchase,
    suppliers,
    deleteSupplier,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers' | 'purchases' | 'returns'>('inventory');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Supplier Tab Filter State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');

  // Master Item (Product) Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Price Tag Modal State (A4 / F4)
  const [isPriceTagModalOpen, setIsPriceTagModalOpen] = useState(false);
  const [productForPriceTag, setProductForPriceTag] = useState<Product | null>(null);
  const [purchaseForPriceTag, setPurchaseForPriceTag] = useState<SupplierPurchase | null>(null);

  // Master Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Fast Stock Correction Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');

  // Supplier Goods Receiving Modal State with VAT/PPN & Discount Adjustments
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [isAiInvoiceScannerOpen, setIsAiInvoiceScannerOpen] = useState(false);
  const [isAiStockOpnameOpen, setIsAiStockOpnameOpen] = useState(false);
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || 'PT Indomarco Adi Prima (Indofood)');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-SUP-${Date.now().toString().slice(-6)}`);
  const [paymentTerms, setPaymentTerms] = useState(suppliers[0]?.paymentTerms || 'Tunai / Cash');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [ppnRate, setPpnRate] = useState<number>(11);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([
    { productId: products[0]?.id || '', quantity: 24, costPrice: products[0]?.costPrice || 0, expiryDate: '2027-06-30' },
  ]);

  // Supplier Purchase Return Modal State
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnSupplierName, setReturnSupplierName] = useState(suppliers[0]?.name || 'PT Indomarco Adi Prima (Indofood)');
  const [returnRefInvoice, setReturnRefInvoice] = useState('');
  const [returnReason, setReturnReason] = useState('Barang Rusak / Bad Stock');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<SupplierReturnItemRow[]>([
    { productId: products[0]?.id || '', quantity: 1, costPrice: products[0]?.costPrice || 0 },
  ]);

  const [notificationMsg, setNotificationMsg] = useState<{
    type: 'success' | 'return' | 'delete';
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

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

  const filteredSuppliers = suppliers.filter((s) => {
    const query = (activeTab === 'suppliers' ? supplierSearch || search : search).toLowerCase();
    const matchQuery =
      !query ||
      s.name.toLowerCase().includes(query) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
      s.phone.toLowerCase().includes(query) ||
      (s.category && s.category.toLowerCase().includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query));
    const matchCat =
      supplierCategoryFilter === 'all' || (s.category && s.category.toLowerCase().includes(supplierCategoryFilter.toLowerCase()));
    return matchQuery && matchCat;
  });

  const filteredPurchases = supplierPurchases.filter((purch) => {
    const query = search.toLowerCase();
    return (
      !query ||
      purch.invoiceNumber.toLowerCase().includes(query) ||
      purch.supplierName.toLowerCase().includes(query)
    );
  });

  const filteredReturns = purchaseReturns.filter((ret) => {
    const query = search.toLowerCase();
    return (
      !query ||
      ret.returnNumber.toLowerCase().includes(query) ||
      ret.supplierName.toLowerCase().includes(query) ||
      (ret.referenceInvoiceNumber && ret.referenceInvoiceNumber.toLowerCase().includes(query))
    );
  });

  // Calculate purchase stats per supplier
  const getSupplierPurchasesSummary = (suppName: string) => {
    const matches = supplierPurchases.filter((p) => p.supplierName.toLowerCase() === suppName.toLowerCase());
    const count = matches.length;
    const totalAmount = matches.reduce((sum, p) => sum + p.totalAmount, 0);
    return { count, totalAmount };
  };

  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleConfirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setNotificationMsg({
        type: 'delete',
        text: `Produk "${productToDelete.name}" (${productToDelete.sku}) berhasil dihapus dari master data.`,
      });
      setTimeout(() => setNotificationMsg(null), 5000);
      setProductToDelete(null);
    }
  };

  const handleOpenAddSupplier = () => {
    setSupplierToEdit(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setSupplierToEdit(sup);
    setIsSupplierModalOpen(true);
  };

  const handleConfirmDeleteSupplier = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setNotificationMsg({
        type: 'delete',
        text: `Supplier "${supplierToDelete.name}" berhasil dihapus dari daftar master supplier.`,
      });
      setTimeout(() => setNotificationMsg(null), 5000);
      setSupplierToDelete(null);
    }
  };

  const handleOpenAdjust = (prod: Product) => {
    setEditingProduct(prod);
    setAdjustmentValue(0);
    setAdjustmentType('add');
  };

  const handleApplyAdjustment = () => {
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

  // Goods Receiving Row Helpers
  const handleAddReceivingRow = () => {
    const firstProd = products[0];
    setReceivingItems((prev) => [
      ...prev,
      { productId: firstProd?.id || '', quantity: 12, costPrice: firstProd?.costPrice || 0, expiryDate: '2027-06-30' },
    ]);
  };

  const handleRemoveReceivingRow = (index: number) => {
    setReceivingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReceivingItemChange = (
    index: number,
    field: keyof ReceivingItem,
    value: string | number
  ) => {
    setReceivingItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      if (field === 'productId') {
        item.productId = value as string;
        const matched = products.find((p) => p.id === value);
        if (matched) {
          item.costPrice = matched.costPrice;
        }
      } else if (field === 'quantity') {
        item.quantity = Number(value);
      } else if (field === 'costPrice') {
        item.costPrice = Number(value);
      } else if (field === 'expiryDate') {
        item.expiryDate = value as string;
      }
      copy[index] = item;
      return copy;
    });
  };

  // Calculate Receiving Totals with Discount and PPN
  const receivingSubtotal = receivingItems.reduce(
    (sum, item) => sum + item.quantity * item.costPrice,
    0
  );
  const discountAmount =
    discountType === 'percentage'
      ? (receivingSubtotal * (discountRate || 0)) / 100
      : Math.min(receivingSubtotal, discountRate || 0);
  const dppAmount = Math.max(0, receivingSubtotal - discountAmount);
  const ppnAmount = (dppAmount * (ppnRate || 0)) / 100;
  const finalReceivingTotal = dppAmount + ppnAmount;

  const handleSubmitReceiving = (e: React.FormEvent) => {
    e.preventDefault();
    if (receivingItems.length === 0) return;

    const purchasePayload: Omit<SupplierPurchase, 'id' | 'createdAt'> = {
      supplierName,
      invoiceNumber: invoiceNumber.trim() || `INV-SUP-${Date.now().toString().slice(-6)}`,
      paymentTerms,
      notes: purchaseNotes.trim() || undefined,
      subtotal: receivingSubtotal,
      discountType,
      discountRate,
      discountAmount,
      dppAmount,
      ppnRate,
      ppnAmount,
      totalAmount: finalReceivingTotal,
      items: receivingItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod ? prod.name : 'Unknown Product',
          sku: prod ? prod.sku : '-',
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal: item.quantity * item.costPrice,
          expiryDate: item.expiryDate,
        };
      }),
    };

    const generatedInvoiceId = `SUP-PUR-${Date.now()}`;
    processSupplierPurchase(purchasePayload);
    setIsReceivingOpen(false);

    const createdPurchaseForModal: SupplierPurchase = {
      ...purchasePayload,
      id: generatedInvoiceId,
      createdAt: new Date().toISOString(),
    };

    setNotificationMsg({
      type: 'success',
      text: `Faktur Pembelian ${invoiceNumber} dari ${supplierName} senilai ${formatCurrency(finalReceivingTotal, settings.currency)} berhasil diproses & stok bertambah.`,
      actionLabel: 'Cetak Pricetag Faktur Ini',
      onAction: () => {
        setProductForPriceTag(null);
        setPurchaseForPriceTag(createdPurchaseForModal);
        setIsPriceTagModalOpen(true);
      },
    });
    setTimeout(() => setNotificationMsg(null), 8000);

    // Reset Form
    setInvoiceNumber(`INV-SUP-${Date.now().toString().slice(-6)}`);
    setPurchaseNotes('');
    setDiscountRate(0);
    setReceivingItems([
      { productId: products[0]?.id || '', quantity: 24, costPrice: products[0]?.costPrice || 0, expiryDate: '2027-06-30' },
    ]);
  };

  // Supplier Return Row Helpers
  const handleAddReturnRow = () => {
    const firstProd = products[0];
    setReturnItems((prev) => [
      ...prev,
      { productId: firstProd?.id || '', quantity: 1, costPrice: firstProd?.costPrice || 0 },
    ]);
  };

  const handleRemoveReturnRow = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReturnItemChange = (
    index: number,
    field: keyof SupplierReturnItemRow,
    value: string | number
  ) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      if (field === 'productId') {
        item.productId = value as string;
        const matched = products.find((p) => p.id === value);
        if (matched) {
          item.costPrice = matched.costPrice;
        }
      } else if (field === 'quantity') {
        item.quantity = Number(value);
      } else if (field === 'costPrice') {
        item.costPrice = Number(value);
      } else if (field === 'expiryDate') {
        item.expiryDate = value as string;
      }
      copy[index] = item;
      return copy;
    });
  };

  const totalReturnAmount = returnItems.reduce(
    (sum, item) => sum + item.quantity * item.costPrice,
    0
  );

  const handleSubmitSupplierReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnItems.length === 0) return;

    const returnPayload: Omit<PurchaseReturn, 'id' | 'createdAt'> = {
      returnNumber: `RET-SUP-${Date.now().toString().slice(-6)}`,
      supplierName: returnSupplierName,
      referenceInvoice: returnRefInvoice.trim() || undefined,
      referenceInvoiceNumber: returnRefInvoice.trim() || undefined,
      reason: returnReason,
      notes: returnNotes.trim() || undefined,
      totalAmount: totalReturnAmount,
      items: returnItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod ? prod.name : 'Unknown Product',
          quantity: item.quantity,
          costPrice: item.costPrice,
          totalAmount: item.quantity * item.costPrice,
          expiryDate: item.expiryDate,
        };
      }),
    };

    processPurchaseReturn(returnPayload);
    setIsReturnOpen(false);
    setNotificationMsg({
      type: 'return',
      text: `Retur ke ${returnSupplierName} senilai ${formatCurrency(totalReturnAmount, settings.currency)} berhasil dicatat & stok telah dikeluarkan.`,
    });
    setTimeout(() => setNotificationMsg(null), 6000);

    // Reset Form
    setReturnRefInvoice('');
    setReturnNotes('');
    setReturnItems([
      { productId: products[0]?.id || '', quantity: 1, costPrice: products[0]?.costPrice || 0 },
    ]);
  };

  const handleOpenPurchaseForSupplier = (sup: Supplier) => {
    setSupplierName(sup.name);
    setPaymentTerms(sup.paymentTerms || 'Tunai / Cash');
    setIsReceivingOpen(true);
  };

  const handlePrintStockSheet = () => {
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const stockHtml = `
      <div style="max-width: 900px; margin: 0 auto; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0;">${settings.storeName}</h1>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">${settings.branchName} • ${settings.address}</div>
            <div style="font-size: 11px; color: #64748b;">Telp: ${settings.phone}</div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #0f172a;">
              LEMBAR AUDIT INVENTARIS FISIK
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Total: ${products.length} Item Katalog</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>Waktu Cetak: <strong>${printedAt}</strong></div>
          <div>Filter Kategori: <strong>${categoryFilter === 'all' ? 'Semua Kategori' : categoryFilter}</strong></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px 8px; text-align: left;">Nama Produk</th>
              <th style="padding: 6px 8px; text-align: left;">SKU / Barcode</th>
              <th style="padding: 6px 8px; text-align: left;">Kategori</th>
              <th style="padding: 6px 8px; text-align: right;">Stok Sistem</th>
              <th style="padding: 6px 8px; text-align: center;">Cek Fisik (Aktual)</th>
              <th style="padding: 6px 8px; text-align: right;">Harga Modal (HPP)</th>
              <th style="padding: 6px 8px; text-align: right;">Harga Jual</th>
              <th style="padding: 6px 8px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map((p) => {
                const isLow = p.stock <= p.minStock && p.stock > 0;
                const isOut = p.stock <= 0;
                return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${p.name}</td>
                  <td style="padding: 6px 8px; font-family: monospace; color: #64748b; font-size: 10px;">${p.sku} ${p.barcode ? `• ${p.barcode}` : ''}</td>
                  <td style="padding: 6px 8px; color: #64748b;">${p.categoryId}</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">${p.stock} ${p.unit || 'pcs'}</td>
                  <td style="padding: 6px 8px; text-align: center; border-left: 1px dashed #cbd5e1; border-right: 1px dashed #cbd5e1; width: 110px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${formatCurrency(p.costPrice || 0, settings.currency)}</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #059669;">${formatCurrency(p.price, settings.currency)}</td>
                  <td style="padding: 6px 8px; text-align: center; font-size: 10px;">
                    ${isOut ? '<span style="color: #e11d48; font-weight: bold;">HABIS</span>' : isLow ? '<span style="color: #d97706; font-weight: bold;">MENIPIS</span>' : '<span style="color: #059669;">AMAN</span>'}
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid;">
          <div style="text-align: center; width: 180px;">
            <div style="font-size: 11px; color: #64748b;">Petugas Stock Opname:</div>
            <div style="margin-top: 50px; border-bottom: 1px solid #64748b;"></div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 4px;">(..................................)</div>
          </div>
          <div style="text-align: center; width: 180px;">
            <div style="font-size: 11px; color: #64748b;">Kepala Gudang / Supervisor:</div>
            <div style="margin-top: 50px; border-bottom: 1px solid #64748b;"></div>
            <div style="font-size: 11px; color: #0f172a; margin-top: 4px;">(..................................)</div>
          </div>
        </div>
      </div>
    `;

    printViaIframe(stockHtml, `Lembar_Stok_${settings.storeName.replace(/\s+/g, '_')}`, 'a4');
  };

  const handleExportStockCSV = () => {
    const filename = `Katalog_Stok_${settings.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['SKU', 'Barcode', 'Nama Produk', 'Brand', 'Kategori', 'Stok', 'Satuan', 'Min Stok', 'Harga Modal (HPP)', 'Harga Jual', 'Margin (Rp)', 'Lokasi Rak', 'Exp Date'];
    const rows = products.map((p) => [
      p.sku,
      p.barcode || '-',
      p.name,
      p.brand || '-',
      p.categoryId,
      p.stock,
      p.unit || 'pcs',
      p.minStock,
      Math.round(p.costPrice || 0),
      Math.round(p.price),
      Math.round(p.price - (p.costPrice || 0)),
      p.aisle || '-',
      p.expiryDate || '-',
    ]);
    exportToCSV(filename, headers, rows);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Top Banner / Notification */}
      {notificationMsg && (
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-500 text-slate-950'
              : notificationMsg.type === 'delete'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-rose-500 text-white'
          }`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notificationMsg.text}</span>
            </div>
            {notificationMsg.actionLabel && notificationMsg.onAction && (
              <button
                type="button"
                onClick={notificationMsg.onAction}
                className="px-2.5 py-1 rounded-lg bg-slate-950 text-white hover:bg-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>{notificationMsg.actionLabel}</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="p-1 hover:opacity-80 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span>Katalog Produk & Stok Toko</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola daftar produk, stok fisik, penerimaan faktur dari supplier, dan retur barang
            </p>
          </div>

          {/* Ergonomic Tab Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs gap-0.5">
            <button
              id="tab-btn-inventory"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Semua Produk</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {products.length}
              </span>
            </button>
            <button
              id="tab-btn-purchases"
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'purchases'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Faktur Masuk</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'purchases' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {supplierPurchases.length}
              </span>
            </button>
            <button
              id="tab-btn-suppliers"
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Supplier Mitra</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'suppliers' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {suppliers.length}
              </span>
            </button>
            <button
              id="tab-btn-returns"
              onClick={() => setActiveTab('returns')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
              <span>Retur Supplier</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'returns' ? 'bg-rose-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {purchaseReturns.length}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'inventory' && (
            <button
              id="btn-add-product"
              onClick={handleOpenAddProduct}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Produk</span>
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button
              id="btn-add-supplier"
              onClick={handleOpenAddSupplier}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Supplier</span>
            </button>
          )}

          {/* AI VISUAL STOCK OPNAME */}
          <button
            id="btn-open-ai-stock-opname"
            onClick={() => setIsAiStockOpnameOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer transition-all active:scale-95"
          >
            <Video className="w-4 h-4" />
            <span>Cek Stok AI</span>
          </button>

          {/* INPUT PEMBELIAN */}
          <button
            id="btn-open-receiving"
            onClick={() => setIsReceivingOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all active:scale-95"
          >
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>+ Terima Barang</span>
          </button>

          {/* INPUT RETUR PEMBELIAN */}
          <button
            id="btn-open-return"
            onClick={() => setIsReturnOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>+ Retur Barang</span>
          </button>

          {/* AI RESTOCK FORECAST TRIGGER */}
          <button
            onClick={() => openGeminiCopilot('forecast')}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span>Prediksi Stok AI</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={activeTab === 'suppliers' ? supplierSearch : search}
              onChange={(e) => {
                if (activeTab === 'suppliers') setSupplierSearch(e.target.value);
                else setSearch(e.target.value);
              }}
              placeholder={
                activeTab === 'inventory'
                  ? 'Cari nama produk, brand, SKU, barcode...'
                  : activeTab === 'suppliers'
                  ? 'Cari supplier, PIC, no. telepon, alamat...'
                  : activeTab === 'purchases'
                  ? 'Cari no. faktur atau nama distributor...'
                  : 'Cari no. retur atau supplier...'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filters */}
        {activeTab === 'inventory' ? (
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option value="groceries">Sembako & Beras</option>
              <option value="instant-food">Makanan Instan & Bumbu</option>
              <option value="beverages">Minuman & Kopi</option>
              <option value="snacks">Snack & Biskuit</option>
              <option value="personal-care">Perawatan Diri & Sabun</option>
              <option value="household">Pembersih Rumah Tangga</option>
              <option value="dairy">Susu & Produk Dingin</option>
              <option value="bakery">Roti & Sarapan</option>
            </select>
          </div>
        ) : activeTab === 'suppliers' ? (
          <div className="flex items-center gap-2">
            <select
              value={supplierCategoryFilter}
              onChange={(e) => setSupplierCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Kategori Pasokan</option>
              <option value="Sembako">Sembako & Bahan Pokok</option>
              <option value="Makanan">Makanan Instan & Bumbu</option>
              <option value="Minuman">Minuman & Susu</option>
              <option value="Snack">Snack & Biskuit</option>
              <option value="Perawatan">Perawatan Tubuh</option>
              <option value="Kebersihan">Kebersihan Rumah</option>
            </select>
          </div>
        ) : null}

        {/* Quick Inventory Metrics */}
        {activeTab === 'inventory' && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">
              Total Fisik: <strong className="text-slate-900 dark:text-white font-mono">{totalStockUnits}</strong> pcs
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Valuasi: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalValuation, settings.currency)}</strong>
            </span>
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {lowStockCount} Menipis
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => {
                  setProductForPriceTag(null);
                  setIsPriceTagModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Cetak label harga rak / pricetag dalam ukuran kertas A4 atau F4"
              >
                <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Cetak Pricetag (A4 / F4)</span>
              </button>
              <button
                onClick={handlePrintStockSheet}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Cetak lembar audit fisik / katalog inventaris"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cetak Lembar Stok</span>
              </button>
              <button
                onClick={handleExportStockCSV}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Unduh seluruh data produk dalam format file Excel CSV"
              >
                <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Supplier Metrics */}
        {activeTab === 'suppliers' && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Total Mitra: <strong className="text-slate-900 dark:text-white font-mono">{suppliers.length}</strong> Supplier
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Aktif:{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-mono">
                {suppliers.filter((s) => s.isActive !== false).length}
              </strong>
            </span>
          </div>
        )}

        {/* Purchases Metrics & Quick Print */}
        {activeTab === 'purchases' && (
          <div className="flex items-center gap-3 text-xs flex-wrap ml-auto">
            <span className="text-slate-500 dark:text-slate-400">
              Total Faktur: <strong className="text-slate-900 dark:text-white font-mono">{filteredPurchases.length}</strong>
            </span>
            <button
              onClick={() => {
                setProductForPriceTag(null);
                setPurchaseForPriceTag(supplierPurchases[0] || null);
                setIsPriceTagModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Cetak label pricetag rak atau stiker barcode dari faktur pembelian supplier"
            >
              <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Cetak Pricetag per Faktur</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'inventory' ? (
          /* Master Products Table */
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-3 px-4">Produk / Barang</th>
                <th className="py-3 px-4">Brand & Lokasi Rak</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4 text-right">Harga Modal</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-center">Stok Fisik</th>
                <th className="py-3 px-4 text-center">Status / FEFO</th>
                <th className="py-3 px-4 text-right">Aksi & Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isLow = prod.stock <= prod.minStock;
                  const isZero = prod.stock === 0;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Product Name & Details */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {prod.name}
                            </p>
                            {prod.promoBadge && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                {prod.promoBadge}
                              </span>
                            )}
                          </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Pricetag for this Item */}
                          <button
                            onClick={() => {
                              setProductForPriceTag(prod);
                              setIsPriceTagModalOpen(true);
                            }}
                            title="Cetak Pricetag / Label Rak Item Ini"
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Item Button */}
                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            title="Edit Data Item Barang"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Adjust Stock Button */}
                          <button
                            onClick={() => handleOpenAdjust(prod)}
                            title="Koreksi Stok Cepat"
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Koreksi
                          </button>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => setProductToDelete(prod)}
                            title="Hapus Produk dari Master Data"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada produk ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian lain atau tambahkan item produk baru.</p>
                    <button
                      onClick={handleOpenAddProduct}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Item Sekarang
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : activeTab === 'suppliers' ? (
          /* Master Suppliers Directory Table */
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((sup) => {
                  const stats = getSupplierPurchasesSummary(sup.name);
                  return (
                    <div
                      key={sup.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
                    >
                      <div>
                        {/* Supplier Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 inline-block mb-1">
                              {sup.category || 'Distributor Umum'}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {sup.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {sup.isActive !== false ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Aktif" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-400" title="Non-aktif" />
                            )}
                          </div>
                        </div>

                        {/* Supplier Info Details */}
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          {sup.contactPerson && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px] font-medium min-w-[70px]">PIC Kontak:</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{sup.contactPerson}</strong>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{sup.phone}</span>
                          </div>

                          {sup.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 dark:text-slate-400 truncate">{sup.email}</span>
                            </div>
                          )}

                          {sup.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2">{sup.address}</span>
                            </div>
                          )}
                        </div>

                        {/* Commercial Terms */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-semibold">{sup.paymentTerms || 'Tunai / Cash'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Lead: {sup.leadTimeDays || 1} Hari</span>
                          </div>
                        </div>

                        {/* Purchase Stats */}
                        <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">Total Pembelian:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(stats.totalAmount, settings.currency)} ({stats.count} Faktur)
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenPurchaseForSupplier(sup)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>+ Beli Barang</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSupplier(sup)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSupplierToDelete(sup)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-400 text-xs font-semibold cursor-pointer transition-colors"
                          title="Hapus Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada supplier ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1">Daftarkan mitra distributor/supplier baru untuk memudahkan pembelian dan retur barang.</p>
                  <button
                    onClick={handleOpenAddSupplier}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Supplier Baru
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'purchases' ? (
          /* Supplier Purchases Invoices Table */
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-3 px-4">No. Faktur / Waktu</th>
                <th className="py-3 px-4">Supplier & Syarat</th>
                <th className="py-3 px-4">Barang Dibeli</th>
                <th className="py-3 px-4 text-right">Diskon & DPP</th>
                <th className="py-3 px-4 text-right">PPN Masukan</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-center">Aksi & Label</th>
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
                        {purch.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.quantity}x
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {item.productName}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              (@{formatCurrency(item.costPrice, settings.currency)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      {purch.discountAmount > 0 ? (
                        <div>
                          <span className="text-rose-500 font-medium text-[10px]">
                            -{formatCurrency(purch.discountAmount, settings.currency)} ({purch.discountRate}%)
                          </span>
                          <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                            DPP: {formatCurrency(purch.dppAmount, settings.currency)}
                          </div>
                        </div>
                      ) : (
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {formatCurrency(purch.subtotal, settings.currency)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        +{formatCurrency(purch.ppnAmount, settings.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">PPN {purch.ppnRate}%</span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(purch.totalAmount, settings.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {purch.items.reduce((sum, i) => sum + i.quantity, 0)} total pcs
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setProductForPriceTag(null);
                          setPurchaseForPriceTag(purch);
                          setIsPriceTagModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1.5 mx-auto cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap"
                        title={`Cetak pricetag untuk ${purch.items.length} item barang dari faktur ${purch.invoiceNumber}`}
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Cetak Pricetag</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada faktur pembelian supplier</p>
                    <p className="text-xs text-slate-400 mt-1">Catat penerimaan stok masuk dengan mengklik tombol "+ Input Pembelian".</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Purchase Returns Table */
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-3 px-4">No. Retur / Waktu</th>
                <th className="py-3 px-4">Supplier & Alasan</th>
                <th className="py-3 px-4">Barang Diretur</th>
                <th className="py-3 px-4">Ref. Faktur Asal</th>
                <th className="py-3 px-4 text-right">Nilai Klaim Retur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredReturns.length > 0 ? (
                filteredReturns.map((ret) => (
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-block mt-1">
                        {ret.reason}
                      </span>
                      {ret.notes && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                          {ret.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {ret.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              -{item.quantity}x
                            </span>
                            <span className="text-slate-800 dark:text-slate-200">
                              {item.productName}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              (@{formatCurrency(item.costPrice, settings.currency)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {ret.referenceInvoiceNumber || '-'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                        -{formatCurrency(ret.totalAmount, settings.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {ret.items.reduce((sum, i) => sum + i.quantity, 0)} pcs keluar
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada nota retur supplier</p>
                    <p className="text-xs text-slate-400 mt-1">Kembalikan barang rusak/kadaluarsa ke distributor melalui tombol "+ Retur ke Supplier".</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Fast Stock Correction Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Koreksi Stok Fisik</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{editingProduct.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{editingProduct.name}</p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-500">Stok Saat Ini:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {editingProduct.stock} {editingProduct.unit}
                </span>
              </div>
            </div>

            {/* Adjustment Type Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  adjustmentType === 'add' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                + Tambah
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  adjustmentType === 'subtract' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                - Kurang
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('set')}
                className={`py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  adjustmentType === 'set' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                = Set Fisik
              </button>
            </div>

            {/* Input Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {adjustmentType === 'add'
                  ? 'Jumlah Tambahan Stok'
                  : adjustmentType === 'subtract'
                  ? 'Jumlah Pengurangan Stok'
                  : 'Stok Fisik Baru'}
              </label>
              <input
                type="number"
                min={0}
                value={adjustmentValue || ''}
                onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Preview result */}
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-500">Stok Akhir Menjadi:</span>
              <span className="font-black font-mono text-slate-900 dark:text-white text-sm">
                {adjustmentType === 'add'
                  ? editingProduct.stock + (adjustmentValue || 0)
                  : adjustmentType === 'subtract'
                  ? Math.max(0, editingProduct.stock - (adjustmentValue || 0))
                  : Math.max(0, adjustmentValue || 0)}{' '}
                {editingProduct.unit}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleApplyAdjustment}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
              >
                Terapkan Koreksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Hapus Master Item Produk?
                </h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{productToDelete.name}</p>
              <p className="text-slate-500 font-mono">
                SKU: {productToDelete.sku} | Barcode: {productToDelete.barcode}
              </p>
              <p className="text-rose-600 dark:text-rose-400 font-semibold pt-1">
                Sisa Stok Fisik: {productToDelete.stock} {productToDelete.unit}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus item ini dari katalog master inventaris kasir?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-600/20 transition-all active:scale-95"
              >
                Ya, Hapus Produk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Hapus Data Supplier?
                </h3>
                <p className="text-xs text-slate-500">Menghapus kontak mitra dari master supplier</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{supplierToDelete.name}</p>
              <p className="text-slate-500">
                Kategori: {supplierToDelete.category || '-'} | PIC: {supplierToDelete.contactPerson || '-'}
              </p>
              <p className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{supplierToDelete.phone}</p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus data supplier ini? Histori faktur pembelian sebelumnya akan tetap tersimpan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteSupplier}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-600/20 transition-all active:scale-95"
              >
                Ya, Hapus Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Goods Receiving / Pembelian Modal */}
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
                    Pencatatan Faktur Pembelian Supplier & Stok Masuk
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Otomatis tambahkan stok fisik produk ke rak toko, hitung Diskon Dagang & PPN 11%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-scan-invoice-modal"
                  onClick={() => {
                    setIsReceivingOpen(false);
                    setIsAiInvoiceScannerOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Foto Faktur (AI Vision)</span>
                </button>
                <button
                  onClick={() => setIsReceivingOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                      onChange={(e) => {
                        setSupplierName(e.target.value);
                        const found = suppliers.find((s) => s.name === e.target.value);
                        if (found && found.paymentTerms) {
                          setPaymentTerms(found.paymentTerms);
                        }
                      }}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category || 'Distributor'})
                        </option>
                      ))}
                      <option value="PT Indomarco Adi Prima (Indofood)">PT Indomarco (Indofood)</option>
                      <option value="PT Wings Surya (Wings)">PT Wings Surya</option>
                      <option value="PT Unilever Indonesia Tbk">PT Unilever Indonesia</option>
                      <option value="PT Mayora Indah Tbk">PT Mayora Indah</option>
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
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Tunai / Cash">Tunai / Cash (Lunas)</option>
                      <option value="Tempo 7 Hari">Tempo TOP 7 Hari</option>
                      <option value="Tempo 14 Hari">Tempo TOP 14 Hari</option>
                      <option value="Tempo 30 Hari">Tempo TOP 30 Hari</option>
                      <option value="Tempo 45 Hari">Tempo TOP 45 Hari</option>
                      <option value="Tempo 60 Hari">Tempo TOP 60 Hari</option>
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
                      <span>Tambah Baris Barang</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Produk Toko</th>
                          <th className="py-2 px-3 text-center w-24">Jumlah (Qty)</th>
                          <th className="py-2 px-3 text-right w-32">Harga Beli / Pcs</th>
                          <th className="py-2 px-3 text-center w-36">Tgl Expired (FEFO)</th>
                          <th className="py-2 px-3 text-right w-32">Subtotal</th>
                          <th className="py-2 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {receivingItems.map((item, idx) => {
                          const subtotal = item.quantity * item.costPrice;
                          return (
                            <tr key={idx} className="bg-white dark:bg-slate-900">
                              <td className="py-2 px-3">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleReceivingItemChange(idx, 'productId', e.target.value)}
                                  className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs cursor-pointer"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.sku}) - Stok Toko: {p.stock}
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
                                  value={item.expiryDate || '2027-06-30'}
                                  onChange={(e) => handleReceivingItemChange(idx, 'expiryDate', e.target.value)}
                                  className="w-full p-1.5 text-center text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer"
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

                {/* Diskon Supplier, PPN 11% & Catatan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Left: Diskon & PPN Inputs */}
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Potongan Diskon Faktur & Pajak PPN</span>
                    </span>

                    {/* Diskon Dagang */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Tipe Diskon
                        </label>
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'nominal')}
                          className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          <option value="percentage">Persentase (%)</option>
                          <option value="nominal">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Nilai Diskon
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={discountRate || ''}
                          onChange={(e) => setDiscountRate(Number(e.target.value))}
                          placeholder={discountType === 'percentage' ? '5%' : '50000'}
                          className="w-full p-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* PPN Masukan */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tarif PPN Masukan
                      </label>
                      <select
                        value={ppnRate}
                        onChange={(e) => setPpnRate(Number(e.target.value))}
                        className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value={11}>PPN 11% (Standar Nasional)</option>
                        <option value={12}>PPN 12% (Kenaikan Tarif)</option>
                        <option value={0}>Non-PPN / 0% (Bebas Pajak)</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Catatan Khusus */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                        Catatan Khusus Pembelian
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Contoh: Barang diterima kurir Indofood plat B 1234 CD, kemasan utuh bersegel..."
                        value={purchaseNotes}
                        onChange={(e) => setPurchaseNotes(e.target.value)}
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Summary Footer Box */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-1.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-emerald-200 dark:border-emerald-900 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Subtotal Kotor:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(receivingSubtotal, settings.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Diskon Dagang:</span>
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
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      <option value="PT Indomarco Adi Prima (Indofood)">PT Indomarco (Indofood)</option>
                      <option value="PT Wings Surya (Wings)">PT Wings Surya</option>
                      <option value="PT Unilever Indonesia Tbk">PT Unilever Indonesia</option>
                      <option value="PT Mayora Indah Tbk">PT Mayora Indah</option>
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
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500 cursor-pointer"
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
                      className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Return Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span>Daftar Barang Yang Diretur ke Supplier</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddReturnRow}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Retur</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Produk Toko</th>
                          <th className="py-2 px-3 text-center w-24">Qty Retur</th>
                          <th className="py-2 px-3 text-right w-32">Harga Beli / Pcs</th>
                          <th className="py-2 px-3 text-right w-32">Subtotal Klaim</th>
                          <th className="py-2 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {returnItems.map((item, idx) => {
                          const prod = products.find((p) => p.id === item.productId);
                          const subtotal = item.quantity * item.costPrice;
                          return (
                            <tr key={idx} className="bg-white dark:bg-slate-900">
                              <td className="py-2 px-3">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleReturnItemChange(idx, 'productId', e.target.value)}
                                  className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs cursor-pointer"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.sku}) - Sisa Stok: {p.stock}
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

      {/* Product Add / Edit Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
        onPrintPriceTag={(prod) => {
          setIsProductModalOpen(false);
          setProductForPriceTag(prod);
          setIsPriceTagModalOpen(true);
        }}
        onSuccess={(savedProduct, isEdit) => {
          setNotificationMsg({
            type: 'success',
            text: isEdit
              ? `Data produk "${savedProduct.name}" berhasil diperbarui!`
              : `Produk baru "${savedProduct.name}" (${savedProduct.sku}) berhasil ditambahkan ke master inventaris!`,
          });
          setTimeout(() => setNotificationMsg(null), 5000);
        }}
      />

      {/* Supplier Add / Edit Modal */}
      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setSupplierToEdit(null);
        }}
        supplierToEdit={supplierToEdit}
        onSuccess={(savedSupplier, isEdit) => {
          setNotificationMsg({
            type: 'success',
            text: isEdit
              ? `Profil supplier "${savedSupplier.name}" berhasil diperbarui!`
              : `Supplier baru "${savedSupplier.name}" berhasil didaftarkan ke sistem!`,
          });
          setTimeout(() => setNotificationMsg(null), 5000);
        }}
      />

      {/* AI Invoice & Receipt Scanner Modal */}
      <AIInvoiceScannerModal
        isOpen={isAiInvoiceScannerOpen}
        onClose={() => setIsAiInvoiceScannerOpen(false)}
        onApplyInvoice={(scanned) => {
          setSupplierName(scanned.supplierName);
          setInvoiceNumber(scanned.invoiceNumber);
          if (scanned.items && scanned.items.length > 0) {
            setReceivingItems(
              scanned.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                costPrice: i.costPrice,
                expiryDate: i.expiryDate || '2027-12-31',
              }))
            );
          }
          if (scanned.discountAmount > 0) {
            setDiscountType('nominal');
            setDiscountRate(scanned.discountAmount);
          }
          if (scanned.notes) {
            setPurchaseNotes(scanned.notes);
          }
          setIsReceivingOpen(true);
        }}
      />

      {/* AI Visual & Video Stock Opname Modal */}
      <AIVisualStockOpnameModal
        isOpen={isAiStockOpnameOpen}
        onClose={() => setIsAiStockOpnameOpen(false)}
      />

      {/* Price Tag & Shelf Label Modal (A4 & F4) */}
      <PriceTagModal
        isOpen={isPriceTagModalOpen}
        onClose={() => {
          setIsPriceTagModalOpen(false);
          setProductForPriceTag(null);
          setPurchaseForPriceTag(null);
        }}
        initialSelectedProduct={productForPriceTag}
        initialPurchaseInvoice={purchaseForPriceTag}
      />
    </div>
  );
};
