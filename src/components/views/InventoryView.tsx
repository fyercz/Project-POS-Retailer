import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  AlertCircle,
  Plus,
  Minus,
  Edit3,
  Check,
  X,
  TrendingDown,
  TrendingUp,
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
  ScanBarcode,
  Video,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  SlidersHorizontal,
  ExternalLink,
  Tag,
  Upload,
  Globe,
  FileSpreadsheet,
  Database,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  ArrowDownToLine,
  QrCode,
} from 'lucide-react';
import {
  usePOSCatalog, usePOSAuthShift,
  usePOSTransactions,
  usePOSUI,
} from '../../context/POSContext';
import { INITIAL_PRODUCTS } from '../../data/mockData';
import { Product, PurchaseReturn, PurchaseReturnItem, SupplierPurchase, SupplierPurchaseItem, Supplier } from '../../types';
import { formatCurrency, formatDate, toLocalDateString } from '../../utils/formatters';
import { printViaIframe, exportToCSV } from '../../utils/printHelper';
import { AIInvoiceScannerModal } from '../AIInvoiceScannerModal';
import { AIVisualStockOpnameModal } from '../AIVisualStockOpnameModal';
import { ProductFormModal } from '../ProductFormModal';
import { SupplierFormModal } from '../SupplierFormModal';
import { SupplierPurchaseDetailModal } from '../SupplierPurchaseDetailModal';
import { ReceivingBarcodeCameraModal } from '../ReceivingBarcodeCameraModal';
import { parsePaymentTermsInfo, withPaymentStatus } from '../../utils/paymentTermsHelper';
import { PriceTagModal } from '../PriceTagModal';
import { QRShelfLabelModal } from '../QRShelfLabelModal';
import { ShelfProductLiveModal } from '../ShelfProductLiveModal';
import { DataImportModal } from '../DataImportModal';
import { DirectFileImportModal } from '../DirectFileImportModal';
import { OnlineDatabaseMatcherModal } from '../OnlineDatabaseMatcherModal';
import { AICategoryMapperModal } from '../AICategoryMapperModal';
import { BulkStockAdjustmentModal } from '../BulkStockAdjustmentModal';
import { StockTakeCSVModal } from '../StockTakeCSVModal';
import { ProductPriceHistoryView } from '../ProductPriceHistoryView';
import { ProductPriceHistoryModal } from '../ProductPriceHistoryModal';
import { DynamicPricingModule } from '../DynamicPricingModule';
import {
  InventoryAlertBanner,
  InventoryAlertFilterType,
  getProductExpiryDiffDays,
} from '../InventoryAlertBanner';
import { DateFilterBar } from '../DateFilterBar';
import {
  DateFilterPreset,
  isDateWithinFilter,
  toLocalYMD,
  formatPeriodLabel,
} from '../../utils/dateFilters';
import { playScannerSound } from '../../utils/scannerAudio';
import { Html5Qrcode } from 'html5-qrcode';
import { escapeHtml } from '../../utils/escapeHtml';
import { purchaseOutstandingOf } from '../../utils/accountingLedger';
import { buildStockHistoryIds, stockStatusOf } from '../../domain/stockStatus';
import { ProductPicker } from '../ProductPicker';
import { PriceUpdateFromFileModal } from '../PriceUpdateFromFileModal';

interface ReceivingItem {
  productId: string;
  quantity: number;
  costPrice: number;
  subtotal?: number;
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
    categories,
    updateProductStock,
    deleteProduct,
    deleteProductsBatch,
    clearImportedProducts,
    clearAllProducts,
    recordProductPriceChange,
    updateProduct,
  } = usePOSCatalog();

  const {
    transactions,
    purchaseReturns,
    processPurchaseReturn,
    supplierPurchases,
    processSupplierPurchase,
    suppliers,
    deleteSupplier,
  } = usePOSTransactions();

  const {
    settings,
    updateSettings,
    openGeminiCopilot,
    triggerRestockPlanAnalysis,
    pendingReceivingFromPO,
    setPendingReceivingFromPO,
    applyMinStockRuleToAllProducts,
    setIsBackupRestoreOpen,
    createRestorePoint,
  } = usePOSUI();
  const { activeEmployee } = usePOSAuthShift();

  const [activeTab, setActiveTab] = useState<'inventory' | 'price_history' | 'dynamic_pricing' | 'suppliers' | 'purchases' | 'returns'>('inventory');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productOriginFilter, setProductOriginFilter] = useState<'all' | 'imported' | 'default'>('all');
  const [alertFilter, setAlertFilter] = useState<InventoryAlertFilterType>('all');
  // Produk yang pernah terjual / diterima: stok 0 = "Habis"; tanpa riwayat = "Belum ada stok"
  // Kolom Brand disembunyikan bila hampir semua produk tidak punya merek (mis. hasil impor)
  const showBrandColumn = useMemo(
    () => products.length > 0 && products.filter((p) => (p.brand || '').trim()).length / products.length >= 0.1,
    [products]
  );
  const stockHistory = useMemo(() => buildStockHistoryIds(transactions, supplierPurchases), [transactions, supplierPurchases]);

  // Product Price History State
  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState(false);
  const [priceHistoryProductId, setPriceHistoryProductId] = useState<string>('');

  const handleOpenPriceHistory = (prod: Product) => {
    setPriceHistoryProductId(prod.id);
    setIsPriceHistoryModalOpen(true);
  };

  const handleSwitchToPriceHistoryTab = (prod?: Product) => {
    if (prod) {
      setPriceHistoryProductId(prod.id);
    }
    setActiveTab('price_history');
  };

  // Multi-Selection State for Batch Actions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isClearImportedModalOpen, setIsClearImportedModalOpen] = useState(false);
  const [isPriceUpdateOpen, setIsPriceUpdateOpen] = useState(false);
  const [isResetCatalogModalOpen, setIsResetCatalogModalOpen] = useState(false);

  // Bulk Stock & Expiry Adjustment Modal State
  const [isBulkAdjustModalOpen, setIsBulkAdjustModalOpen] = useState(false);
  const [bulkAdjustInitialProductIds, setBulkAdjustInitialProductIds] = useState<string[]>([]);

  // Produk hasil impor file ditandai importedAt saat diimpor (dulu: semua produk selain produk demo
  // dianggap "impor", sehingga 'Hapus Semua Data Impor' bisa menghapus seluruh katalog asli toko)
  const isImportedProduct = (p: Product) => Boolean(p.importedAt);
  const importedProducts = products.filter(isImportedProduct);
  const importedCount = importedProducts.length;

  // Supplier Tab Filter State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');

  // Date Filter State for Faktur Masuk (Purchases): Defaults to 'today' to keep display focused
  const [purchaseDatePreset, setPurchaseDatePreset] = useState<DateFilterPreset>('today');
  const [purchaseStartDate, setPurchaseStartDate] = useState<string>(() => toLocalYMD(new Date()));
  const [purchaseEndDate, setPurchaseEndDate] = useState<string>(() => toLocalYMD(new Date()));

  // Date Filter State for Retur Supplier (Returns): Defaults to 'today' to keep display focused
  const [returnDatePreset, setReturnDatePreset] = useState<DateFilterPreset>('today');
  const [returnStartDate, setReturnStartDate] = useState<string>(() => toLocalYMD(new Date()));
  const [returnEndDate, setReturnEndDate] = useState<string>(() => toLocalYMD(new Date()));

  // Master Item (Product) Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Price Tag Modal State (A4 / F4)
  const [isPriceTagModalOpen, setIsPriceTagModalOpen] = useState(false);
  const [productForPriceTag, setProductForPriceTag] = useState<Product | null>(null);
  const [purchaseForPriceTag, setPurchaseForPriceTag] = useState<SupplierPurchase | null>(null);

  // Dynamic QR Shelf Label Modal State
  const [isQRShelfLabelModalOpen, setIsQRShelfLabelModalOpen] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  const [liveShelfProductId, setLiveShelfProductId] = useState<string | null>(null);

  // Supplier Purchase Detail & Receipt Modal State
  const [selectedPurchaseForDetail, setSelectedPurchaseForDetail] = useState<SupplierPurchase | null>(null);
  const [isPurchaseDetailOpen, setIsPurchaseDetailOpen] = useState(false);
  const [purchaseTermsFilter, setPurchaseTermsFilter] = useState<'all' | 'tempo' | 'consignment' | 'cash'>('all');

  // Smart Data Import Modal State
  const [isDataImportOpen, setIsDataImportOpen] = useState(false);
  const [isDirectFileImportOpen, setIsDirectFileImportOpen] = useState(false);

  // Quick Stock Take CSV Modal State
  const [isStockTakeCSVOpen, setIsStockTakeCSVOpen] = useState(false);

  // Online Database & Barcode Matcher Modal State
  const [isOnlineMatcherOpen, setIsOnlineMatcherOpen] = useState(false);
  const [isAiCategoryMapperOpen, setIsAiCategoryMapperOpen] = useState(false);

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
  // Formulir terima barang & retur supplier dimulai kosong (dulu diisi supplier pertama,
  // produk pertama, qty 24, expired 2027-06-30, PPN 11%). Nomor faktur diisi dari nota supplier.
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Tunai / Cash');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [discountTiming, setDiscountTiming] = useState<'before_ppn' | 'after_ppn'>('before_ppn');
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [ppnRate, setPpnRate] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBarcodeCameraOpen, setIsBarcodeCameraOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([{ productId: '', quantity: 0, costPrice: 0, subtotal: 0, expiryDate: '' }]);

  // Supplier Purchase Return Modal State
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnSupplierName, setReturnSupplierName] = useState('');
  const [returnRefInvoice, setReturnRefInvoice] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<SupplierReturnItemRow[]>([{ productId: '', quantity: 0, costPrice: 0 }]);
  // Pesan validasi ditampilkan DI DALAM formulir (bilah notifikasi halaman tertutup jendela formulir)
  const [receivingFormError, setReceivingFormError] = useState('');
  const [returnFormError, setReturnFormError] = useState('');
  useEffect(() => {
    if (isReceivingOpen) setReceivingFormError('');
  }, [isReceivingOpen]);
  useEffect(() => {
    if (isReturnOpen) setReturnFormError('');
  }, [isReturnOpen]);

  const [notificationMsg, setNotificationMsg] = useState<{
    type: 'success' | 'return' | 'delete';
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Pre-fill goods receiving modal when purchase order is generated/applied from Gemini Restock Plan
  useEffect(() => {
    if (pendingReceivingFromPO && pendingReceivingFromPO.length > 0) {
      setReceivingItems(
        pendingReceivingFromPO.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          expiryDate: item.expiryDate || '',
        }))
      );
      setIsReceivingOpen(true);
      setPendingReceivingFromPO(null);
    }
  }, [pendingReceivingFromPO, setPendingReceivingFromPO]);

  // Grouped Menu Dropdown States
  const [isAuditDropdownOpen, setIsAuditDropdownOpen] = useState(false);
  const [isLogisticsDropdownOpen, setIsLogisticsDropdownOpen] = useState(false);
  const [isMoreToolsDropdownOpen, setIsMoreToolsDropdownOpen] = useState(false);
  const auditDropdownRef = useRef<HTMLDivElement>(null);
  const logisticsDropdownRef = useRef<HTMLDivElement>(null);
  const moreToolsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (auditDropdownRef.current && !auditDropdownRef.current.contains(e.target as Node)) {
        setIsAuditDropdownOpen(false);
      }
      if (logisticsDropdownRef.current && !logisticsDropdownRef.current.contains(e.target as Node)) {
        setIsLogisticsDropdownOpen(false);
      }
      if (moreToolsDropdownRef.current && !moreToolsDropdownRef.current.contains(e.target as Node)) {
        setIsMoreToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination for Master Products
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(30);

  const deferredSearch = useDeferredValue(search);
  const deferredSupplierSearch = useDeferredValue(supplierSearch);

  // Reset page whenever search or filter changes
  useEffect(() => {
    setProductPage(1);
  }, [deferredSearch, categoryFilter, productOriginFilter, alertFilter]);

  // Single-pass memoized inventory metrics (O(N) single pass instead of 8 separate filter/reduce iterations)
  const inventoryMetrics = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let totalStock = 0;
    let totalVal = 0;
    let exp = 0;
    let criticalExp = 0;
    let approachingExp = 0;
    let alerts = 0;
    let unstocked = 0;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      totalStock += p.stock;
      totalVal += p.stock * p.costPrice;

      const status = stockStatusOf(p, stockHistory);
      const isLow = status === 'low' || status === 'out';
      if (status === 'out') outOfStock++;
      else if (status === 'low') lowStock++;
      else if (status === 'unstocked') unstocked++;

      const diff = getProductExpiryDiffDays(p.expiryDate);
      let hasExpAlert = false;
      if (diff !== null) {
        if (diff < 0) {
          exp++;
          hasExpAlert = true;
        } else if (diff <= 30) {
          criticalExp++;
          hasExpAlert = true;
        } else if (diff <= 90) {
          approachingExp++;
          hasExpAlert = true;
        }
      }

      if (isLow || hasExpAlert) {
        alerts++;
      }
    }

    return {
      outOfStockCount: outOfStock,
      lowStockCount: lowStock,
      unstockedCount: unstocked,
      totalStockUnits: totalStock,
      totalValuation: totalVal,
      expiredCount: exp,
      criticalExpCount: criticalExp,
      approachingExpCount: approachingExp,
      totalExpAlertsCount: exp + criticalExp + approachingExp,
      totalAlertsCount: alerts,
    };
  }, [products, stockHistory]);

  const {
    outOfStockCount,
    lowStockCount,
    unstockedCount,
    totalStockUnits,
    totalValuation,
    expiredCount,
    criticalExpCount,
    approachingExpCount,
    totalExpAlertsCount,
    totalAlertsCount,
  } = inventoryMetrics;

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const base = products.filter((p) => {
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        (p.brand && p.brand.toLowerCase().includes(query));
      if (!matchQuery) return false;

      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      if (!matchCat) return false;

      const matchOrigin =
        productOriginFilter === 'all'
          ? true
          : productOriginFilter === 'imported'
          ? isImportedProduct(p)
          : !isImportedProduct(p);
      if (!matchOrigin) return false;

      if (alertFilter === 'low-stock') {
        return stockStatusOf(p, stockHistory) === 'low';
      } else if (alertFilter === 'out-of-stock') {
        return stockStatusOf(p, stockHistory) === 'out';
      } else if (alertFilter === 'unstocked') {
        return stockStatusOf(p, stockHistory) === 'unstocked';
      } else if (alertFilter === 'critical-exp') {
        const diff = getProductExpiryDiffDays(p.expiryDate);
        return diff !== null && diff <= 30;
      } else if (alertFilter === 'approaching-exp') {
        const diff = getProductExpiryDiffDays(p.expiryDate);
        return diff !== null && diff > 30 && diff <= 90;
      } else if (alertFilter === 'all-exp') {
        const diff = getProductExpiryDiffDays(p.expiryDate);
        return diff !== null && diff <= 90;
      }

      return true;
    });

    // Jika pengguna secara spesifik memilih filter 'out-of-stock', tampilkan semua produk habis
    if (alertFilter === 'out-of-stock' || alertFilter === 'unstocked') {
      return base;
    }

    const mode = settings.outOfStockDisplay ?? 'bottom';
    if (mode === 'hide') {
      return base.filter((p) => p.stock > 0);
    }
    if (mode === 'bottom') {
      const inStock: typeof base = [];
      const outOfStock: typeof base = [];
      for (let i = 0; i < base.length; i++) {
        const item = base[i];
        if (item.stock > 0) {
          inStock.push(item);
        } else {
          outOfStock.push(item);
        }
      }
      return [...inStock, ...outOfStock];
    }

    return base;
  }, [products, deferredSearch, categoryFilter, productOriginFilter, alertFilter, settings.outOfStockDisplay, stockHistory]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  const filteredSuppliers = useMemo(() => {
    const rawQuery = activeTab === 'suppliers' ? deferredSupplierSearch || deferredSearch : deferredSearch;
    const query = rawQuery.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchQuery =
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
        (s.phone && s.phone.toLowerCase().includes(query)) ||
        (s.category && s.category.toLowerCase().includes(query)) ||
        (s.address && s.address.toLowerCase().includes(query));
      const matchCat =
        supplierCategoryFilter === 'all' || (s.category && s.category.toLowerCase().includes(supplierCategoryFilter.toLowerCase()));
      return matchQuery && matchCat;
    });
  }, [suppliers, activeTab, deferredSupplierSearch, deferredSearch, supplierCategoryFilter]);

  const filteredPurchases = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return supplierPurchases.filter((purch) => {
      const matchQuery =
        !query ||
        purch.invoiceNumber.toLowerCase().includes(query) ||
        purch.supplierName.toLowerCase().includes(query);
      const matchDate = isDateWithinFilter(purch.createdAt, purchaseStartDate, purchaseEndDate);

      let matchTerms = true;
      if (purchaseTermsFilter !== 'all') {
        const termsInfo = parsePaymentTermsInfo(purch.createdAt, purch.paymentTerms);
        matchTerms = termsInfo.category === purchaseTermsFilter;
      }

      return matchQuery && matchDate && matchTerms;
    });
  }, [supplierPurchases, deferredSearch, purchaseStartDate, purchaseEndDate, purchaseTermsFilter]);

  const purchaseTermsStats = useMemo(() => {
    let tempoTotal = 0;
    let tempoCount = 0;
    let consignmentTotal = 0;
    let consignmentCount = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let urgentTempoCount = 0;

    supplierPurchases.forEach((p) => {
      // Ringkasan hutang memakai SISA yang belum dibayar; faktur lunas tidak dihitung mendesak
      const outstanding = purchaseOutstandingOf(p);
      const info = withPaymentStatus(parsePaymentTermsInfo(p.createdAt, p.paymentTerms), outstanding);
      const val = info.category === 'cash' ? Number(p.finalTotal ?? p.totalAmount) || 0 : outstanding;
      if (info.category === 'tempo') {
        tempoTotal += val;
        tempoCount++;
        if (info.urgency === 'urgent' || info.urgency === 'overdue') {
          urgentTempoCount++;
        }
      } else if (info.category === 'consignment') {
        consignmentTotal += val;
        consignmentCount++;
      } else {
        cashTotal += val;
        cashCount++;
      }
    });

    return {
      tempoTotal,
      tempoCount,
      consignmentTotal,
      consignmentCount,
      cashTotal,
      cashCount,
      urgentTempoCount,
    };
  }, [supplierPurchases]);

  const filteredReturns = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return purchaseReturns.filter((ret) => {
      const matchQuery =
        !query ||
        ret.returnNumber.toLowerCase().includes(query) ||
        ret.supplierName.toLowerCase().includes(query) ||
        (ret.referenceInvoiceNumber && ret.referenceInvoiceNumber.toLowerCase().includes(query));
      const matchDate = isDateWithinFilter(ret.createdAt, returnStartDate, returnEndDate);
      return matchQuery && matchDate;
    });
  }, [purchaseReturns, deferredSearch, returnStartDate, returnEndDate]);

  // Period Financial & Quantity Summaries for Purchases and Returns
  const totalFilteredPurchaseAmount = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  }, [filteredPurchases]);

  const totalFilteredPurchaseQty = useMemo(() => {
    return filteredPurchases.reduce(
      (sum, p) => sum + (p.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
      0
    );
  }, [filteredPurchases]);

  const totalFilteredReturnAmount = useMemo(() => {
    return filteredReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  }, [filteredReturns]);

  const totalFilteredReturnQty = useMemo(() => {
    return filteredReturns.reduce(
      (sum, r) => sum + (r.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
      0
    );
  }, [filteredReturns]);

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
      setSelectedProductIds((prev) => prev.filter((id) => id !== productToDelete.id));
      setNotificationMsg({
        type: 'delete',
        text: `Produk "${productToDelete.name}" (${productToDelete.sku}) berhasil dihapus dari master data.`,
      });
      setTimeout(() => setNotificationMsg(null), 5000);
      setProductToDelete(null);
    }
  };

  const handleConfirmClearImported = () => {
    const totalDeleted = importedCount;
    clearImportedProducts();
    setSelectedProductIds([]);
    setIsClearImportedModalOpen(false);
    setNotificationMsg({
      type: 'delete',
      text: `Berhasil menghapus ${totalDeleted} master produk hasil impor dari sistem.`,
    });
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleConfirmBulkDelete = () => {
    const count = selectedProductIds.length;
    if (count === 0) return;
    deleteProductsBatch(selectedProductIds);
    setSelectedProductIds([]);
    setIsBulkDeleteModalOpen(false);
    setNotificationMsg({
      type: 'delete',
      text: `Berhasil menghapus ${count} produk terpilih secara massal dari master data.`,
    });
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleConfirmResetDefault = () => {
    try {
      createRestorePoint(
        'Otomatis: Pra-Reset Katalog Produk',
        'Snapshot otomatis yang disimpan sistem sebelum mereset katalog produk ke 40 item ritel bawaan.',
        'auto_pre_reset'
      );
    } catch {
      // ignore
    }
    // (Tombol 'Reset Default' ke produk contoh sudah dihapus; jendela ini tidak lagi bisa dibuka)
    setSelectedProductIds([]);
    setIsResetCatalogModalOpen(false);
    setNotificationMsg({
      type: 'success',
      text: `Katalog master produk berhasil direset kembali ke 40 produk bawaan ritel. Snapshot pengaman otomatis tersimpan.`,
    });
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleToggleSelectAll = () => {
    const filteredIds = filteredProducts.map((p) => p.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      const filteredSet = new Set(filteredIds);
      setSelectedProductIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAllImported = () => {
    const importedIds = products.filter(isImportedProduct).map((p) => p.id);
    setSelectedProductIds(importedIds);
  };

  const handleOpenBulkAdjustSelected = () => {
    setBulkAdjustInitialProductIds(selectedProductIds);
    setIsBulkAdjustModalOpen(true);
  };

  const handleOpenBulkAdjustToolbar = () => {
    const targetIds =
      selectedProductIds.length > 0
        ? selectedProductIds
        : filteredProducts.slice(0, 15).map((p) => p.id);
    setBulkAdjustInitialProductIds(targetIds);
    setIsBulkAdjustModalOpen(true);
  };

  const handleOpenReceivingForProduct = (prod?: Product) => {
    if (prod) {
      setReceivingItems([
        {
          productId: prod.id,
          quantity: 0, // diisi sesuai barang yang benar-benar datang
          costPrice: prod.costPrice, // harga modal terakhir sebagai titik awal
          expiryDate: '', // tanggal expired batch baru, dari kemasan
        },
      ]);
    }
    setIsReceivingOpen(true);
  };

  const handleOpenReturnForProduct = (prod?: Product) => {
    if (prod) {
      setReturnItems([
        {
          productId: prod.id,
          quantity: 0, // diisi sesuai barang yang benar-benar diretur
          costPrice: prod.costPrice,
          expiryDate: prod.expiryDate,
        },
      ]);
      const diff = getProductExpiryDiffDays(prod.expiryDate);
      if (diff !== null && diff <= 0) {
        // Nilai harus sama persis dengan pilihan di daftar alasan
        setReturnReason('Kedaluwarsa / Near Expired (FEFO)');
      } else {
        setReturnReason('');
      }
    }
    setIsReturnOpen(true);
  };

  const handleOpenBulkAdjustForProducts = (productIds: string[]) => {
    setBulkAdjustInitialProductIds(productIds);
    setIsBulkAdjustModalOpen(true);
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
    setReceivingItems((prev) => [...prev, { productId: '', quantity: 0, costPrice: 0, subtotal: 0, expiryDate: '' }]);
  };

  const handleScanBarcode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const clean = code.toLowerCase();
    // 1. Match product barcode
    let matched = products.find((p) => (p.barcode || '').toLowerCase() === clean);
    // 2. Match SKU
    if (!matched) {
      matched = products.find((p) => (p.sku || '').toLowerCase() === clean);
    }
    // 3. Match Wholesale unit barcode
    if (!matched) {
      matched = products.find((p) =>
        p.wholesaleUnits?.some((u) => (u.barcode || '').toLowerCase() === clean)
      );
    }
    // 4. Exact product name match
    if (!matched) {
      matched = products.find((p) => p.name.toLowerCase() === clean);
    }

    if (matched) {
      playScannerSound('success');
      const cost = matched.costPrice || 0;
      const newRow: ReceivingItem = {
        productId: matched.id,
        quantity: 1,
        costPrice: cost,
        subtotal: cost,
        expiryDate: '',
      };
      const target = matched;
      setReceivingItems((prev) => {
        // Produk yang sama di-scan lagi: tambah jumlahnya, bukan baris baru
        const existingIdx = prev.findIndex((r) => r.productId === target.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          const row = { ...copy[existingIdx] };
          row.quantity = (Number(row.quantity) || 0) + 1;
          row.subtotal = row.quantity * (Number(row.costPrice) || 0);
          copy[existingIdx] = row;
          return copy;
        }
        // Isi baris kosong yang belum dipilih produknya, kalau ada
        const emptyIdx = prev.findIndex((r) => !r.productId);
        if (emptyIdx >= 0) {
          const copy = [...prev];
          copy[emptyIdx] = newRow;
          return copy;
        }
        return [...prev, newRow];
      });
      setBarcodeFeedback({
        type: 'success',
        message: `+1 Baris Barang: "${matched.name}" (Barcode/SKU: ${matched.barcode || matched.sku}) berhasil ditambahkan.`,
      });
      setBarcodeInput('');
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } else {
      playScannerSound('error');
      setBarcodeFeedback({
        type: 'error',
        message: `Produk dengan Barcode/SKU "${code}" tidak ditemukan di master katalog toko.`,
      });
    }
  };

  // Auto-dismiss barcode scanner feedback after 4 seconds
  useEffect(() => {
    if (!barcodeFeedback) return;
    const timer = setTimeout(() => setBarcodeFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [barcodeFeedback]);

  // Hardware barcode scanner listener inside receiving modal
  useEffect(() => {
    if (!isReceivingOpen) return;

    // Auto-focus barcode input when receiving modal opens
    const focusTimer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleHardwareBarcodeInput = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // If user is already typing in an input, textarea, or select, let native event handle it
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3 && diff < 120) {
          e.preventDefault();
          const scanned = buffer.trim();
          buffer = '';
          handleScanBarcode(scanned);
        } else {
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (diff > 120) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleHardwareBarcodeInput);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleHardwareBarcodeInput);
    };
  }, [isReceivingOpen, products]);

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
          item.subtotal = item.quantity * matched.costPrice;
        }
      } else if (field === 'quantity') {
        const valStr = String(value).trim();
        const newQty = valStr === '' ? 0 : Math.max(0, Number(valStr));
        item.quantity = newQty;
        item.subtotal = Math.round(newQty * item.costPrice * 100) / 100;
      } else if (field === 'costPrice') {
        const valStr = String(value).trim();
        const newCost = valStr === '' ? 0 : Math.max(0, Number(valStr));
        item.costPrice = newCost;
        item.subtotal = Math.round(item.quantity * newCost * 100) / 100;
      } else if (field === 'subtotal') {
        const valStr = String(value).trim();
        const newSubtotal = valStr === '' ? 0 : Math.max(0, Number(valStr));
        item.subtotal = newSubtotal;
        if (item.quantity > 0) {
          item.costPrice = Math.round((newSubtotal / item.quantity) * 100) / 100;
        }
      } else if (field === 'expiryDate') {
        item.expiryDate = value as string;
      }
      copy[index] = item;
      return copy;
    });
  };

  // Calculate Receiving Totals with Discount Timing (Before or After PPN) and Type (Percentage or Nominal Rupiah)
  const receivingSubtotal = receivingItems.reduce(
    (sum, item) => sum + (item.subtotal !== undefined ? item.subtotal : item.quantity * item.costPrice),
    0
  );

  let discountAmount = 0;
  let dppAmount = 0;
  let ppnAmount = 0;
  let finalReceivingTotal = 0;

  if (discountTiming === 'before_ppn') {
    // Diskon Sebelum PPN: Mengurangi Dasar Pengenaan Pajak (DPP)
    discountAmount =
      discountType === 'percentage'
        ? (receivingSubtotal * (discountRate || 0)) / 100
        : Math.min(receivingSubtotal, discountRate || 0);
    dppAmount = Math.max(0, receivingSubtotal - discountAmount);
    ppnAmount = (dppAmount * (ppnRate || 0)) / 100;
    finalReceivingTotal = Math.max(0, dppAmount + ppnAmount);
  } else {
    // Diskon Sesudah PPN: PPN dihitung dari Subtotal Bruto penuh, Diskon memotong total faktur akhir
    dppAmount = receivingSubtotal;
    ppnAmount = (dppAmount * (ppnRate || 0)) / 100;
    const grossTotalWithPpn = dppAmount + ppnAmount;
    discountAmount =
      discountType === 'percentage'
        ? (grossTotalWithPpn * (discountRate || 0)) / 100
        : Math.min(grossTotalWithPpn, discountRate || 0);
    finalReceivingTotal = Math.max(0, grossTotalWithPpn - discountAmount);
  }

  const handleSubmitReceiving = (e: React.FormEvent) => {
    e.preventDefault();
    if (receivingItems.length === 0) return;
    const receivingError = !supplierName
      ? 'Pilih supplier terlebih dahulu.'
      : receivingItems.some((r) => !r.productId)
        ? 'Ada baris barang yang belum dipilih produknya. Pilih produknya atau hapus barisnya.'
        : receivingItems.some((r) => !(Number(r.quantity) > 0))
          ? 'Jumlah barang yang diterima harus lebih dari 0.'
          : '';
    setReceivingFormError(receivingError);
    if (receivingError) return;

    const purchasePayload: Omit<SupplierPurchase, 'id' | 'createdAt'> = {
      supplierName,
      invoiceNumber: invoiceNumber.trim() || `INV-SUP-${Date.now().toString().slice(-6)}`,
      paymentTerms,
      notes: purchaseNotes.trim() || undefined,
      subtotal: receivingSubtotal,
      discountTiming,
      discountType,
      discountRate,
      discountAmount,
      dppAmount,
      ppnRate,
      ppnAmount,
      totalAmount: finalReceivingTotal,
      items: receivingItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const itemSubtotal = item.subtotal !== undefined ? item.subtotal : item.quantity * item.costPrice;
        return {
          productId: item.productId,
          productName: prod ? prod.name : 'Unknown Product',
          sku: prod ? prod.sku : '-',
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal: itemSubtotal,
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
      text: `Faktur Pembelian ${invoiceNumber} (${paymentTerms}) dari ${supplierName} senilai ${formatCurrency(finalReceivingTotal, settings.currency)} berhasil diproses & stok bertambah.`,
      actionLabel: 'Lihat Nota Faktur',
      onAction: () => {
        setSelectedPurchaseForDetail(createdPurchaseForModal);
        setIsPurchaseDetailOpen(true);
      },
    });
    setTimeout(() => setNotificationMsg(null), 8000);

    // Reset Form
    setSupplierName('');
    setInvoiceNumber('');
    setPaymentTerms('Tunai / Cash');
    setPurchaseNotes('');
    setDiscountRate(0);
    setPpnRate(0);
    setReceivingItems([{ productId: '', quantity: 0, costPrice: 0, subtotal: 0, expiryDate: '' }]);
  };

  // Supplier Return Row Helpers
  const handleAddReturnRow = () => {
    setReturnItems((prev) => [...prev, { productId: '', quantity: 0, costPrice: 0 }]);
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
    const overStock = returnItems.find((r) => {
      const p = products.find((x) => x.id === r.productId);
      return p && Number(r.quantity) > (Number(p.stock) || 0);
    });
    const returnError = !returnSupplierName
      ? 'Pilih supplier tujuan retur.'
      : !returnReason
        ? 'Pilih alasan retur.'
        : returnItems.some((r) => !r.productId)
          ? 'Ada baris barang yang belum dipilih produknya. Pilih produknya atau hapus barisnya.'
          : returnItems.some((r) => !(Number(r.quantity) > 0))
            ? 'Jumlah barang yang diretur harus lebih dari 0.'
            : overStock
              ? `Jumlah retur melebihi stok yang ada untuk "${products.find((x) => x.id === overStock.productId)?.name}".`
              : '';
    setReturnFormError(returnError);
    if (returnError) return;

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
    setReturnSupplierName('');
    setReturnReason('');
    setReturnRefInvoice('');
    setReturnNotes('');
    setReturnItems([{ productId: '', quantity: 0, costPrice: 0 }]);
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
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0;">${escapeHtml(settings.storeName)}</h1>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">${escapeHtml(settings.branchName)} • ${escapeHtml(settings.address)}</div>
            <div style="font-size: 11px; color: #64748b;">Telp: ${escapeHtml(settings.phone)}</div>
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
          <div>Filter Kategori: <strong>${escapeHtml(categoryFilter === 'all' ? 'Semua Kategori' : categoryFilter)}</strong></div>
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
                const st = stockStatusOf(p, stockHistory);
                const isLow = st === 'low';
                const isOut = st === 'out';
                const isUnstocked = st === 'unstocked';
                return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${escapeHtml(p.name)}</td>
                  <td style="padding: 6px 8px; font-family: monospace; color: #64748b; font-size: 10px;">${escapeHtml(p.sku)} ${p.barcode ? `• ${escapeHtml(p.barcode)}` : ''}</td>
                  <td style="padding: 6px 8px; color: #64748b;">${escapeHtml(p.categoryId)}</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">${p.stock}</td>
                  <td style="padding: 6px 8px; text-align: center; border-left: 1px dashed #cbd5e1; border-right: 1px dashed #cbd5e1; width: 110px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${formatCurrency(p.costPrice || 0, settings.currency)}</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #059669;">${formatCurrency(p.price, settings.currency)}</td>
                  <td style="padding: 6px 8px; text-align: center; font-size: 10px;">
                    ${isOut ? '<span style="color: #e11d48; font-weight: bold;">HABIS</span>' : isLow ? '<span style="color: #b45309; font-weight: bold;">MENIPIS</span>' : isUnstocked ? '<span style="color: #64748b;">Belum ada stok</span>' : ''}
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
    const filename = `Katalog_Stok_${settings.storeName.replace(/\s+/g, '_')}_${toLocalDateString()}`;
    const headers = ['SKU', 'Barcode', 'Nama Produk', 'Brand', 'Kategori', 'Stok', 'Satuan', 'Min Stok', 'Harga Modal (HPP)', 'Harga Jual', 'Margin (Rp)', 'Exp Date'];
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
      p.expiryDate || '-',
    ]);
    exportToCSV(filename, headers, rows);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Top Banner / Notification */}
      {notificationMsg && (
        <div role="status"
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-700 text-slate-950'
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
                className="px-2.5 py-1 rounded-xl bg-slate-950 text-white hover:bg-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>{notificationMsg.actionLabel}</span>
              </button>
            )}
          </div>
          <button aria-label="Tutup"
            onClick={() => setNotificationMsg(null)}
            className="p-1.5 hover:opacity-80 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 shadow-sm">
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
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-0.5 overflow-x-auto max-w-full">
            <button aria-pressed={activeTab === 'inventory'}
              id="tab-btn-inventory"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Semua Produk</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {products.length.toLocaleString('id-ID')}
              </span>
              {totalAlertsCount > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 flex items-center gap-0.5 shadow-sm"
                  title={`${totalAlertsCount.toLocaleString('id-ID')} produk perlu perhatian: stok habis/menipis atau kedaluwarsa`}
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-slate-950" />
                  <span>{totalAlertsCount.toLocaleString('id-ID')}</span>
                </span>
              )}
            </button>
            <button aria-pressed={activeTab === 'price_history'}
              id="tab-btn-price-history"
              onClick={() => setActiveTab('price_history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'price_history'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Riwayat Harga</span>
            </button>
            <button aria-pressed={activeTab === 'dynamic_pricing'}
              id="tab-btn-dynamic-pricing"
              onClick={() => setActiveTab('dynamic_pricing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'dynamic_pricing'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Harga Dinamis AI</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-400/40">
                PRO
              </span>
            </button>
            <button aria-pressed={activeTab === 'purchases'}
              id="tab-btn-purchases"
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'purchases'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Faktur Masuk</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === 'purchases' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {supplierPurchases.length}
              </span>
            </button>
            <button aria-pressed={activeTab === 'suppliers'}
              id="tab-btn-suppliers"
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'suppliers'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Supplier Mitra</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === 'suppliers' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {suppliers.length}
              </span>
            </button>
            <button aria-pressed={activeTab === 'returns'}
              id="tab-btn-returns"
              onClick={() => setActiveTab('returns')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'returns'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
              <span>Retur Supplier</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === 'returns' ? 'bg-rose-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {purchaseReturns.length}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Grouped & Aesthetic */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Action Button (Contextual per tab) */}
          {activeTab === 'inventory' && (
            <button
              id="btn-add-product"
              onClick={handleOpenAddProduct}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
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

          {activeTab === 'purchases' && (
            <button
              id="btn-open-receiving-tab"
              onClick={() => setIsReceivingOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-slate-900/20 cursor-pointer transition-all active:scale-95 border border-slate-700"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>+ Terima Barang (Faktur)</span>
            </button>
          )}

          {activeTab === 'returns' && (
            <button
              id="btn-open-return-tab"
              onClick={() => setIsReturnOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>+ Retur ke Supplier</span>
            </button>
          )}

          {/* AI RESTOCK INTELLIGENCE - Hidden on mobile for simplicity, prominent on desktop */}
          <button
            id="btn-generate-restock-plan"
            onClick={triggerRestockPlanAnalysis}
            className="hidden sm:flex px-3 py-2 rounded-xl font-bold text-xs items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            title="Analisis tingkat inventaris dengan Gemini AI & buat rekomendasi Purchase Order"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI Restock Plan</span>
          </button>

          {/* AI DYNAMIC PRICING BUTTON */}
          <button
            id="btn-open-dynamic-pricing"
            onClick={() => setActiveTab('dynamic_pricing')}
            className="flex px-3 py-2 rounded-xl font-bold text-xs items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            title="AI Dynamic Pricing: Optimasi harga berdasarkan kompetitor & perputaran stok"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 text-amber-300" />
            <span>Harga Dinamis AI</span>
          </button>

          {/* DYNAMIC QR SHELF LABELS BUTTON */}
          <button
            id="btn-open-qr-shelf-labels"
            onClick={() => {
              setSelectedProductForQR(null);
              setIsQRShelfLabelModalOpen(true);
            }}
            className="flex px-3 py-2 rounded-xl font-bold text-xs items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Cetak Label Rak QR Dinamis: Link real-time stok & tanggal update harga"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Label Rak QR</span>
          </button>

          {/* GROUP 1: Opname & Audit Stok (Dropdown) */}
          <div className="relative hidden md:block" ref={auditDropdownRef}>
            <button
              id="btn-dropdown-audit"
              onClick={() => {
                setIsAuditDropdownOpen(!isAuditDropdownOpen);
                setIsLogisticsDropdownOpen(false);
                setIsMoreToolsDropdownOpen(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
              <span>Opname &amp; Audit</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isAuditDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAuditDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2">
                <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Audit Fisik &amp; Penyesuaian
                </div>
                <button
                  onClick={() => {
                    setIsAuditDropdownOpen(false);
                    setIsAiStockOpnameOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Video className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div>Cek Stok AI (Kamera)</div>
                    <div className="text-[11px] text-slate-500 font-normal">Identifikasi visual rak otomatis</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsAuditDropdownOpen(false);
                    setIsStockTakeCSVOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div>Stock Opname CSV / Excel</div>
                    <div className="text-[11px] text-slate-500 font-normal">Update massal cepat via tabel</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsAuditDropdownOpen(false);
                    handleOpenBulkAdjustToolbar();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <div>Penyesuaian Stok Massal</div>
                    <div className="text-[11px] text-slate-500 font-normal">Ubah stok &amp; expired serentak</div>
                  </div>
                </button>
                <button
                  id="btn-ai-category-mapper"
                  onClick={() => {
                    setIsAuditDropdownOpen(false);
                    setIsAiCategoryMapperOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span>Pemetaan Kategori AI</span>
                      <span className="px-1 py-0.2 text-[11px] font-bold rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        Sistematis
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">Selaraskan kategori katalog via AI</div>
                  </div>
                </button>
                <button
                  id="btn-import-direct-file"
                  onClick={() => {
                    setIsAuditDropdownOpen(false);
                    setIsDirectFileImportOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span>Impor File Langsung (As-Is)</span>
                      <span className="px-1 py-0.2 text-[11px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Tanpa Koreksi
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">Impor CSV/Excel asli tanpa auto-koreksi</div>
                  </div>
                </button>
                <button
                  id="btn-import-with-correction"
                  onClick={() => {
                    setIsAuditDropdownOpen(false);
                    setIsDataImportOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div>Impor dengan Auto-Koreksi AI</div>
                    <div className="text-[11px] text-slate-500 font-normal">Pembersihan ejaan singkatan &amp; gramasi</div>
                  </div>
                </button>
                {(activeEmployee?.role === 'owner' || activeEmployee?.role === 'supervisor') && (
                  <button
                    id="btn-price-update-file"
                    onClick={() => {
                      setIsAuditDropdownOpen(false);
                      setIsPriceUpdateOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-700" />
                    <div>
                      <div>Perbarui Harga dari File</div>
                      <div className="text-[11px] text-slate-500 font-normal">Excel/CSV: barcode + harga baru, ditinjau dulu</div>
                    </div>
                  </button>
                )}
                {/* Hapus produk hasil impor (dulu jendelanya ada tetapi tidak ada tombol pembukanya) */}
                {importedCount > 0 && (activeEmployee?.role === 'owner' || activeEmployee?.role === 'supervisor') && (
                  <button
                    id="btn-clear-imported"
                    onClick={() => {
                      setIsAuditDropdownOpen(false);
                      setIsClearImportedModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <div>
                      <div>Hapus Data Impor ({importedCount.toLocaleString('id-ID')})</div>
                      <div className="text-[11px] text-slate-500 font-normal">Hanya produk hasil impor; produk yang dibuat manual tetap</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* GROUP 2: Logistik & Faktur (Dropdown) */}
          <div className="relative hidden md:block" ref={logisticsDropdownRef}>
            <button
              id="btn-dropdown-logistics"
              onClick={() => {
                setIsLogisticsDropdownOpen(!isLogisticsDropdownOpen);
                setIsAuditDropdownOpen(false);
                setIsMoreToolsDropdownOpen(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all shadow-sm"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Logistik &amp; Faktur</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isLogisticsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLogisticsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2">
                <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Pengadaan &amp; Supplier
                </div>
                <button
                  onClick={() => {
                    setIsLogisticsDropdownOpen(false);
                    setIsReceivingOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div>+ Terima Barang / PO</div>
                    <div className="text-[11px] text-slate-500 font-normal">Input faktur &amp; tambah stok baru</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsLogisticsDropdownOpen(false);
                    setIsReturnOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <div>+ Retur ke Supplier</div>
                    <div className="text-[11px] text-slate-500 font-normal">Pengembalian barang rusak / exp</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsLogisticsDropdownOpen(false);
                    handleOpenAddSupplier();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <div>+ Tambah Mitra Supplier</div>
                    <div className="text-[11px] text-slate-500 font-normal">Kelola kontak vendor &amp; tempo</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* GROUP 3: Data & Utilitas (Dropdown) */}
          <div className="relative hidden md:block" ref={moreToolsDropdownRef}>
            <button
              id="btn-dropdown-more-tools"
              onClick={() => {
                setIsMoreToolsDropdownOpen(!isMoreToolsDropdownOpen);
                setIsAuditDropdownOpen(false);
                setIsLogisticsDropdownOpen(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-amber-500" />
              <span>Data &amp; Cadangan</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMoreToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreToolsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2">
                <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Analisis &amp; Pemulihan
                </div>
                <button
                  onClick={() => {
                    setIsMoreToolsDropdownOpen(false);
                    handleSwitchToPriceHistoryTab();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div>Riwayat Fluktuasi Harga</div>
                    <div className="text-[11px] text-slate-500 font-normal">Pantau riwayat modal &amp; harga jual</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsMoreToolsDropdownOpen(false);
                    setIsBackupRestoreOpen(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div>Backup &amp; Restore Database</div>
                    <div className="text-[11px] text-slate-500 font-normal">Buat titik pemulihan data (F9)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category & Origin Filters */}
        {activeTab === 'inventory' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <select aria-label="Filter kategori"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 cursor-pointer font-medium"
            >
              <option value="all">Semua Kategori</option>
              {categories.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select aria-label="Filter asal produk"
              value={productOriginFilter}
              onChange={(e) => setProductOriginFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Asal Produk ({products.length.toLocaleString('id-ID')})</option>
              <option value="imported">Khusus Hasil Impor ({importedCount.toLocaleString('id-ID')})</option>
              <option value="default">Produk Non-Impor ({products.length - importedCount})</option>
            </select>

            {/* Filter Posisi & Tampilan Barang Stok Kosong */}
            <select aria-label="Tampilan barang stok kosong"
              id="inventory-out-of-stock-filter-select"
              value={settings.outOfStockDisplay ?? 'bottom'}
              onChange={(e) => updateSettings({ outOfStockDisplay: e.target.value as any })}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              title="Pengaturan urutan dan visibilitas barang stok kosong / habis"
            >
              <option value="bottom">Stok Habis: Di Urutan Bawah ⬇</option>
              <option value="hide">Stok Habis: Sembunyikan ‍</option>
              <option value="normal">Stok Habis: Urutan Normal</option>
            </select>

            {/* (Filter Menipis/Kedaluwarsa ada di baris ringkasan di bawah; tidak diulang) */}

          </div>
        ) : activeTab === 'suppliers' ? (
          <div className="flex items-center gap-2">
            <select aria-label="Filter kategori supplier"
              value={supplierCategoryFilter}
              onChange={(e) => setSupplierCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-500 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
              Total Fisik: <strong className="text-slate-900 dark:text-white font-mono">{totalStockUnits.toLocaleString('id-ID')}</strong> pcs
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Valuasi: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatCurrency(totalValuation, settings.currency)}</strong>
            </span>
            {outOfStockCount > 0 && (
              <button
                type="button"
                onClick={() => setAlertFilter(alertFilter === 'out-of-stock' ? 'all' : 'out-of-stock')}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 cursor-pointer hover:scale-105 transition"
                title="Klik untuk menyaring produk habis (0 stok)"
              >
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                Habis: {outOfStockCount.toLocaleString('id-ID')}
              </button>
            )}
            {(settings.outOfStockDisplay ?? 'bottom') === 'hide' && alertFilter !== 'out-of-stock' && outOfStockCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                <EyeOff className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                {outOfStockCount.toLocaleString('id-ID')} disembunyikan
              </span>
            )}
            {unstockedCount > 0 && (
              <button
                type="button"
                onClick={() => setAlertFilter(alertFilter === 'unstocked' ? 'all' : 'unstocked')}
                aria-pressed={alertFilter === 'unstocked'}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer ${
                  alertFilter === 'unstocked'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
                title="Produk dengan stok 0 yang belum pernah diterima, di-opname, atau terjual (mis. hasil impor). Bukan peringatan."
              >
                Belum ada stok: {unstockedCount.toLocaleString('id-ID')}
              </button>
            )}
            {lowStockCount > 0 && (
              <button
                type="button"
                onClick={() => setAlertFilter(alertFilter === 'low-stock' ? 'all' : 'low-stock')}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 cursor-pointer hover:scale-105 transition"
                title="Klik untuk menyaring produk stok menipis"
              >
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                Menipis: {lowStockCount.toLocaleString('id-ID')}
              </button>
            )}
            {expiredCount > 0 && (
              <button
                type="button"
                onClick={() => setAlertFilter(alertFilter === 'critical-exp' ? 'all' : 'critical-exp')}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1 cursor-pointer hover:scale-105 transition"
                title="Klik untuk menyaring produk kedaluwarsa"
              >
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Kedaluwarsa: {expiredCount.toLocaleString('id-ID')}
              </button>
            )}
            {criticalExpCount > 0 && (
              <button
                type="button"
                onClick={() => setAlertFilter(alertFilter === 'critical-exp' ? 'all' : 'critical-exp')}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1 cursor-pointer hover:scale-105 transition"
                title="Klik untuk menyaring produk kritis (≤30 hari)"
              >
                <Clock className="w-3 h-3 text-rose-600" />
                Hampir kedaluwarsa (≤ 30 hari): {criticalExpCount.toLocaleString('id-ID')}
              </button>
            )}
            {approachingExpCount > 0 && (
              <button
                type="button"
                onClick={() => setAlertFilter(alertFilter === 'approaching-exp' ? 'all' : 'approaching-exp')}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1 cursor-pointer hover:scale-105 transition"
                title="Klik untuk menyaring produk mendekati exp (31-90 hari)"
              >
                <Clock className="w-3 h-3 text-amber-700" />
                ≤ 90 hari: {approachingExpCount.toLocaleString('id-ID')}
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const count = applyMinStockRuleToAllProducts();
                  setNotificationMsg({
                    type: 'success',
                    text: `Sinkronisasi Aturan Stok Berhasil: Batas minimal stok (50% dari order terakhir) telah diterapkan ke ${count} produk katalog.`,
                  });
                  setTimeout(() => setNotificationMsg(null), 5000);
                }}
                className="px-2.5 py-1 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                title="Terapkan aturan batas stok: minimal 50% dari jumlah order terakhir ke seluruh produk"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Aturan 50% PO</span>
              </button>
              <button
                onClick={() => {
                  setProductForPriceTag(null);
                  setIsPriceTagModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                title="Cetak label harga rak / pricetag dalam ukuran kertas A4 atau F4"
              >
                <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>Cetak Pricetag (A4 / F4)</span>
              </button>
              <button
                onClick={handlePrintStockSheet}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                title="Cetak lembar audit fisik / katalog inventaris"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cetak Lembar Stok</span>
              </button>
              <button
                onClick={handleExportStockCSV}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
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
              {filteredPurchases.length !== supplierPurchases.length && (
                <span className="text-slate-500 text-[11px] ml-1">(dari {supplierPurchases.length})</span>
              )}
            </span>
            <button
              onClick={() => {
                setProductForPriceTag(null);
                setPurchaseForPriceTag(supplierPurchases[0] || null);
                setIsPriceTagModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Cetak label pricetag rak atau stiker barcode dari faktur pembelian supplier"
            >
              <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Cetak Pricetag per Faktur</span>
            </button>
          </div>
        )}

        {/* Returns Metrics */}
        {activeTab === 'returns' && (
          <div className="flex items-center gap-3 text-xs flex-wrap ml-auto">
            <span className="text-slate-500 dark:text-slate-400">
              Total Retur: <strong className="text-slate-900 dark:text-white font-mono">{filteredReturns.length}</strong>
              {filteredReturns.length !== purchaseReturns.length && (
                <span className="text-slate-500 text-[11px] ml-1">(dari {purchaseReturns.length})</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Batch Action Bar for Selected Products */}
      {activeTab === 'inventory' && selectedProductIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-150 border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[11px] font-black">
                {selectedProductIds.length}
              </span>
              <span>Produk Terpilih</span>
            </span>

            {importedCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllImported}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 cursor-pointer transition-colors"
              >
                Pilih Semua Hasil Impor ({importedCount.toLocaleString('id-ID')})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
            >
              Batal Pilihan
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedProductForQR(null);
                setIsQRShelfLabelModalOpen(true);
              }}
              className="px-3.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
              title="Cetak label rak QR dinamis untuk produk yang dipilih"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-200" />
              <span>Cetak Label QR ({selectedProductIds.length})</span>
            </button>
            <button
              type="button"
              onClick={handleOpenBulkAdjustSelected}
              className="px-3.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
              title="Perbarui kuantitas stok fisik dan tanggal kedaluwarsa produk terpilih secara massal"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-950" />
              <span>Penyesuaian Stok Massal ({selectedProductIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedProductIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'inventory' ? (
          <div className="flex flex-col min-h-full">
            {/* Inventory Alerts & Notifications Hub */}
            <InventoryAlertBanner
              products={products}
              stockHistory={stockHistory}
              currentAlertFilter={alertFilter}
              onSelectAlertFilter={setAlertFilter}
              onOpenReceiving={handleOpenReceivingForProduct}
              onOpenReturn={handleOpenReturnForProduct}
              onOpenBulkAdjust={handleOpenBulkAdjustForProducts}
              onOpenPriceTagPromo={(prod) => {
                setProductForPriceTag(prod || null);
                setIsPriceTagModalOpen(true);
              }}
              onGenerateRestockPlan={triggerRestockPlanAnalysis}
              currency={settings.currency}
            />

            {/* Master Products Table */}
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input aria-label="Pilih semua produk"
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        filteredProducts.every((p) => selectedProductIds.includes(p.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded-md text-emerald-700 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title="Pilih semua produk pada filter saat ini"
                    />
                  </th>
                  <th className="py-3 px-4">Produk / Barang</th>
                  {showBrandColumn && <th className="py-3 px-4">Brand</th>}
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4 text-right">Harga Modal</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-center">Stok Fisik</th>
                  <th className="py-3 px-4 text-center">Status / FEFO</th>
                  <th className="py-3 px-4 text-right">Aksi & Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((prod) => {
                    const rowStatus = stockStatusOf(prod, stockHistory);
                    const isUnstocked = rowStatus === 'unstocked';
                    const isLow = rowStatus === 'low' || rowStatus === 'out';
                    const isZero = rowStatus === 'out';
                    const isImported = isImportedProduct(prod);
                    const isSelected = selectedProductIds.includes(prod.id);
                    const expiryDiff = getProductExpiryDiffDays(prod.expiryDate);
                    const isExpired = expiryDiff !== null && expiryDiff < 0;
                    const isCriticalExp = expiryDiff !== null && expiryDiff >= 0 && expiryDiff <= 30;
                    const isApproachingExp = expiryDiff !== null && expiryDiff > 30 && expiryDiff <= 90;

                    const rowClass = isSelected
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                      : isExpired || isZero
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/30'
                      : isCriticalExp || isLow
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50';

                    return (
                      <tr
                        key={prod.id}
                        className={`transition-colors group ${rowClass}`}
                      >
                        {/* Checkbox Select */}
                        <td className="py-3 px-3 text-center">
                          <input aria-label={`Pilih ${prod.name}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectProduct(prod.id)}
                            className="w-4 h-4 rounded-md text-emerald-700 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>

                        {/* Product Name & Details */}
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {prod.name}
                              </p>
                              {isImported && (
                                <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                  HASIL IMPOR
                                </span>
                              )}
                              {prod.promoBadge && (
                                <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                  {prod.promoBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Brand */}
                        {showBrandColumn && (
                        <td className="py-3 px-4">
                          <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {prod.brand || '-'}
                          </div>
                        </td>
                        )}

                        {/* SKU / Barcode */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <div className="font-bold">{prod.sku}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">{prod.barcode}</div>
                        </td>

                        {/* Cost */}
                        <td
                          className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-amber-50/70 dark:hover:bg-amber-950/40 rounded-xl group/cost transition-colors"
                          onClick={() => handleOpenPriceHistory(prod)}
                          title="Klik untuk melihat riwayat fluktuasi harga modal (HPP)"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>{formatCurrency(prod.costPrice, settings.currency)}</span>
                            <TrendingUp className="w-3 h-3 text-amber-500 opacity-0 group-hover/cost:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </td>

                        {/* Selling Price */}
                        <td
                          className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 rounded-xl group/price transition-colors"
                          onClick={() => handleOpenPriceHistory(prod)}
                          title="Klik untuk melihat riwayat fluktuasi harga jual retail"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>{formatCurrency(prod.price, settings.currency)}</span>
                            <TrendingUp className="w-3 h-3 text-emerald-500 opacity-0 group-hover/price:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </td>

                        {/* Stock Level */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-black text-sm ${
                              isZero
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLow
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {prod.stock}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                            min: {prod.minStock}
                            {prod.lastOrderQuantity ? (
                              <span className="ml-1 text-[11px] text-blue-600 dark:text-blue-400 font-sans" title={`Batas min 50% dari order terakhir (${prod.lastOrderQuantity})`}>
                                (50% PO: {prod.lastOrderQuantity})
                              </span>
                            ) : null}
                          </span>
                        </td>

                        {/* Status / FEFO */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {/* Stock status badge */}
                            {isZero ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-0.5">
                                <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                                HABIS
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                MENIPIS
                              </span>
                            ) : isUnstocked ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                title="Stok 0 dan belum pernah diterima, di-opname, atau terjual"
                              >
                                Belum ada stok
                              </span>
                            ) : null /* Aman: tidak perlu lencana, hanya pengecualian yang ditandai */}

                            {/* Expiry date status badge */}
                            {prod.expiryDate && (
                              isExpired ? (
                                <span className="px-1.5 py-0.5 rounded-md text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 font-mono">
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                  Lewat {Math.abs(expiryDiff!)} hari
                                </span>
                              ) : isCriticalExp ? (
                                <span className="px-1.5 py-0.5 rounded-md text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 font-mono">
                                  <Clock className="w-2.5 h-2.5 text-rose-600" />
                                  {expiryDiff} hari lagi
                                </span>
                              ) : isApproachingExp ? (
                                <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 font-mono">
                                  <Clock className="w-2.5 h-2.5 text-amber-700" />
                                  {expiryDiff} hari lagi
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  Kedaluwarsa {prod.expiryDate}
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Tempat tetap untuk aksi cepat (Terima/Retur) agar ikon di semua baris sejajar */}
                            <span className="inline-flex justify-end min-w-[88px]">
                            {/* Quick Restock button for zero or low stock */}
                            {(isZero || isLow) && (
                              <button
                                onClick={() => handleOpenReceivingForProduct(prod)}
                                title="Restock / Terima Barang dari Faktur"
                                className="px-2 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                              >
                                <Truck className="w-3 h-3" />
                                <span>+ Terima</span>
                              </button>
                            )}

                            {/* Quick Return button for expired product */}
                            {isExpired && (
                              <button
                                onClick={() => handleOpenReturnForProduct(prod)}
                                title="Buat Retur Pengembalian ke Supplier"
                                className="px-2 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retur</span>
                              </button>
                            )}
                            </span>

                            {/* Print Pricetag for this Item */}
                            <button aria-label="Cetak Pricetag / Label Rak Item Ini"
                              onClick={() => {
                                setProductForPriceTag(prod);
                                setIsPriceTagModalOpen(true);
                              }}
                              title="Cetak Pricetag / Label Rak Item Ini"
                              className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Dynamic QR Shelf Label */}
                            <button aria-label="Cetak Label Rak QR Dinamis (Real-Time Stok & Tgl Update Harga)"
                              onClick={() => {
                                setSelectedProductForQR(prod);
                                setIsQRShelfLabelModalOpen(true);
                              }}
                              title="Cetak Label Rak QR Dinamis (Real-Time Stok & Tgl Update Harga)"
                              className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Price History Button */}
                            <button aria-label="Riwayat Fluktuasi Harga Modal (HPP) &amp; Harga Jual Retail"
                              id={`btn-price-history-${prod.id}`}
                              onClick={() => handleOpenPriceHistory(prod)}
                              title="Riwayat Fluktuasi Harga Modal (HPP) &amp; Harga Jual Retail"
                              className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Item Button */}
                            <button aria-label="Edit Data Item Barang"
                              onClick={() => handleOpenEditProduct(prod)}
                              title="Edit Data Item Barang"
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Adjust Stock Button */}
                            <button
                              onClick={() => handleOpenAdjust(prod)}
                              title="Koreksi Stok Cepat"
                              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Koreksi
                            </button>

                            {/* Delete Item Button */}
                            <button aria-label="Hapus Produk dari Master Data"
                              onClick={() => setProductToDelete(prod)}
                              title="Hapus Produk dari Master Data"
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-500 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
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
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {alertFilter !== 'all'
                          ? 'Tidak ada produk dengan kriteria filter peringatan ini'
                          : 'Tidak ada produk ditemukan'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {alertFilter !== 'all'
                          ? 'Semua produk memenuhi standar atau tidak ada yang sesuai filter alert aktif.'
                          : 'Coba sesuaikan kata kunci pencarian atau filter asal barang.'}
                      </p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {alertFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setAlertFilter('all')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Tampilkan Semua Produk
                          </button>
                        )}
                        <button
                          onClick={handleOpenAddProduct}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Item Sekarang
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Toolbar */}
            {filteredProducts.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span>
                    Menampilkan <strong className="text-slate-800 dark:text-slate-200 font-mono">{Math.min((productPage - 1) * productPageSize + 1, filteredProducts.length)} - {Math.min(productPage * productPageSize, filteredProducts.length)}</strong> dari <strong className="text-slate-800 dark:text-slate-200 font-mono">{filteredProducts.length.toLocaleString('id-ID')}</strong> produk
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <label className="flex items-center gap-1.5">
                    <span className="text-[11px]">Baris:</span>
                    <select
                      value={productPageSize}
                      onChange={(e) => {
                        setProductPageSize(Number(e.target.value));
                        setProductPage(1);
                      }}
                      className="px-2 py-0.5 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPage <= 1}
                    className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition cursor-pointer shadow-sm"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {productPage} / {totalProductPages}
                  </span>
                  <button
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    disabled={productPage >= totalProductPages}
                    className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition cursor-pointer shadow-sm"
                    title="Halaman Berikutnya"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'price_history' ? (
          <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50">
            <ProductPriceHistoryView
              products={products}
              initialProductId={priceHistoryProductId || products[0]?.id}
              settings={settings}
              onUpdateProductPrice={(productId, newCost, newPrice, record) => {
                recordProductPriceChange(productId, newCost, newPrice, record);
                setNotificationMsg({
                  type: 'success',
                  text: 'Penyesuaian harga produk berhasil disimpan ke riwayat harga.',
                });
                setTimeout(() => setNotificationMsg(null), 5000);
              }}
            />
          </div>
        ) : activeTab === 'dynamic_pricing' ? (
          <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50">
            <DynamicPricingModule
              products={products}
              transactions={transactions}
              categories={categories}
              currency={settings.currency}
              onApplyPriceUpdate={(productId, newPrice, historyRecord) => {
                const prod = products.find((p) => p.id === productId);
                recordProductPriceChange(
                  productId,
                  prod ? prod.costPrice : historyRecord.costPrice,
                  newPrice,
                  historyRecord
                );
                updateProduct(productId, { price: newPrice });
                setNotificationMsg({
                  type: 'success',
                  text: 'Harga produk berhasil diperbarui via AI Dynamic Pricing.',
                });
                setTimeout(() => setNotificationMsg(null), 5000);
              }}
              onApplyBatchPriceUpdates={(updates) => {
                updates.forEach((u) => {
                  const prod = products.find((p) => p.id === u.productId);
                  recordProductPriceChange(
                    u.productId,
                    prod ? prod.costPrice : u.historyRecord.costPrice,
                    u.newPrice,
                    u.historyRecord
                  );
                  updateProduct(u.productId, { price: u.newPrice });
                });
                setNotificationMsg({
                  type: 'success',
                  text: `${updates.length} penyesuaian harga produk berhasil diterapkan secara massal.`,
                });
                setTimeout(() => setNotificationMsg(null), 5000);
              }}
              onUpdateProductCompetitors={(productId, competitors) => {
                updateProduct(productId, { competitorPrices: competitors });
              }}
            />
          </div>
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
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 inline-block mb-1">
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
                              <span className="text-slate-500 text-[11px] font-medium min-w-[70px]">PIC Kontak:</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{sup.contactPerson}</strong>
                            </div>
                          )}

                          {sup.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{sup.phone}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-500 italic text-[11px]">
                              <Phone className="w-3.5 h-3.5 opacity-50 shrink-0" />
                              <span>Telepon tidak dicatat</span>
                            </div>
                          )}

                          {sup.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-slate-500 dark:text-slate-400 truncate">{sup.email}</span>
                            </div>
                          )}

                          {sup.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
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
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
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
                        <button aria-label="Edit Supplier"
                          onClick={() => handleOpenEditSupplier(sup)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button aria-label="Hapus Supplier"
                          onClick={() => setSupplierToDelete(sup)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-500 text-xs font-semibold cursor-pointer transition-colors"
                          title="Hapus Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada supplier ditemukan</p>
                  <p className="text-xs text-slate-500 mt-1">Daftarkan mitra distributor/supplier baru untuk memudahkan pembelian dan retur barang.</p>
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
          /* Supplier Purchases Invoices Table with Date Filter */
          <div className="flex flex-col min-h-full">
            <DateFilterBar
              idPrefix="inventory-purchases-date-filter"
              label="Filter Tanggal Faktur Masuk"
              preset={purchaseDatePreset}
              startDate={purchaseStartDate}
              endDate={purchaseEndDate}
              onPresetChange={(newPreset, sDate, eDate) => {
                setPurchaseDatePreset(newPreset);
                setPurchaseStartDate(sDate);
                setPurchaseEndDate(eDate);
              }}
              onDateChange={(sDate, eDate) => {
                setPurchaseStartDate(sDate);
                setPurchaseEndDate(eDate);
                setPurchaseDatePreset('custom');
              }}
              totalFilteredCount={filteredPurchases.length}
              totalAllCount={supplierPurchases.length}
              summaryBadge={
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Total Tagihan:
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                    {formatCurrency(totalFilteredPurchaseAmount, settings.currency)}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    ({totalFilteredPurchaseQty} pcs barang)
                  </span>
                </div>
              }
            />

            {/* Payment Terms Quick Filter Tabs */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium mr-1 text-[11px]">Skema Bayar:</span>
                <button aria-pressed={purchaseTermsFilter === 'all'}
                  type="button"
                  onClick={() => setPurchaseTermsFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    purchaseTermsFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Semua Syarat</span>
                  <span className="text-[11px] opacity-75 font-mono">({supplierPurchases.length})</span>
                </button>

                <button aria-pressed={purchaseTermsFilter === 'tempo'}
                  type="button"
                  onClick={() => setPurchaseTermsFilter('tempo')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    purchaseTermsFilter === 'tempo'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tempo (TOP)</span>
                  <span className="text-[11px] opacity-75 font-mono">({purchaseTermsStats.tempoCount})</span>
                  {purchaseTermsStats.urgentTempoCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                      {purchaseTermsStats.urgentTempoCount} jatuh tempo
                    </span>
                  )}
                </button>

                <button aria-pressed={purchaseTermsFilter === 'consignment'}
                  type="button"
                  onClick={() => setPurchaseTermsFilter('consignment')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    purchaseTermsFilter === 'consignment'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Konsinyasi / Titip Jual</span>
                  <span className="text-[11px] opacity-75 font-mono">({purchaseTermsStats.consignmentCount})</span>
                </button>

                <button aria-pressed={purchaseTermsFilter === 'cash'}
                  type="button"
                  onClick={() => setPurchaseTermsFilter('cash')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    purchaseTermsFilter === 'cash'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tunai / Cash</span>
                  <span className="text-[11px] opacity-75 font-mono">({purchaseTermsStats.cashCount})</span>
                </button>
              </div>

              {/* Quick totals breakdown */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Utang Tempo: <strong className="text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(purchaseTermsStats.tempoTotal, settings.currency)}</strong></span>
                <span>Titip Jual: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{formatCurrency(purchaseTermsStats.consignmentTotal, settings.currency)}</strong></span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="py-3 px-4">No. Faktur / Waktu</th>
                    <th className="py-3 px-4">Supplier & Syarat Bayar</th>
                    <th className="py-3 px-4">Barang Dibeli</th>
                    <th className="py-3 px-4 text-right">Diskon & DPP</th>
                    <th className="py-3 px-4 text-right">PPN Masukan</th>
                    <th className="py-3 px-4 text-right">Total Tagihan</th>
                    <th className="py-3 px-4 text-center">Aksi & Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredPurchases.length > 0 ? (
                    filteredPurchases.map((purch) => {
                      const termsInfo = withPaymentStatus(
                        parsePaymentTermsInfo(purch.createdAt, purch.paymentTerms),
                        purchaseOutstandingOf(purch)
                      );
                      return (
                        <tr key={purch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                              {purch.invoiceNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {formatDate(purch.createdAt)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{purch.supplierName}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${termsInfo.badgeClasses.bg} ${termsInfo.badgeClasses.border} ${termsInfo.badgeClasses.text}`}>
                                <CreditCard className="w-3 h-3" />
                                <span>{termsInfo.badgeLabel}</span>
                              </span>
                              {termsInfo.category === 'tempo' && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  termsInfo.urgency === 'overdue' || termsInfo.urgency === 'urgent'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  <span>{termsInfo.statusBadgeText} ({termsInfo.dueDateFormatted})</span>
                                </span>
                              )}
                            </div>
                            {purch.notes && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1 line-clamp-1">
                                {purch.notes}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {(purch.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-[11px]">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {item.quantity}x
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-300">
                                    {item.productName}
                                  </span>
                                  <span className="text-slate-500 font-mono text-[11px]">
                                    (@{formatCurrency(item.costPrice, settings.currency)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-mono">
                            {purch.discountAmount && purch.discountAmount > 0 ? (
                              <div>
                                <span className="text-rose-600 font-medium text-[11px]">
                                  -{formatCurrency(purch.discountAmount, settings.currency)} ({purch.discountRate}%)
                                </span>
                                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                  DPP: {formatCurrency(purch.dppAmount ?? 0, settings.currency)}
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {formatCurrency(purch.subtotal || purch.totalAmount, settings.currency)}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono">
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                              +{formatCurrency(purch.ppnAmount || 0, settings.currency)}
                            </div>
                            <span className="text-[11px] text-slate-500">PPN {purch.ppnRate || 0}%</span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono">
                            <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(purch.finalTotal ?? purch.totalAmount, settings.currency)}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {(purch.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0)} total pcs
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPurchaseForDetail(purch);
                                  setIsPurchaseDetailOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                title={`Lihat rincian & cetak nota faktur pembelian ${purch.invoiceNumber}`}
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Lihat Faktur</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForPriceTag(null);
                                  setPurchaseForPriceTag(purch);
                                  setIsPriceTagModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                title={`Cetak pricetag untuk ${purch.items.length} item barang dari faktur ${purch.invoiceNumber}`}
                              >
                                <Tag className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                <span>Pricetag</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        {supplierPurchases.length > 0 ? (
                          <div className="max-w-md mx-auto space-y-2">
                            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              Tidak ada faktur pembelian pada periode ini ({formatPeriodLabel(purchaseDatePreset, purchaseStartDate, purchaseEndDate)}).
                            </p>
                            <p className="text-xs text-slate-500">
                              Terdapat {supplierPurchases.length} faktur pembelian tercatat pada tanggal lainnya.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setPurchaseDatePreset('all');
                                setPurchaseStartDate('');
                                setPurchaseEndDate('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition"
                            >
                              <span>Tampilkan Seluruh Faktur ({supplierPurchases.length})</span>
                            </button>
                          </div>
                        ) : (
                          <div>
                            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada faktur pembelian supplier</p>
                            <p className="text-xs text-slate-500 mt-1">Catat penerimaan stok masuk dengan mengklik tombol "+ Input Pembelian".</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Purchase Returns Table with Date Filter */
          <div className="flex flex-col min-h-full">
            <DateFilterBar
              idPrefix="inventory-returns-date-filter"
              label="Filter Tanggal Retur Supplier"
              preset={returnDatePreset}
              startDate={returnStartDate}
              endDate={returnEndDate}
              onPresetChange={(newPreset, sDate, eDate) => {
                setReturnDatePreset(newPreset);
                setReturnStartDate(sDate);
                setReturnEndDate(eDate);
              }}
              onDateChange={(sDate, eDate) => {
                setReturnStartDate(sDate);
                setReturnEndDate(eDate);
                setReturnDatePreset('custom');
              }}
              totalFilteredCount={filteredReturns.length}
              totalAllCount={purchaseReturns.length}
              summaryBadge={
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Total Klaim Retur:
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                    -{formatCurrency(totalFilteredReturnAmount, settings.currency)}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    ({totalFilteredReturnQty} pcs barang keluar)
                  </span>
                </div>
              }
            />
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 backdrop-blur-xs">
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
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {formatDate(ret.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ret.supplierName}
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-block mt-1">
                            {ret.reason}
                          </span>
                          {ret.notes && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                              {ret.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {(ret.items || []).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px]">
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  -{item.quantity}x
                                </span>
                                <span className="text-slate-800 dark:text-slate-200">
                                  {item.productName}
                                </span>
                                <span className="text-slate-500 font-mono text-[11px]">
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
                          <span className="text-[11px] text-slate-500">
                            {(ret.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0)} pcs keluar
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        {purchaseReturns.length > 0 ? (
                          <div className="max-w-md mx-auto space-y-2">
                            <RotateCcw className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              Tidak ada nota retur supplier pada periode ini ({formatPeriodLabel(returnDatePreset, returnStartDate, returnEndDate)}).
                            </p>
                            <p className="text-xs text-slate-500">
                              Terdapat {purchaseReturns.length} nota retur supplier tercatat pada tanggal lainnya.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setReturnDatePreset('all');
                                setReturnStartDate('');
                                setReturnEndDate('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition"
                            >
                              <span>Tampilkan Seluruh Retur ({purchaseReturns.length})</span>
                            </button>
                          </div>
                        ) : (
                          <div>
                            <RotateCcw className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada nota retur supplier</p>
                            <p className="text-xs text-slate-500 mt-1">Kembalikan barang rusak/kedaluwarsa ke distributor melalui tombol "+ Retur ke Supplier".</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Fast Stock Correction Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
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
              <button aria-label="Tutup"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{editingProduct.name}</p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-500">Stok Saat Ini:</span>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                  {editingProduct.stock}
                </span>
              </div>
            </div>

            {/* Adjustment Type Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button aria-pressed={adjustmentType === 'add'}
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`py-1 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  adjustmentType === 'add' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                + Tambah
              </button>
              <button aria-pressed={adjustmentType === 'subtract'}
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`py-1 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  adjustmentType === 'subtract' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                - Kurang
              </button>
              <button aria-pressed={adjustmentType === 'set'}
                type="button"
                onClick={() => setAdjustmentType('set')}
                className={`py-1 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  adjustmentType === 'set' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
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
                aria-label="Jumlah koreksi stok"
                min={0}
                value={adjustmentValue || ''}
                onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  : Math.max(0, adjustmentValue || 0)}
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
                className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
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
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
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
                Sisa Stok Fisik: {productToDelete.stock}
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
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
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
              {supplierToDelete.phone ? (
                <p className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{supplierToDelete.phone}</p>
              ) : (
                <p className="text-slate-500 italic text-xs">Tidak ada nomor telepon</p>
              )}
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
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
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
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Foto Faktur (AI Vision)</span>
                </button>
                <button aria-label="Tutup"
                  onClick={() => setIsReceivingOpen(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
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
                    <select aria-label="Nama Supplier / Distributor"
                      value={supplierName}
                      onChange={(e) => {
                        setSupplierName(e.target.value);
                        const found = suppliers.find((s) => s.name === e.target.value);
                        if (found && found.paymentTerms) {
                          setPaymentTerms(found.paymentTerms);
                        }
                      }}
                      className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category || 'Distributor'})
                        </option>
                      ))}
                      <option value="Supplier Lainnya / Grosir Lokal">Supplier Lainnya / Grosir Lokal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      No. Faktur / Surat Jalan Supplier
                    </label>
                    <input aria-label="No. Faktur / Surat Jalan Supplier"
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Dari nota supplier (kosongkan bila tidak ada)"
                      className="w-full p-2 font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Syarat Pembayaran
                    </label>
                    <select aria-label="Syarat Pembayaran"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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

                {/* Rule 50% Alert Banner */}
                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start sm:items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-start sm:items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-bold">Aturan Batas Minimal Stok:</span> Sistem otomatis memperbarui batas minimal stok (safety stock) produk menjadi{' '}
                      <span className="font-bold text-blue-700 dark:text-blue-300">50% dari jumlah order faktur ini</span>.
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Rule 50% Aktif
                  </span>
                </div>

                {/* Barcode Scanner Input Bar */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex-1 relative flex items-center">
                      <div className="absolute left-3 text-slate-500 dark:text-slate-400 pointer-events-none">
                        <ScanBarcode className="w-4 h-4 text-emerald-500" />
                      </div>
                      <input aria-label="Scan barcode fisik produk / ketik SKU lalu tekan Enter..."
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanBarcode(barcodeInput);
                          }
                        }}
                        placeholder="Scan barcode fisik produk / ketik SKU lalu tekan Enter..."
                        className="w-full pl-9 pr-24 py-2 text-xs font-mono rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleScanBarcode(barcodeInput)}
                          className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition shadow-sm active:scale-95"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBarcodeCameraOpen(true)}
                        className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-sm shrink-0"
                        title="Scan barcode produk menggunakan kamera komputer / HP"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Scan Kamera</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddReceivingRow}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 dark:hover:bg-emerald-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer transition-colors text-xs border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Manual</span>
                      </button>
                    </div>
                  </div>

                  {/* Barcode Feedback Alert */}
                  {barcodeFeedback && (
                    <div role="status"
                      className={`p-2 rounded-xl text-xs flex items-center justify-between font-medium animate-in fade-in ${
                        barcodeFeedback.type === 'success'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ScanBarcode className="w-3.5 h-3.5 shrink-0" />
                        <span>{barcodeFeedback.message}</span>
                      </span>
                      <button aria-label="Tutup"
                        type="button"
                        onClick={() => setBarcodeFeedback(null)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Daftar Barang Yang Dibeli dari Supplier ({receivingItems.length.toLocaleString('id-ID')} Baris)</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Subtotal dapat diedit langsung (HPP per pcs akan dihitung otomatis)
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Produk Toko</th>
                          <th className="py-2 px-3 text-center w-28">Jumlah (Qty)</th>
                          <th className="py-2 px-3 text-right w-32">Harga Beli / Pcs</th>
                          <th className="py-2 px-3 text-center w-36">Tgl Kedaluwarsa</th>
                          <th className="py-2 px-3 text-right w-36">Subtotal (Rp)</th>
                          <th className="py-2 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {receivingItems.map((item, idx) => {
                          const itemSubtotal = item.subtotal !== undefined ? item.subtotal : item.quantity * item.costPrice;
                          const calculatedMin = Math.max(1, Math.ceil((item.quantity || 0) * 0.5));
                          return (
                            <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                              <td className="py-2 px-3">
                                <ProductPicker
                                  ariaLabel="Produk diterima"
                                  products={products}
                                  value={item.productId}
                                  onChange={(id) => handleReceivingItemChange(idx, 'productId', id)}
                                  required
                                  describe={(p) => `Stok: ${p.stock}`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input aria-label="Jumlah diterima"
                                  type="number"
                                  min={1}
                                  required
                                  value={item.quantity || ''}
                                  onChange={(e) => handleReceivingItemChange(idx, 'quantity', Number(e.target.value))}
                                  className="w-full p-1.5 text-center font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono block text-center mt-0.5" title="Batas minimal stok baru (50% dari order)">
                                  Min baru: {calculatedMin}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <input aria-label="Harga modal per unit"
                                  type="number"
                                  min={0}
                                  required
                                  value={item.costPrice !== undefined ? (item.costPrice === 0 ? '' : item.costPrice) : ''}
                                  onChange={(e) => handleReceivingItemChange(idx, 'costPrice', e.target.value)}
                                  className="w-full p-1.5 text-right font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input aria-label="Tanggal kedaluwarsa"
                                  type="date"
                                  value={item.expiryDate || ''}
                                  onChange={(e) => handleReceivingItemChange(idx, 'expiryDate', e.target.value)}
                                  className="w-full p-1.5 text-center text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.subtotal !== undefined ? (item.subtotal === 0 ? '' : item.subtotal) : (item.quantity * item.costPrice || '')}
                                    onChange={(e) => handleReceivingItemChange(idx, 'subtotal', e.target.value)}
                                    className="w-full p-1.5 text-right font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-xs"
                                    placeholder="0"
                                    title="Subtotal barang ini (dapat diedit langsung)"
                                  />
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block text-right font-mono mt-0.5">
                                    @ {formatCurrency(item.costPrice, settings.currency)}/pcs
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-center">
                                {receivingItems.length > 1 && (
                                  <button aria-label="Hapus baris"
                                    type="button"
                                    onClick={() => handleRemoveReceivingRow(idx)}
                                    className="text-rose-400 hover:text-rose-600 p-1.5 cursor-pointer transition-colors"
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
                      <span>Pengaturan Potongan Diskon Faktur & Pajak PPN</span>
                    </span>

                    {/* Waktu Pemotongan Diskon: Sebelum vs Sesudah PPN */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Posisi Perhitungan Diskon Faktur:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button aria-pressed={discountTiming === 'before_ppn'}
                          type="button"
                          onClick={() => setDiscountTiming('before_ppn')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                            discountTiming === 'before_ppn'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${discountTiming === 'before_ppn' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span>Sebelum PPN (DPP)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal leading-tight">
                            Diskon mengurangi DPP dulu, baru dihitung PPN {ppnRate}%.
                          </p>
                        </button>

                        <button aria-pressed={discountTiming === 'after_ppn'}
                          type="button"
                          onClick={() => setDiscountTiming('after_ppn')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                            discountTiming === 'after_ppn'
                              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 text-blue-900 dark:text-blue-200 font-bold shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${discountTiming === 'after_ppn' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                            <span>Sesudah PPN (Total)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal leading-tight">
                            PPN dihitung dari subtotal bruto, diskon memotong total akhir faktur.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Diskon Dagang: Tipe & Nilai */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Bentuk Nilai Diskon
                        </label>
                        <select aria-label="Bentuk Nilai Diskon"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'nominal')}
                          className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium cursor-pointer"
                        >
                          <option value="percentage">Persentase (%)</option>
                          <option value="nominal">Angka Rupiah (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          {discountType === 'percentage' ? 'Besaran Diskon (%)' : 'Nilai Diskon (Rp)'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={discountRate || ''}
                            onChange={(e) => setDiscountRate(Math.max(0, Number(e.target.value)))}
                            placeholder={discountType === 'percentage' ? 'Contoh: 5' : 'Contoh: 50000'}
                            className="w-full p-2 pr-8 font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                          <span className="absolute right-2.5 top-2.5 text-xs font-bold text-slate-500">
                            {discountType === 'percentage' ? '%' : 'Rp'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PPN Masukan */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tarif PPN Masukan
                      </label>
                      <select aria-label="Tarif PPN Masukan"
                        value={ppnRate}
                        onChange={(e) => setPpnRate(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer font-medium"
                      >
                        <option value={0}>Non-PPN / 0% (Nota tanpa PPN)</option>
                        <option value={11}>PPN 11% (Standar Nasional UU HPP)</option>
                        <option value={12}>PPN 12% (Kenaikan Tarif)</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Catatan Khusus */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                        Catatan Khusus Pembelian
                      </label>
                      <textarea aria-label="Catatan Khusus Pembelian"
                        rows={5}
                        placeholder="Contoh: Barang diterima kurir Indofood plat B 1234 CD, kemasan utuh bersegel..."
                        value={purchaseNotes}
                        onChange={(e) => setPurchaseNotes(e.target.value)}
                        className="w-full p-2 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Summary Footer Box */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-emerald-200 dark:border-emerald-900 pb-2">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Subtotal Kotor:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(receivingSubtotal, settings.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>Diskon Faktur:</span>
                        <span className="text-[11px] px-1 py-0.2 rounded-md font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {discountTiming === 'before_ppn' ? 'Sblm PPN' : 'Ssdh PPN'}
                        </span>
                      </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(discountAmount, settings.currency)}
                        {discountType === 'percentage' && discountRate > 0 && (
                          <span className="text-[11px] font-normal text-slate-500 ml-1">({discountRate}%)</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Dasar Pengenaan Pajak (DPP):</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(dppAmount, settings.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">PPN ({ppnRate}%):</span>
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
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {receivingItems.reduce((sum, item) => sum + item.quantity, 0)} total pcs barang ({receivingItems.length.toLocaleString('id-ID')} baris barang)
                      </span>
                    </div>
                    <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(finalReceivingTotal, settings.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5 flex-wrap">
                {receivingFormError && (
                  <p role="alert" className="mr-auto text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {receivingFormError}
                  </p>
                )}
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

      {/* Camera Barcode Scanner Modal for Goods Receiving */}
      {isBarcodeCameraOpen && (
        <ReceivingBarcodeCameraModal
          isOpen={isBarcodeCameraOpen}
          onClose={() => setIsBarcodeCameraOpen(false)}
          onScan={(scannedCode) => {
            handleScanBarcode(scannedCode);
          }}
        />
      )}

      {/* Supplier Purchase Return Modal */}
      {isReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in">
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
                    Keluarkan barang rusak/kedaluwarsa dari stok toko dan buat nota retur distributor
                  </p>
                </div>
              </div>
              <button aria-label="Tutup"
                onClick={() => setIsReturnOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
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
                    <select aria-label="Nama Supplier Tujuan"
                      value={returnSupplierName}
                      onChange={(e) => setReturnSupplierName(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      <option value="Supplier Lainnya / Grosir Lokal">Supplier Lainnya / Grosir Lokal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Alasan Retur Supplier
                    </label>
                    <select aria-label="Alasan Retur Supplier"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih alasan --</option>
                      <option value="Barang Rusak / Bad Stock">Barang Rusak / Bad Stock</option>
                      <option value="Kedaluwarsa / Near Expired (FEFO)">Kedaluwarsa / Near Expired (FEFO)</option>
                      <option value="Salah Kirim / Tidak Sesuai PO">Salah Kirim / Tidak Sesuai PO</option>
                      <option value="Kelebihan Qty Kiriman">Kelebihan Qty Kiriman</option>
                      <option value="Kemasan Bocor / Segel Terbuka">Kemasan Bocor / Segel Terbuka</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      No. Faktur Pembelian Asal (Opsional)
                    </label>
                    <input aria-label="No. Faktur Pembelian Asal (Opsional)"
                      type="text"
                      placeholder="Contoh: INV-SUP-9821..."
                      value={returnRefInvoice}
                      onChange={(e) => setReturnRefInvoice(e.target.value)}
                      className="w-full p-2 text-xs font-mono rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Return Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Daftar Barang Yang Diretur ke Supplier</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddReturnRow}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Retur</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
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
                                <ProductPicker
                                  ariaLabel="Produk diretur"
                                  products={products}
                                  value={item.productId}
                                  onChange={(id) => handleReturnItemChange(idx, 'productId', id)}
                                  required
                                  // Retur hanya untuk barang yang masih ada di stok
                                  filter={(p) => p.stock > 0}
                                  describe={(p) => `Sisa stok: ${p.stock}`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input aria-label="Jumlah diretur"
                                  type="number"
                                  min={1}
                                  max={prod ? prod.stock : 999}
                                  required
                                  value={item.quantity || ''}
                                  onChange={(e) => handleReturnItemChange(idx, 'quantity', Number(e.target.value))}
                                  className="w-full p-1.5 text-center font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input aria-label="Harga modal per unit"
                                  type="number"
                                  min={0}
                                  required
                                  value={item.costPrice || ''}
                                  onChange={(e) => handleReturnItemChange(idx, 'costPrice', Number(e.target.value))}
                                  className="w-full p-1.5 text-right font-mono font-bold rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(subtotal, settings.currency)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {returnItems.length > 1 && (
                                  <button aria-label="Hapus baris"
                                    type="button"
                                    onClick={() => handleRemoveReturnRow(idx)}
                                    className="text-rose-400 hover:text-rose-600 p-1.5 cursor-pointer"
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
                  <input aria-label="Catatan Khusus Retur"
                    type="text"
                    placeholder="Contoh: Barang kedaluwarsa dititipkan ke sales kanvas yang berkunjung..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Total Summary Footer Box */}
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-rose-800 dark:text-rose-300 font-semibold block text-xs">
                      Total Nilai Klaim Retur Supplier:
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {returnItems.reduce((sum, item) => sum + item.quantity, 0)} total pcs barang akan dikurangkan dari stok toko
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
                    {formatCurrency(totalReturnAmount, settings.currency)}
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5 flex-wrap">
                {returnFormError && (
                  <p role="alert" className="mr-auto text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {returnFormError}
                  </p>
                )}
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
        onViewPriceHistory={(prod) => {
          setIsProductModalOpen(false);
          handleOpenPriceHistory(prod);
        }}
        onPrintPriceTag={(prod) => {
          setIsProductModalOpen(false);
          setProductForPriceTag(prod);
          setIsPriceTagModalOpen(true);
        }}
        onPrintQRShelfLabel={(prod) => {
          setIsProductModalOpen(false);
          setSelectedProductForQR(prod);
          setIsQRShelfLabelModalOpen(true);
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

      <PriceUpdateFromFileModal isOpen={isPriceUpdateOpen} onClose={() => setIsPriceUpdateOpen(false)} />

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
                expiryDate: i.expiryDate || '',
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

      {/* Dynamic QR Shelf Label Studio Modal */}
      <QRShelfLabelModal
        isOpen={isQRShelfLabelModalOpen}
        onClose={() => {
          setIsQRShelfLabelModalOpen(false);
          setSelectedProductForQR(null);
        }}
        initialSelectedProduct={selectedProductForQR}
        initialSelectedProductIds={selectedProductIds}
      />

      {/* Real-time Shelf Item Live Modal */}
      {liveShelfProductId && (
        <ShelfProductLiveModal
          productId={liveShelfProductId}
          isOpen={Boolean(liveShelfProductId)}
          onClose={() => setLiveShelfProductId(null)}
          onOpenPrintLabel={(prod) => {
            setSelectedProductForQR(prod);
            setIsQRShelfLabelModalOpen(true);
          }}
        />
      )}

      {/* Direct File Import (As-Is / No Auto-Correction) */}
      <DirectFileImportModal
        isOpen={isDirectFileImportOpen}
        onClose={() => setIsDirectFileImportOpen(false)}
      />

      {/* Smart Data Import & Grammar/Gramasi Auto-Corrector */}
      <DataImportModal
        isOpen={isDataImportOpen}
        onClose={() => setIsDataImportOpen(false)}
      />

      {/* Online FMCG & Open Food Facts Database Matcher */}
      <OnlineDatabaseMatcherModal
        isOpen={isOnlineMatcherOpen}
        onClose={() => setIsOnlineMatcherOpen(false)}
      />

      {/* AI Systematic Category Auto-Mapper */}
      <AICategoryMapperModal
        isOpen={isAiCategoryMapperOpen}
        onClose={() => setIsAiCategoryMapperOpen(false)}
      />

      {/* Confirmation Modal: Hapus Semua Data Impor */}
      {isClearImportedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Hapus Seluruh Data Barang Impor?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tindakan ini akan menghapus semua master produk yang ditambahkan dari file Excel / CSV / AI Scanner
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-2 mb-4">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Jumlah Data Impor Dihapus:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">
                    {importedCount.toLocaleString('id-ID')} Barang
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Produk Bawaan Tetap Tersimpan:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    {products.length - importedCount} Barang
                  </strong>
                </div>

                {importedProducts.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Contoh barang impor yang akan dihapus:
                    </p>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {importedProducts.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                          <span className="truncate pr-2">{p.name}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">{p.sku}</span>
                        </div>
                      ))}
                      {importedProducts.length > 5 && (
                        <p className="text-[11px] text-slate-500 italic text-center pt-0.5">
                          ...dan {importedProducts.length - 5} produk impor lainnya
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 mb-6">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                <span>
                  Hanya produk yang masuk lewat impor file yang dihapus; produk yang diinput manual tetap aman. Riwayat transaksi kasir yang sudah tercatat tidak akan hilang.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClearImportedModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearImported}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Semua Data Impor ({importedCount.toLocaleString('id-ID')})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Hapus Terpilih (Batch Delete) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Hapus {selectedProductIds.length} Produk Terpilih?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Produk yang dicentang akan dihapus secara permanen dari master inventaris
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs mb-6">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Daftar Produk yang akan dihapus:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {products
                    .filter((p) => selectedProductIds.includes(p.id))
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        <span className="text-[11px] text-slate-500 shrink-0">{p.sku}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedProductIds.length} Produk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset ke Default 40 Produk */}
      {isResetCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Reset Katalog ke 40 Produk Bawaan?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mengembalikan seluruh master data barang ke 40 item ritel standar toko
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                Tindakan ini akan menghapus semua produk impor maupun custom yang dibuat, dan mengembalikan katalog ke 40 produk sembako, makanan, minuman, dan perlengkapan ritel bawaan.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetCatalogModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetDefault}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset ke 40 Produk Bawaan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock & Expiry Adjustment Modal */}
      <BulkStockAdjustmentModal
        isOpen={isBulkAdjustModalOpen}
        onClose={() => setIsBulkAdjustModalOpen(false)}
        initialSelectedProductIds={bulkAdjustInitialProductIds}
        onSuccess={(count, notes) => {
          setNotificationMsg({
            type: 'success',
            text: `Berhasil memperbarui ${count} produk (stok fisik & tanggal kedaluwarsa) secara massal [${notes}].`,
          });
          setSelectedProductIds([]);
          setTimeout(() => setNotificationMsg(null), 6000);
        }}
      />

      {/* Stock Opname CSV Batch Modal */}
      <StockTakeCSVModal
        isOpen={isStockTakeCSVOpen}
        onClose={() => setIsStockTakeCSVOpen(false)}
        onApplied={(_count, summary) => {
          setNotificationMsg({
            type: 'success',
            text: summary,
          });
          setTimeout(() => setNotificationMsg(null), 6000);
        }}
      />

      {/* Supplier Purchase Invoice Detail & Print Modal */}
      <SupplierPurchaseDetailModal
        isOpen={isPurchaseDetailOpen}
        onClose={() => {
          setIsPurchaseDetailOpen(false);
          setSelectedPurchaseForDetail(null);
        }}
        purchase={selectedPurchaseForDetail}
        settings={settings}
        onPrintPriceTags={(purch) => {
          setProductForPriceTag(null);
          setPurchaseForPriceTag(purch);
          setIsPriceTagModalOpen(true);
        }}
      />

      {/* Product Price & Cost History Modal */}
      <ProductPriceHistoryModal
        isOpen={isPriceHistoryModalOpen}
        onClose={() => setIsPriceHistoryModalOpen(false)}
        products={products}
        selectedProductId={priceHistoryProductId}
        settings={settings}
        onUpdateProductPrice={(productId, newCost, newPrice, record) => {
          recordProductPriceChange(productId, newCost, newPrice, record);
          setNotificationMsg({
            type: 'success',
            text: 'Penyesuaian harga produk berhasil dicatat ke dalam riwayat harga.',
          });
          setTimeout(() => setNotificationMsg(null), 5000);
        }}
      />
    </div>
  );
};
