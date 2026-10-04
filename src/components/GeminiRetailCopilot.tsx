import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingBag,
  Tag,
  MessageSquare,
  RefreshCw,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Send,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  CheckSquare,
  Square,
  Copy,
  Printer,
  Truck,
  Building2,
  DollarSign,
  Boxes,
  BarChart3,
  Calendar,
  CalendarDays,
  Ban,
  Scissors,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { AIForecastItem, AIDailyInsights, AIPromoResult, AIPurchaseOrderPlan } from '../types';
import { RestockSalesTrendChart } from './RestockSalesTrendChart';

export const GeminiRetailCopilot: React.FC = () => {
  const {
    isGeminiCopilotOpen,
    setIsGeminiCopilotOpen,
    activeCopilotTab,
    setActiveCopilotTab,
    cart,
    products,
    transactions,
    salesReturns,
    purchaseReturns,
    customers,
    suppliers,
    settings,
    addToCart,
    addVoucher,
    aiUpsellSuggestions,
    isFetchingUpsell,
    fetchUpsellSuggestions,
    restockPlanTriggerCounter,
    setPendingReceivingFromPO,
  } = usePOS();

  // Forecast state (Restock Plan & Purchase Order)
  const [forecastData, setForecastData] = useState<AIPurchaseOrderPlan | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [selectedPOProductIds, setSelectedPOProductIds] = useState<string[]>([]);
  const [customPOQuantities, setCustomPOQuantities] = useState<Record<string, number>>({});
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copiedSupplierFeedback, setCopiedSupplierFeedback] = useState<string | null>(null);
  const [appliedToReceivingFeedback, setAppliedToReceivingFeedback] = useState(false);

  // Target Restock Date & Business Policy State (Deadstock & Returns)
  const [targetRestockDate, setTargetRestockDate] = useState<string>('');
  const [deadstockPolicy, setDeadstockPolicy] = useState<'eliminate' | 'reduce' | 'none'>('eliminate');
  const [returnPolicy, setReturnPolicy] = useState<'reduce' | 'eliminate' | 'none'>('reduce');
  const [activeChartModalItem, setActiveChartModalItem] = useState<AIForecastItem | null>(null);
  const [expandedChartKeys, setExpandedChartKeys] = useState<string[]>([]);
  const [filterRestockCategory, setFilterRestockCategory] = useState<'all' | 'need_restock' | 'deadstock' | 'returns' | 'eliminated'>('all');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [restockViewMode, setRestockViewMode] = useState<'grouped_supplier' | 'list'>('grouped_supplier');
  const [isAllChartsExpanded, setIsAllChartsExpanded] = useState(false);

  // Insights state
  const [insightsData, setInsightsData] = useState<AIDailyInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Promo Generator state
  const [promoTheme, setPromoTheme] = useState('Promo JSM Super Hemat');
  const [promoCategory, setPromoCategory] = useState('Semua Kategori');
  const [minOwnerMargin, setMinOwnerMargin] = useState<number>(5);
  const [generatedPromo, setGeneratedPromo] = useState<AIPromoResult | null>(null);
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [promoAppliedSuccess, setPromoAppliedSuccess] = useState(false);

  // Live calculation of product margin for the selected promo category to enforce owner profit margin
  const targetCategoryStats = useMemo(() => {
    const targetProds = promoCategory && promoCategory !== 'Semua Kategori'
      ? products.filter((p) => {
          const catId = (p.categoryId || '').toLowerCase();
          const target = promoCategory.toLowerCase();
          return catId.includes(target) || target.includes(catId) || (p.name && p.name.toLowerCase().includes(target));
        })
      : products;

    const prods = targetProds.length > 0 ? targetProds : products;
    const marginItems = prods
      .filter((p) => p.price > 0 && p.costPrice > 0)
      .map((p) => ((p.price - p.costPrice) / p.price) * 100);

    const avgMargin = marginItems.length > 0
      ? marginItems.reduce((a, b) => a + b, 0) / marginItems.length
      : 22;

    const safeMinMargin = Math.max(5, minOwnerMargin);
    const maxAllowedDiscount = Math.max(1, Math.floor(avgMargin - safeMinMargin));

    return {
      productCount: prods.length,
      avgMargin: Math.round(avgMargin * 10) / 10,
      maxAllowedDiscount,
      safeMinMargin,
    };
  }, [products, promoCategory, minOwnerMargin]);

  // Chat Assistant state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { sender: 'user' | 'ai'; text: string; time: string; actions?: string[] }[]
  >([
    {
      sender: 'ai',
      text: 'Halo! Saya **Gemini Retail Copilot**, asisten pintar toko ritel modern Anda. Ada yang bisa saya bantu terkait inventaris stok, rekomendasi kasir, atau strategi penjualan hari ini?',
      time: 'Baru saja',
      actions: [
        'Produk apa yang stoknya menipis?',
        'Bagaimana tren penjualan hari ini?',
        'Buat promo akhir pekan untuk sembako',
      ],
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const prevTriggerRef = useRef(restockPlanTriggerCounter);

  // Fetch forecast data (Restock Plan & Purchase Order)
  const handleFetchForecast = async (
    overrideTargetDate?: string,
    overrideDeadstockRule?: 'eliminate' | 'reduce' | 'none',
    overrideReturnRule?: 'reduce' | 'eliminate' | 'none'
  ) => {
    setIsLoadingForecast(true);
    try {
      const dateToUse = overrideTargetDate !== undefined ? overrideTargetDate : targetRestockDate;
      const deadstockToUse = overrideDeadstockRule !== undefined ? overrideDeadstockRule : deadstockPolicy;
      const returnToUse = overrideReturnRule !== undefined ? overrideReturnRule : returnPolicy;

      const res = await fetch('/api/ai/inventory-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          recentTransactions: transactions,
          salesReturns,
          purchaseReturns,
          suppliers,
          storeSettings: settings,
          targetDate: dateToUse,
          deadstockRule: deadstockToUse,
          returnRule: returnToUse,
        }),
      });
      if (res.ok) {
        const data: AIPurchaseOrderPlan = await res.json();
        setForecastData(data);
        if (data && Array.isArray(data.forecasts)) {
          const initialQtys: Record<string, number> = {};
          const selectedKeys: string[] = [];
          data.forecasts.forEach((f) => {
            const key = f.productId || f.productName;
            const qty = Number(f.recommendedOrderQty) || 0;
            initialQtys[key] = qty;
            if (qty > 0) {
              selectedKeys.push(key);
            }
          });
          setSelectedPOProductIds(selectedKeys);
          setCustomPOQuantities(initialQtys);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  // Toggle selection for a single item in the Restock Plan
  const handleToggleSelectPOItem = (idOrName: string) => {
    setSelectedPOProductIds((prev) =>
      prev.includes(idOrName) ? prev.filter((id) => id !== idOrName) : [...prev, idOrName]
    );
  };

  // Toggle select all items in the Restock Plan
  const handleToggleSelectAllPO = () => {
    if (!forecastData?.forecasts) return;
    const allKeys = forecastData.forecasts.map((f) => f.productId || f.productName);
    if (selectedPOProductIds.length === allKeys.length) {
      setSelectedPOProductIds([]);
    } else {
      setSelectedPOProductIds(allKeys);
    }
  };

  // Adjust order quantity for a specific item (allows 0 for elimination)
  const handleUpdatePOQuantity = (idOrName: string, delta: number) => {
    setCustomPOQuantities((prev) => {
      const current = prev[idOrName] !== undefined ? prev[idOrName] : 12;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        setSelectedPOProductIds((sel) => sel.filter((id) => id !== idOrName));
      } else if (!selectedPOProductIds.includes(idOrName)) {
        setSelectedPOProductIds((sel) => [...sel, idOrName]);
      }
      return { ...prev, [idOrName]: updated };
    });
  };

  const handleSetPOQuantityDirect = (idOrName: string, value: number) => {
    const updated = Math.max(0, value || 0);
    setCustomPOQuantities((prev) => ({
      ...prev,
      [idOrName]: updated,
    }));
    if (updated === 0) {
      setSelectedPOProductIds((sel) => sel.filter((id) => id !== idOrName));
    } else if (!selectedPOProductIds.includes(idOrName)) {
      setSelectedPOProductIds((sel) => [...sel, idOrName]);
    }
  };

  // Single item quick actions: Eliminate (0), Reduce (-50%), Restore
  const handleEliminateSingleItem = (itemKey: string) => {
    setCustomPOQuantities((prev) => ({ ...prev, [itemKey]: 0 }));
    setSelectedPOProductIds((prev) => prev.filter((id) => id !== itemKey));
  };

  const handleReduceSingleItem = (itemKey: string, rawQty?: number) => {
    const base = rawQty || 12;
    const reduced = Math.max(1, Math.floor(base * 0.5));
    setCustomPOQuantities((prev) => ({ ...prev, [itemKey]: reduced }));
    setSelectedPOProductIds((prev) => (prev.includes(itemKey) ? prev : [...prev, itemKey]));
  };

  const handleRestoreSingleItem = (itemKey: string, rawQty?: number) => {
    const restored = rawQty || 12;
    setCustomPOQuantities((prev) => ({ ...prev, [itemKey]: restored }));
    setSelectedPOProductIds((prev) => (prev.includes(itemKey) ? prev : [...prev, itemKey]));
  };

  // Apply policy across all active forecast items
  const handleApplyPoliciesLocally = (
    newDeadstock: 'eliminate' | 'reduce' | 'none',
    newReturn: 'reduce' | 'eliminate' | 'none'
  ) => {
    setDeadstockPolicy(newDeadstock);
    setReturnPolicy(newReturn);
    if (!forecastData?.forecasts) return;

    const updatedQtys = { ...customPOQuantities };
    const updatedSelected = new Set(selectedPOProductIds);

    forecastData.forecasts.forEach((fc) => {
      const key = fc.productId || fc.productName;
      const original = fc.originalOrderQty || fc.recommendedOrderQty || 12;
      const isDeadstock = fc.isDeadstock;
      const hasRetur = (fc.returnCount || 0) > 0;

      if (isDeadstock) {
        if (newDeadstock === 'eliminate') {
          updatedQtys[key] = 0;
          updatedSelected.delete(key);
        } else if (newDeadstock === 'reduce') {
          updatedQtys[key] = Math.max(1, Math.floor(original * 0.5));
          updatedSelected.add(key);
        } else {
          updatedQtys[key] = original;
          updatedSelected.add(key);
        }
      } else if (hasRetur) {
        if (newReturn === 'eliminate') {
          updatedQtys[key] = 0;
          updatedSelected.delete(key);
        } else if (newReturn === 'reduce') {
          updatedQtys[key] = Math.max(1, Math.floor(original * 0.5));
          updatedSelected.add(key);
        } else {
          updatedQtys[key] = original;
          updatedSelected.add(key);
        }
      }
    });

    setCustomPOQuantities(updatedQtys);
    setSelectedPOProductIds(Array.from(updatedSelected));
  };

  // Toggle accordion chart per item
  const handleToggleExpandChart = (key: string) => {
    setExpandedChartKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleExpandAllCharts = () => {
    if (isAllChartsExpanded) {
      setExpandedChartKeys([]);
      setIsAllChartsExpanded(false);
    } else {
      if (forecastData?.forecasts) {
        setExpandedChartKeys(forecastData.forecasts.map((f) => f.productId || f.productName));
      }
      setIsAllChartsExpanded(true);
    }
  };

  // Target date preset calculations
  const datePresets = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    const nextSat = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    nextSat.setDate(today.getDate() + daysUntilSaturday);

    const p7 = new Date(today);
    p7.setDate(today.getDate() + 7);

    const p14 = new Date(today);
    p14.setDate(today.getDate() + 14);

    const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return [
      { label: 'Hari Ini', date: formatDate(today) },
      { label: 'Akhir Pekan (Sabtu)', date: formatDate(nextSat) },
      { label: '+7 Hari (1 Pekan)', date: formatDate(p7) },
      { label: '+14 Hari (2 Pekan)', date: formatDate(p14) },
      { label: 'Akhir Bulan', date: formatDate(endMonth) },
    ];
  }, []);

  // Registered Supplier Options based on AI Forecasts and Registered Suppliers
  const registeredSupplierOptions = useMemo(() => {
    if (!forecastData?.forecasts) return [];
    const map = new Map<string, { name: string; count: number; supplierId?: string }>();
    forecastData.forecasts.forEach((f) => {
      const supName = f.suggestedSupplier || 'Distributor Lainnya';
      if (!map.has(supName)) {
        map.set(supName, { name: supName, count: 0, supplierId: f.supplierId });
      }
      map.get(supName)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [forecastData]);

  // Filtered forecast items based on category tabs AND selected supplier
  const filteredForecasts = useMemo(() => {
    if (!forecastData?.forecasts) return [];
    return forecastData.forecasts.filter((fc) => {
      const key = fc.productId || fc.productName;
      const qty = customPOQuantities[key] !== undefined ? customPOQuantities[key] : (fc.recommendedOrderQty || 0);
      const isDeadstock = fc.isDeadstock;
      const hasRetur = (fc.returnCount || 0) > 0;
      const isEliminated = qty === 0;

      if (filterRestockCategory === 'need_restock' && (qty === 0 || isDeadstock)) return false;
      if (filterRestockCategory === 'deadstock' && !isDeadstock) return false;
      if (filterRestockCategory === 'returns' && !hasRetur) return false;
      if (filterRestockCategory === 'eliminated' && !isEliminated) return false;

      if (selectedSupplierFilter !== 'all') {
        const supName = fc.suggestedSupplier || 'Distributor Lainnya';
        if (supName !== selectedSupplierFilter && fc.supplierId !== selectedSupplierFilter) {
          return false;
        }
      }

      return true;
    });
  }, [forecastData, customPOQuantities, filterRestockCategory, selectedSupplierFilter]);

  // Group restock recommendations by registered supplier
  const supplierGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        supplierName: string;
        supplierId?: string;
        paymentTerms?: string;
        supplierObj?: any;
        items: AIForecastItem[];
        totalBudget: number;
        totalSelectedBudget: number;
        totalUnits: number;
        selectedCount: number;
      }
    >();

    filteredForecasts.forEach((item) => {
      const supName = item.suggestedSupplier || 'Distributor Lainnya';
      if (!map.has(supName)) {
        const found = suppliers.find(
          (s) => s.id === item.supplierId || s.name.toLowerCase() === supName.toLowerCase()
        );
        map.set(supName, {
          supplierName: supName,
          supplierId: item.supplierId || found?.id,
          paymentTerms: item.supplierTerms || found?.paymentTerms || 'Tunai',
          supplierObj: found,
          items: [],
          totalBudget: 0,
          totalSelectedBudget: 0,
          totalUnits: 0,
          selectedCount: 0,
        });
      }
      const group = map.get(supName)!;
      group.items.push(item);

      const itemKey = item.productId || item.productName;
      const isSelected = selectedPOProductIds.includes(itemKey);
      const qty =
        customPOQuantities[itemKey] !== undefined ? customPOQuantities[itemKey] : (item.recommendedOrderQty || 0);
      const cost = Number(item.costPrice) || 0;
      const subtotal = qty * cost;

      group.totalUnits += qty;
      group.totalBudget += subtotal;
      if (isSelected) {
        group.selectedCount += 1;
        group.totalSelectedBudget += subtotal;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalBudget - a.totalBudget);
  }, [filteredForecasts, suppliers, customPOQuantities, selectedPOProductIds]);

  const filterCounts = useMemo(() => {
    if (!forecastData?.forecasts) return { all: 0, need: 0, deadstock: 0, returns: 0, eliminated: 0 };
    let deadstockCount = 0;
    let returnsCount = 0;
    let eliminatedCount = 0;
    let needCount = 0;

    forecastData.forecasts.forEach((fc) => {
      const key = fc.productId || fc.productName;
      const qty = customPOQuantities[key] !== undefined ? customPOQuantities[key] : (fc.recommendedOrderQty || 0);
      if (fc.isDeadstock) deadstockCount++;
      if ((fc.returnCount || 0) > 0) returnsCount++;
      if (qty === 0) eliminatedCount++;
      else if (!fc.isDeadstock) needCount++;
    });

    return {
      all: forecastData.forecasts.length,
      need: needCount,
      deadstock: deadstockCount,
      returns: returnsCount,
      eliminated: eliminatedCount,
    };
  }, [forecastData, customPOQuantities]);

  // Select / Deselect all products belonging to a specific supplier
  const handleToggleSelectSupplierPO = (supplierName: string) => {
    const group = supplierGroups.find((g) => g.supplierName === supplierName);
    if (!group) return;
    const groupKeys = group.items.map((i) => i.productId || i.productName);
    const allSelected = groupKeys.every((k) => selectedPOProductIds.includes(k));

    if (allSelected) {
      setSelectedPOProductIds((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedPOProductIds((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // Apply selected items directly to Goods Receiving (Terima Barang)
  const handleApplyPOToReceiving = () => {
    if (!forecastData?.forecasts) return;
    const selectedItems = forecastData.forecasts.filter((item) =>
      selectedPOProductIds.includes(item.productId || item.productName)
    );
    if (selectedItems.length === 0) return;

    const receivingList = selectedItems
      .map((item) => {
        const key = item.productId || item.productName;
        const matchedProd = products.find((p) => p.id === item.productId || p.name === item.productName);
        const qty = customPOQuantities[key] !== undefined ? customPOQuantities[key] : item.recommendedOrderQty;
        return {
          productId: matchedProd?.id || item.productId || '',
          quantity: Math.max(1, qty),
          costPrice: item.costPrice || matchedProd?.costPrice || 0,
          expiryDate: matchedProd?.expiryDate,
        };
      })
      .filter((i) => i.productId);

    setPendingReceivingFromPO(receivingList);
    setAppliedToReceivingFeedback(true);
    setTimeout(() => {
      setAppliedToReceivingFeedback(false);
      setIsGeminiCopilotOpen(false);
    }, 800);
  };

  // Copy PO order summary as WhatsApp / Email friendly plain text (universal or per-supplier)
  const handleCopyPOText = (targetSupplierName?: string) => {
    if (!forecastData?.forecasts) return;
    const pool = targetSupplierName
      ? forecastData.forecasts.filter((i) => (i.suggestedSupplier || 'Distributor Lainnya') === targetSupplierName)
      : forecastData.forecasts;
    const selectedItems = pool.filter((item) =>
      selectedPOProductIds.includes(item.productId || item.productName)
    );
    const itemsToExport = selectedItems.length > 0 ? selectedItems : targetSupplierName ? pool : [];
    if (itemsToExport.length === 0) return;

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const poNumber = `PO-AI-${Date.now().toString().slice(-6)}`;
    const foundSup = targetSupplierName ? suppliers.find((s) => s.name === targetSupplierName) : null;

    let totalQty = 0;
    let totalBudget = 0;

    let text = targetSupplierName
      ? `*PURCHASE ORDER (PO) RESTOCK KE DISTRIBUTOR*\n`
      : `*RENCANA PURCHASE ORDER (PO) RESTOCK TOKO*\n`;
    text += `Nomor PO: ${poNumber}\n`;
    text += `Tanggal: ${dateStr}\n`;
    text += `Pemesan: ${settings.storeName}\n`;
    if (targetSupplierName) {
      text += `Distributor: *${targetSupplierName}*\n`;
      if (foundSup?.contactPerson) text += `Kontak: ${foundSup.contactPerson} (${foundSup.phone || '-'})\n`;
      if (foundSup?.paymentTerms) text += `Syarat Pembayaran: *${foundSup.paymentTerms}*\n`;
    }
    text += `------------------------------------\n`;
    text += `*DAFTAR BARANG YANG DIPESAN:*\n`;

    itemsToExport.forEach((item, idx) => {
      const key = item.productId || item.productName;
      const qty = customPOQuantities[key] !== undefined ? customPOQuantities[key] : item.recommendedOrderQty;
      const cost = item.costPrice || 0;
      const subtotal = qty * cost;
      totalQty += qty;
      totalBudget += subtotal;

      text += `${idx + 1}. *${item.productName}*\n`;
      text += `   - Jumlah Pesanan: ${qty} ${item.unit || 'pcs'}\n`;
      if (!targetSupplierName && item.suggestedSupplier) {
        text += `   - Distributor: ${item.suggestedSupplier}\n`;
      }
      text += `   - Estimasi Biaya: ${formatCurrency(subtotal, settings.currency)}\n`;
    });

    text += `------------------------------------\n`;
    text += `*Total Varian (SKU):* ${itemsToExport.length} produk\n`;
    text += `*Total Kuantitas:* ${totalQty} unit\n`;
    text += `*Estimasi Anggaran Total:* ${formatCurrency(totalBudget, settings.currency)}\n`;
    text += `\n_Digenerate secara otomatis oleh Gemini AI Retail Copilot_`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (targetSupplierName) {
        setCopiedSupplierFeedback(targetSupplierName);
        setTimeout(() => setCopiedSupplierFeedback(null), 2500);
      } else {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2500);
      }
    }
  };

  // Print or Download PO Slip (universal or per-supplier)
  const handlePrintPO = (targetSupplierName?: string) => {
    if (!forecastData?.forecasts) return;
    const pool = targetSupplierName
      ? forecastData.forecasts.filter((i) => (i.suggestedSupplier || 'Distributor Lainnya') === targetSupplierName)
      : forecastData.forecasts;
    const selectedItems = pool.filter((item) =>
      selectedPOProductIds.includes(item.productId || item.productName)
    );
    const itemsToExport = selectedItems.length > 0 ? selectedItems : targetSupplierName ? pool : [];
    if (itemsToExport.length === 0) return;

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const poNumber = `PO-AI-${Date.now().toString().slice(-6)}`;
    const foundSup = targetSupplierName ? suppliers.find((s) => s.name === targetSupplierName) : null;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let totalQty = 0;
    let totalBudget = 0;

    const rowsHtml = itemsToExport
      .map((item, idx) => {
        const key = item.productId || item.productName;
        const qty = customPOQuantities[key] !== undefined ? customPOQuantities[key] : item.recommendedOrderQty;
        const cost = item.costPrice || 0;
        const subtotal = qty * cost;
        totalQty += qty;
        totalBudget += subtotal;

        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px;">
            <strong>${item.productName}</strong><br/>
            <small style="color: #64748b;">SKU: ${item.sku || '-'} | Barcode: ${item.barcode || '-'}</small>
          </td>
          ${!targetSupplierName ? `<td style="padding: 8px;">${item.suggestedSupplier || '-'}</td>` : ''}
          <td style="padding: 8px; text-align: center;">${item.currentStock}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #059669;">+${qty} ${item.unit || 'pcs'}</td>
          <td style="padding: 8px; text-align: right;">${formatCurrency(cost, settings.currency)}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(subtotal, settings.currency)}</td>
        </tr>
      `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order Restock Plan - ${poNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 4px 0; font-size: 20px; }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; }
            .total-box { margin-top: 20px; float: right; width: 340px; background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 13px; border: 1px solid #e2e8f0; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .grand-total { font-size: 15px; font-weight: bold; border-top: 2px solid #cbd5e1; padding-top: 6px; color: #059669; }
            .supplier-card { background: #f1f5f9; border-radius: 6px; padding: 10px 14px; margin-top: 12px; font-size: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px;">
            <div>
              <h1>${settings.storeName}</h1>
              <div class="meta">${settings.address || 'Smart Retail Point of Sale'} | Telp: ${settings.phone || '-'}</div>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background: #dcfce7; color: #166534; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 11px;">PURCHASE ORDER (PO) RESMI</span>
              <div style="font-weight: bold; margin-top: 4px; font-size: 14px;">${poNumber}</div>
              <div style="font-size: 11px; color: #64748b;">Tanggal: ${dateStr}</div>
            </div>
          </div>

          ${
            targetSupplierName
              ? `
          <div class="supplier-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Distributor / Supplier:</strong> <span style="font-size: 14px; font-weight: bold;">${targetSupplierName}</span><br/>
                <span style="color: #64748b;">PIC: ${foundSup?.contactPerson || '-'} | Telp: ${foundSup?.phone || '-'}</span>
              </div>
              <div style="text-align: right;">
                <span style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">Syarat Pembayaran: ${foundSup?.paymentTerms || 'Tunai'}</span>
              </div>
            </div>
          </div>`
              : ''
          }

          <div style="margin-top: 16px; background: #f8fafc; border-left: 4px solid #10b981; padding: 10px 14px; font-size: 12px; border-radius: 4px;">
            <strong>Ringkasan Analisis AI:</strong> ${forecastData?.summary || 'Rencana pemesanan restock barang menipis dan fast moving ritel.'}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>Produk</th>
                ${!targetSupplierName ? `<th>Distributor / Supplier</th>` : ''}
                <th style="text-align: center;">Stok Saat Ini</th>
                <th style="text-align: center;">Kuantitas PO</th>
                <th style="text-align: right;">Harga Beli</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span>Total SKU Dipesan:</span>
              <strong>${itemsToExport.length} produk</strong>
            </div>
            <div class="total-row">
              <span>Total Kuantitas:</span>
              <strong>${totalQty} unit</strong>
            </div>
            <div class="total-row grand-total">
              <span>Estimasi Anggaran PO:</span>
              <span>${formatCurrency(totalBudget, settings.currency)}</span>
            </div>
          </div>

          <div style="clear: both; margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center;">
            Dokumen ini di-generate secara otomatis melalui Gemini Retail Copilot AI. Silakan konfirmasi ketersediaan dan harga distributor sebelum pengiriman barang.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Fetch daily sales insights
  const handleFetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch('/api/ai/daily-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          products,
          settings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsightsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Generate Promo with Owner Minimum Profit Margin Protection (≥ 5%)
  const handleGeneratePromo = async () => {
    setIsGeneratingPromo(true);
    setPromoAppliedSuccess(false);
    try {
      const res = await fetch('/api/ai/generate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignTheme: promoTheme,
          targetCategory: promoCategory,
          products,
          settings,
          minOwnerMargin: Math.max(5, minOwnerMargin),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPromo(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPromo(false);
    }
  };

  // Apply generated promo as active store voucher
  const handleApplyPromoVoucher = () => {
    if (!generatedPromo) return;
    addVoucher({
      code: generatedPromo.voucherCode,
      discountType: generatedPromo.discountType,
      value: generatedPromo.value,
      minSpend: generatedPromo.minSpend,
      description: generatedPromo.description,
      minProfitMargin: generatedPromo.minProfitMargin || minOwnerMargin,
      projectedMarginPercent: generatedPromo.projectedMarginPercent,
    });
    setPromoAppliedSuccess(true);
    setTimeout(() => setPromoAppliedSuccess(false), 3000);
  };

  // Send Chat message
  const handleSendChatMessage = async (customQuery?: string) => {
    const query = customQuery || chatInput.trim();
    if (!query) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/ai/smart-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          products,
          transactions,
          customers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: data.answer || 'Maaf, tidak dapat memproses jawaban saat ini.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: data.suggestedActions,
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Terjadi kendala koneksi server. Pastikan aplikasi berjalan dengan baik.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Trigger data fetch on tab change or when restockPlanTriggerCounter increments
  useEffect(() => {
    if (isGeminiCopilotOpen) {
      if (restockPlanTriggerCounter !== prevTriggerRef.current) {
        prevTriggerRef.current = restockPlanTriggerCounter;
        handleFetchForecast();
      } else if (activeCopilotTab === 'forecast' && !forecastData) {
        handleFetchForecast();
      } else if (activeCopilotTab === 'insights' && !insightsData) {
        handleFetchInsights();
      }
    }
  }, [isGeminiCopilotOpen, activeCopilotTab, restockPlanTriggerCounter]);

  if (!isGeminiCopilotOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="gemini-retail-copilot-drawer"
        className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30">
              <Sparkles className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">Gemini Retail Copilot</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  AI v3.7
                </span>
              </div>
              <p className="text-xs text-slate-300">Asisten Kecerdasan Buatan Ritel Modern & Kasir</p>
            </div>
          </div>

          <button
            onClick={() => setIsGeminiCopilotOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCopilotTab('upsell')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'upsell'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Kasir Upsell</span>
            {cart.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveCopilotTab('forecast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'forecast'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Rencana Restock (PO)</span>
          </button>

          <button
            onClick={() => setActiveCopilotTab('insights')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'insights'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analisis Z-Report</span>
          </button>

          <button
            onClick={() => setActiveCopilotTab('promo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'promo'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Generator Promo</span>
          </button>

          <button
            onClick={() => setActiveCopilotTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeCopilotTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya Gemini</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          {/* TAB 1: KASIR UPSELL */}
          {activeCopilotTab === 'upsell' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Rekomendasi Bundling & Cross-Sell Kasir
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saran otomatis berbasis isi keranjang pembeli untuk menaikkan nilai belanja (Basket Size).
                  </p>
                </div>

                <button
                  onClick={fetchUpsellSuggestions}
                  disabled={isFetchingUpsell}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingUpsell ? 'animate-spin' : ''}`} />
                  <span>Refresh AI</span>
                </button>
              </div>

              {/* Cart status */}
              {cart.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">Keranjang Masih Kosong</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tambahkan produk dari katalog kasir untuk memicu rekomendasi cerdas Gemini AI secara otomatis.
                  </p>
                </div>
              ) : isFetchingUpsell ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                  <p className="font-medium text-xs text-slate-600 dark:text-slate-300">
                    Gemini AI sedang menganalisis kombinasi belanja ritel...
                  </p>
                </div>
              ) : aiUpsellSuggestions.length > 0 ? (
                <div className="space-y-2.5">
                  {aiUpsellSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/60 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {sug.urgency}
                            </span>
                            {sug.discountOffer && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                {sug.discountOffer}
                              </span>
                            )}
                          </div>

                          <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate mt-1">
                            {sug.product.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                            {sug.reason}
                          </p>

                          <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(sug.product.price, settings.currency)}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              • Stok: {sug.product.stock} {sug.product.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(sug.product)}
                        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Tidak ada rekomendasi tambahan saat ini.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RENCANA RESTOCK (PURCHASE ORDER PLAN) */}
          {activeCopilotTab === 'forecast' && (
            <div className="space-y-4">
              {/* Header Title & Refresh */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" />
                    Rencana Restock & Purchase Order (PO)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistem cerdas AI yang memperhitungkan tanggal target restock, analisis grafik penjualan, serta eliminasi/pemangkasan kuota barang retur & deadstock.
                  </p>
                </div>

                <button
                  onClick={() => handleFetchForecast()}
                  disabled={isLoadingForecast}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
                  title="Analisis ulang tingkat stok dan transaksi toko"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForecast ? 'animate-spin' : ''}`} />
                  <span>Hitung Ulang</span>
                </button>
              </div>

              {/* TARGET DATE & HORIZON CONTROLLER CARD */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Sesuaikan Target Tanggal Restock
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Proyeksikan kebutuhan stok hingga tanggal tertentu berdasarkan tren ritel
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={targetRestockDate}
                      onChange={(e) => setTargetRestockDate(e.target.value)}
                      className="text-xs font-medium px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchForecast(targetRestockDate)}
                      disabled={isLoadingForecast}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>

                {/* Date presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Preset:</span>
                  {datePresets.map((preset, idx) => {
                    const isSelected = targetRestockDate === preset.date;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTargetRestockDate(preset.date);
                          handleFetchForecast(preset.date);
                        }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  {targetRestockDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetRestockDate('');
                        handleFetchForecast('');
                      }}
                      className="text-[10px] font-medium text-rose-500 hover:underline ml-1"
                    >
                      Reset (Default 14 Hari)
                    </button>
                  )}
                </div>
              </div>

              {/* DEADSTOCK & RETURN POLICY CONTROL PANEL */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Aturan Kebijakan Retur & Deadstock
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                      {filterCounts.deadstock} Deadstock
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                      {filterCounts.returns} Riwayat Retur
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {filterCounts.eliminated} Dieliminasi (0)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Deadstock Rule Policy */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        Jika Produk Deadstock (0 Terjual):
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyPoliciesLocally('eliminate', returnPolicy)}
                        className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                          deadstockPolicy === 'eliminate'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Eliminasi kuota order menjadi 0 untuk mencegah modal tertahan"
                      >
                        🚫 Eliminasi (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPoliciesLocally('reduce', returnPolicy)}
                        className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                          deadstockPolicy === 'reduce'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Pangkas kuota order 50%"
                      >
                        ✂️ Pangkas 50%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPoliciesLocally('none', returnPolicy)}
                        className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                          deadstockPolicy === 'none'
                            ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Tanpa pembatasan otomatis"
                      >
                        Bebas Normal
                      </button>
                    </div>
                  </div>

                  {/* Return Rule Policy */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                        Jika Ada Riwayat Retur Konsumen:
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyPoliciesLocally(deadstockPolicy, 'reduce')}
                        className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                          returnPolicy === 'reduce'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Pangkas kuota 50% untuk mitigasi produk rusak/cacat"
                      >
                        ✂️ Pangkas 50%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPoliciesLocally(deadstockPolicy, 'eliminate')}
                        className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                          returnPolicy === 'eliminate'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Eliminasi kuota order menjadi 0 hingga vendor dievaluasi"
                      >
                        🚫 Eliminasi (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPoliciesLocally(deadstockPolicy, 'none')}
                        className={`text-[10px] font-bold py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                          returnPolicy === 'none'
                            ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Tanpa pembatasan otomatis"
                      >
                        Bebas Normal
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isLoadingForecast ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="relative w-12 h-12 mx-auto">
                    <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      Menganalisis Perilaku Grafik Penjualan & Aturan Restock...
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      AI sedang mengevaluasi riwayat 14 hari transaksi, mendeteksi produk retur dan deadstock, serta menyesuaikan kuota pemesanan ekonomis ke distributor.
                    </p>
                  </div>
                </div>
              ) : forecastData ? (
                <div className="space-y-3.5">
                  {/* Executive Summary & Health Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/80 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Status Kesehatan Inventaris Toko
                      </span>
                      {forecastData.healthScore !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Score</span>
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              forecastData.healthScore >= 80
                                ? 'bg-emerald-500 text-slate-950'
                                : forecastData.healthScore >= 60
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            {forecastData.healthScore}/100
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed font-medium">
                      {forecastData.summary}
                    </p>

                    {/* KPI Quick Metrics */}
                    {forecastData.forecasts && forecastData.forecasts.length > 0 && (() => {
                      const selItems = forecastData.forecasts.filter((fc) =>
                        selectedPOProductIds.includes(fc.productId || fc.productName)
                      );
                      const selQty = selItems.reduce((acc, fc) => {
                        const key = fc.productId || fc.productName;
                        return acc + (customPOQuantities[key] !== undefined ? customPOQuantities[key] : (fc.recommendedOrderQty || 0));
                      }, 0);
                      const selCost = selItems.reduce((acc, fc) => {
                        const key = fc.productId || fc.productName;
                        const q = customPOQuantities[key] !== undefined ? customPOQuantities[key] : (fc.recommendedOrderQty || 0);
                        return acc + q * (fc.costPrice || 0);
                      }, 0);

                      return (
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                          <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-2 text-center">
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                              Produk Dipilih
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {selItems.length} <span className="text-[10px] font-normal text-slate-400">/ {forecastData.forecasts.length} SKU</span>
                            </span>
                          </div>

                          <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-2 text-center">
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                              Total Kuantitas
                            </span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {selQty} <span className="text-[10px] font-normal text-slate-400">Unit</span>
                            </span>
                          </div>

                          <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-2 text-center">
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                              Estimasi Anggaran
                            </span>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 truncate block">
                              {formatCurrency(selCost, settings.currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Restock Recommendations List */}
                  <div className="space-y-3">
                    {/* Category Filter Pills and View Mode */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setFilterRestockCategory('all')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            filterRestockCategory === 'all'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Semua ({filterCounts.all})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterRestockCategory('need_restock')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            filterRestockCategory === 'need_restock'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Butuh Restock ({filterCounts.need})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterRestockCategory('deadstock')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            filterRestockCategory === 'deadstock'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Deadstock ({filterCounts.deadstock})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterRestockCategory('returns')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            filterRestockCategory === 'returns'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Riwayat Retur ({filterCounts.returns})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterRestockCategory('eliminated')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            filterRestockCategory === 'eliminated'
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Dieliminasi ({filterCounts.eliminated})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleExpandAllCharts}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>{isAllChartsExpanded ? 'Tutup Semua Grafik' : 'Buka Semua Grafik Penjualan'}</span>
                      </button>
                    </div>

                    {/* REGISTERED SUPPLIER CATEGORIZATION & VIEW MODE TOGGLE */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Kategori Distributor / Supplier Terdaftar
                          </span>
                        </div>

                        {/* View Mode Toggle: Grouped by Supplier vs Flat List */}
                        <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                          <button
                            type="button"
                            onClick={() => setRestockViewMode('grouped_supplier')}
                            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              restockViewMode === 'grouped_supplier'
                                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Kelompokkan rekomendasi per distributor terdaftar"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Grup per Supplier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestockViewMode('list')}
                            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              restockViewMode === 'list'
                                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Tampilkan daftar seluruh produk sekaligus"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Daftar Semua</span>
                          </button>
                        </div>
                      </div>

                      {/* Supplier Filter Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSupplierFilter('all')}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                            selectedSupplierFilter === 'all'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Semua Distributor ({forecastData.forecasts?.length || 0})
                        </button>
                        {registeredSupplierOptions.map((sup) => {
                          const isSel = selectedSupplierFilter === sup.name;
                          return (
                            <button
                              key={sup.name}
                              type="button"
                              onClick={() => setSelectedSupplierFilter(isSel ? 'all' : sup.name)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isSel
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <Building2 className={`w-3 h-3 ${isSel ? 'text-white' : 'text-slate-400'}`} />
                              <span>{sup.name}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                  isSel
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {sup.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Universal Toolbar Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllPO}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                        >
                          {forecastData.forecasts &&
                          selectedPOProductIds.length === forecastData.forecasts.length ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span>
                            Pilih Semua ({selectedPOProductIds.length}/{forecastData.forecasts?.length || 0})
                          </span>
                        </button>
                      </div>

                      {/* PO Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                        <button
                          type="button"
                          onClick={() => handleCopyPOText()}
                          disabled={selectedPOProductIds.length === 0}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title="Salin teks purchase order untuk seluruh barang terpilih via WhatsApp"
                        >
                          {copyFeedback ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Salin Semua PO</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintPO()}
                          disabled={selectedPOProductIds.length === 0}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title="Cetak seluruh pesanan barang terpilih"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cetak Semua</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleApplyPOToReceiving}
                          disabled={selectedPOProductIds.length === 0}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-95"
                          title="Muat seluruh barang terpilih ke Form Terima Barang gudang"
                        >
                          {appliedToReceivingFeedback ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                              <span>Memuat ke Terima Barang...</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-3.5 h-3.5" />
                              <span>Terima Barang ({selectedPOProductIds.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* FORECAST ITEM CARD RENDERER HELPER */}
                    {(() => {
                      const renderForecastCard = (fc: AIForecastItem, idx: number, hideSupplierBadge: boolean = false) => {
                        const itemKey = fc.productId || fc.productName;
                        const isSelected = selectedPOProductIds.includes(itemKey);
                        const orderQty =
                          customPOQuantities[itemKey] !== undefined
                            ? customPOQuantities[itemKey]
                            : (fc.recommendedOrderQty || 0);
                        const originalQty = fc.originalOrderQty || fc.recommendedOrderQty || 12;
                        const isEliminated = orderQty === 0;
                        const isReduced = orderQty > 0 && orderQty < originalQty;
                        const unitCost = Number(fc.costPrice) || 0;
                        const subtotal = orderQty * unitCost;
                        const isChartExpanded = expandedChartKeys.includes(itemKey);
                        const matchedProduct = products.find(
                          (p) => p.id === fc.productId || p.name === fc.productName
                        );

                        return (
                          <div
                            key={`${fc.productId || fc.productName}-${idx}`}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isEliminated
                                ? 'border-rose-300/70 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                                : isSelected
                                ? 'border-emerald-300 dark:border-emerald-700/80 bg-white dark:bg-slate-900 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 opacity-70'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleSelectPOItem(itemKey)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0 space-y-2">
                                {/* Title & Badges */}
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h6 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                        {fc.productName}
                                      </h6>

                                      {/* Status & Rule Badges */}
                                      {fc.isDeadstock && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          Deadstock (0 Terjual)
                                        </span>
                                      )}

                                      {(fc.returnCount || 0) > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                          <RotateCcw className="w-3 h-3" />
                                          Retur: {fc.returnCount} Unit
                                        </span>
                                      )}

                                      {isEliminated && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1">
                                          <Ban className="w-3 h-3" />
                                          Kuota Dieliminasi (0)
                                        </span>
                                      )}

                                      {isReduced && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 flex items-center gap-1">
                                          <Scissors className="w-3 h-3" />
                                          Kuota Dipangkas (-50%)
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                      {fc.category && (
                                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-medium">
                                          {fc.category}
                                        </span>
                                      )}
                                      {fc.sku && <span>SKU: {fc.sku}</span>}
                                      {fc.barcode && <span>Barcode: {fc.barcode}</span>}
                                    </div>
                                  </div>

                                  {/* Urgency Pill */}
                                  <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                      fc.urgency.includes('KRITIS')
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                        : fc.urgency.includes('TINGGI')
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    }`}
                                  >
                                    {fc.urgency}
                                  </span>
                                </div>

                                {/* Quota adjustment explanation if modified */}
                                {fc.quotaAdjustmentReason && (
                                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                    <span className="font-semibold">{fc.quotaAdjustmentReason}</span>
                                  </div>
                                )}

                                {/* Suggested Supplier badge when in flat list view */}
                                {!hideSupplierBadge && fc.suggestedSupplier && (
                                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl flex-wrap">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span className="truncate">
                                        Distributor: <strong>{fc.suggestedSupplier}</strong>
                                      </span>
                                    </div>
                                    {fc.supplierTerms && (
                                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                        {fc.supplierTerms}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Stock Stats & Restock Stepper */}
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                  <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                                    <span>
                                      Sisa: <strong className="text-slate-900 dark:text-white">{fc.currentStock}</strong> {fc.unit || 'pcs'}
                                    </span>
                                    <span>
                                      Min: <strong className="text-slate-900 dark:text-white">{fc.minStock}</strong>
                                    </span>
                                    {fc.estimatedDaysLeft !== undefined && (
                                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                                        ~{fc.estimatedDaysLeft} hari tersisa
                                      </span>
                                    )}
                                  </div>

                                  {/* Order Stepper */}
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                                      Kuantitas PO:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePOQuantity(itemKey, -6)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-200"
                                      title="Kurangi 6 unit"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      value={orderQty}
                                      min={0}
                                      onChange={(e) =>
                                        handleSetPOQuantityDirect(itemKey, parseInt(e.target.value) || 0)
                                      }
                                      className="w-14 px-1.5 py-0.5 text-center font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePOQuantity(itemKey, 6)}
                                      className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-200"
                                      title="Tambah 6 unit"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Subtotal & Strategic Advice */}
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                                  <span className="text-[11px] text-slate-500">
                                    Biaya Satuan: {formatCurrency(unitCost, settings.currency)}
                                  </span>
                                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    Subtotal: {formatCurrency(subtotal, settings.currency)}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-2 rounded-xl leading-relaxed">
                                  <span className="font-bold text-amber-900 dark:text-amber-300 mr-1">Rekomendasi AI:</span>
                                  {fc.actionAdvice}
                                </div>

                                {/* QUICK ACTION BAR: GRAPH & QUOTA POLICY */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleExpandChart(itemKey)}
                                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                        isChartExpanded
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                      }`}
                                    >
                                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>{isChartExpanded ? 'Tutup Grafik' : 'Perilaku Grafik Penjualan'}</span>
                                      {isChartExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setActiveChartModalItem(fc)}
                                      className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                      title="Buka grafik layar penuh di modal terpisah"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Fokus</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1 ml-auto">
                                    {!isEliminated ? (
                                      <button
                                        type="button"
                                        onClick={() => handleEliminateSingleItem(itemKey)}
                                        className="px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-100 transition cursor-pointer flex items-center gap-1"
                                        title="Set kuota order ke 0 (eliminasi)"
                                      >
                                        <Ban className="w-3 h-3" />
                                        <span>Eliminasi (0)</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreSingleItem(itemKey, originalQty)}
                                        className="px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
                                        title="Pulihkan kuota order normal"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Pulihkan Kuota ({originalQty})</span>
                                      </button>
                                    )}

                                    {!isReduced && !isEliminated && (
                                      <button
                                        type="button"
                                        onClick={() => handleReduceSingleItem(itemKey, originalQty)}
                                        className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 transition cursor-pointer flex items-center gap-1"
                                        title="Pangkas kuota 50%"
                                      >
                                        <Scissors className="w-3 h-3" />
                                        <span>Pangkas 50%</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* INLINE RECHARTS EXPANDED ACCORDION */}
                                {isChartExpanded && (
                                  <div className="pt-2 animate-in fade-in duration-200">
                                    <RestockSalesTrendChart
                                      item={fc}
                                      product={matchedProduct}
                                      currency={settings.currency}
                                      targetDate={targetRestockDate}
                                      projectionDays={forecastData.projectionDays || 14}
                                      currentOrderQty={orderQty}
                                      onUpdateOrderQty={(newQty) => handleSetPOQuantityDirect(itemKey, newQty)}
                                      onEliminate={() => handleEliminateSingleItem(itemKey)}
                                      onReduce={() => handleReduceSingleItem(itemKey, originalQty)}
                                      onRestore={() => handleRestoreSingleItem(itemKey, originalQty)}
                                      isModal={false}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      };

                      if (filteredForecasts.length === 0) {
                        return (
                          <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <h6 className="font-bold text-sm text-slate-900 dark:text-white">
                              Tidak Ada Produk Pada Kategori Ini
                            </h6>
                            <p className="text-xs text-slate-500 mt-1">
                              Silakan ganti filter di atas atau klik "Semua" untuk melihat seluruh rekomendasi restock ritel.
                            </p>
                          </div>
                        );
                      }

                      // MODE 1: GROUPED BY REGISTERED SUPPLIER (Kategori per Supplier)
                      if (restockViewMode === 'grouped_supplier') {
                        return (
                          <div className="space-y-4">
                            {supplierGroups.map((group) => {
                              const groupKeys = group.items.map((it) => it.productId || it.productName);
                              const isAllGroupSelected =
                                groupKeys.length > 0 && groupKeys.every((k) => selectedPOProductIds.includes(k));
                              const isSomeGroupSelected =
                                groupKeys.some((k) => selectedPOProductIds.includes(k)) && !isAllGroupSelected;

                              return (
                                <div
                                  key={group.supplierName}
                                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 space-y-3"
                                >
                                  {/* Supplier Section Header Card */}
                                  <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleSelectSupplierPO(group.supplierName)}
                                        className="text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                                        title={isAllGroupSelected ? 'Batalkan pilihan supplier ini' : 'Pilih semua produk supplier ini'}
                                      >
                                        {isAllGroupSelected ? (
                                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        ) : isSomeGroupSelected ? (
                                          <div className="w-4 h-4 rounded border-2 border-emerald-600 bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-800 font-black">
                                            -
                                          </div>
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                        )}
                                      </button>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                                              {group.supplierName}
                                            </span>
                                          </div>

                                          {/* Payment Terms Badge */}
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                              (group.paymentTerms || '').toLowerCase().includes('konsinyasi')
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200'
                                                : (group.paymentTerms || '').toLowerCase().includes('tempo')
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200'
                                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                                            }`}
                                          >
                                            {group.paymentTerms || 'Tunai'}
                                          </span>
                                        </div>

                                        {group.supplierObj && (
                                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                            {group.supplierObj.contactPerson && (
                                              <span>
                                                PIC: <strong className="text-slate-700 dark:text-slate-300">{group.supplierObj.contactPerson}</strong>
                                              </span>
                                            )}
                                            {group.supplierObj.phone && (
                                              <span>Telp: {group.supplierObj.phone}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Supplier Subtotal & Actions */}
                                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                                      <div className="text-right mr-1">
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Total PO Supplier</div>
                                        <div className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                          {formatCurrency(group.totalSelectedBudget, settings.currency)}
                                          <span className="text-[10px] font-normal text-slate-500 ml-1">
                                            ({group.selectedCount}/{group.items.length} SKU)
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleCopyPOText(group.supplierName)}
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                        title={`Salin PO khusus ${group.supplierName} untuk WhatsApp`}
                                      >
                                        {copiedSupplierFeedback === group.supplierName ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Salin PO</span>
                                          </>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handlePrintPO(group.supplierName)}
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                        title={`Cetak surat pesanan ${group.supplierName}`}
                                      >
                                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Cetak PO</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Items in this Supplier Group */}
                                  <div className="space-y-2.5">
                                    {group.items.map((fc, idx) => renderForecastCard(fc, idx, true))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      // MODE 2: FLAT LIST OF ALL ITEMS
                      return (
                        <div className="space-y-3">
                          {filteredForecasts.map((fc, i) => renderForecastCard(fc, i, false))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Deadstock & FEFO Expiry Alerts (if any) */}
                  {forecastData.deadstockOrExpiryAlerts && forecastData.deadstockOrExpiryAlerts.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Peringatan Kadaluarsa & Slow Moving (FEFO)</span>
                      </div>
                      <div className="space-y-1.5">
                        {forecastData.deadstockOrExpiryAlerts.map((alt, idx) => (
                          <div key={idx} className="text-xs bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl">
                            <strong className="text-slate-900 dark:text-white">{alt.productName}</strong>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1.5">({alt.issue})</span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              Saran: {alt.suggestedPromotion}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: ANALISIS Z-REPORT & INSIGHTS */}
          {activeCopilotTab === 'insights' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Insight Eksekutif & Laporan Z-Report Harian
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evaluasi omzet, jam sibuk ritel, dan efisiensi operasional kasir.
                  </p>
                </div>

                <button
                  onClick={handleFetchInsights}
                  disabled={isLoadingInsights}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? 'animate-spin' : ''}`} />
                  <span>Update Analisis</span>
                </button>
              </div>

              {isLoadingInsights ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                  <p className="font-medium text-xs text-slate-600 dark:text-slate-300">
                    Menganalisis performa transaksi kasir hari ini...
                  </p>
                </div>
              ) : insightsData ? (
                <div className="space-y-3">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Ringkasan Operasional
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {insightsData.executiveSummary}
                    </p>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Jam Sibuk Puncak
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {insightsData.peakPerformanceTime || '12:00 - 14:00 & 18:00 - 20:00'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        Kategori Paling Laris
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {insightsData.topGrowthCategory || 'Sembako & Minuman'}
                      </p>
                    </div>
                  </div>

                  {/* Actionable Tips */}
                  {insightsData.actionableTips && (
                    <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Saran Taktis untuk Store Manager
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {insightsData.actionableTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: GENERATOR PROMO */}
          {activeCopilotTab === 'promo' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-500" />
                  Pembuat Promo Kilat Ritel (AI Campaign Maker)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ciptakan voucher belanja menarik (JSM, Gajian, Beli 2 Hemat) dengan 1 klik.
                </p>
              </div>

              {/* Form Controls */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tema Kampanye Promo
                  </label>
                  <input
                    type="text"
                    value={promoTheme}
                    onChange={(e) => setPromoTheme(e.target.value)}
                    placeholder="Contoh: Promo JSM Akhir Pekan, Gajian Ceria, Tebus Murah"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Kategori
                  </label>
                  <select
                    value={promoCategory}
                    onChange={(e) => setPromoCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Semua Kategori">Semua Kategori</option>
                    <option value="Sembako & Bahan Pokok">Sembako & Bahan Pokok</option>
                    <option value="Minuman & Susu">Minuman & Susu</option>
                    <option value="Snack & Biskuit">Snack & Biskuit</option>
                    <option value="Makanan Instan">Makanan Instan</option>
                    <option value="Perawatan Tubuh">Perawatan Tubuh</option>
                  </select>
                </div>

                {/* OWNER PROFIT MARGIN RULE SECTION */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/30 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Aturan Margin Profit Owner (Minimal)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                      Min. {minOwnerMargin}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Sistem memastikan diskon tidak menggerus modal HPP, dan owner wajib memperoleh keuntungan bersih minimal <strong>{minOwnerMargin}%</strong> dari setiap transaksi voucher ini.
                  </p>

                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[5, 8, 10, 15].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMinOwnerMargin(val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          minOwnerMargin === val
                            ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {val === 5 ? '5% (Wajib)' : `${val}%`}
                      </button>
                    ))}
                  </div>

                  {/* Live Margin Calculation Badge */}
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Rata-rata Margin Kategori: <strong>{targetCategoryStats.avgMargin}%</strong>
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Diskon Maksimal Aman: <strong>{targetCategoryStats.maxAllowedDiscount}%</strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGeneratePromo}
                  disabled={isGeneratingPromo}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingPromo ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingPromo ? 'Gemini Merancang Promo...' : 'Generate Ide Promo AI (Margin Aman)'}</span>
                </button>
              </div>

              {/* Generated Promo Result */}
              {generatedPromo && (
                <div className="p-4 rounded-2xl border border-emerald-500/50 bg-white dark:bg-slate-950 space-y-3 shadow-md animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                      Voucher Siap Pakai
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Min. Rp {generatedPromo.minSpend.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {generatedPromo.title}
                    </h5>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium italic mt-0.5">
                      "{generatedPromo.tagline}"
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {generatedPromo.description}
                    </p>
                  </div>

                  {/* OWNER PROFIT MARGIN AUDIT CARD */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Garansi Margin Owner (≥ {generatedPromo.minProfitMargin || 5}%)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                        Status: Terlindungi
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-emerald-200/60 dark:border-emerald-800/50">
                      <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Margin Awal</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {generatedPromo.originalMarginPercent || targetCategoryStats.avgMargin}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Margin Sisa</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          +{generatedPromo.projectedMarginPercent || 5.5}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Est. Laba/Trx</span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                          +Rp {(generatedPromo.estimatedProfitAmount || 3500).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {generatedPromo.ownerSafetyNote && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-tight italic pt-0.5">
                        💡 {generatedPromo.ownerSafetyNote}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-between border border-dashed border-slate-300 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono">KODE VOUCHER</span>
                      <p className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-widest">
                        {generatedPromo.voucherCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">NILAI POTONGAN</span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {generatedPromo.discountType === 'percentage'
                          ? `${generatedPromo.value}%`
                          : `Rp ${generatedPromo.value.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyPromoVoucher}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    {promoAppliedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 dark:text-slate-950" />
                        <span>Voucher Berhasil Ditambahkan ke Kasir!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Aktifkan Voucher di Kasir Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TANYA GEMINI */}
          {activeCopilotTab === 'chat' && (
            <div className="flex flex-col h-[520px]">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                        msg.sender === 'user'
                          ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-xs'
                          : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>

                    {/* Quick suggestion pills */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleSendChatMessage(act)}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                    <span>Gemini sedang menyusun jawaban...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ketik pertanyaan terkait toko, stok, atau kasir..."
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingChat}
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL FOKUS GRAFIK PENJUALAN & RESTOCK */}
      {activeChartModalItem && (
        <RestockSalesTrendChart
          isModal={true}
          item={activeChartModalItem}
          product={products.find(
            (p) => p.id === activeChartModalItem.productId || p.name === activeChartModalItem.productName
          )}
          currency={settings.currency}
          targetDate={targetRestockDate}
          projectionDays={forecastData?.projectionDays || 14}
          currentOrderQty={
            customPOQuantities[activeChartModalItem.productId || activeChartModalItem.productName] !== undefined
              ? customPOQuantities[activeChartModalItem.productId || activeChartModalItem.productName]
              : (activeChartModalItem.recommendedOrderQty || 0)
          }
          onUpdateOrderQty={(newQty) =>
            handleSetPOQuantityDirect(activeChartModalItem.productId || activeChartModalItem.productName, newQty)
          }
          onEliminate={() =>
            handleEliminateSingleItem(activeChartModalItem.productId || activeChartModalItem.productName)
          }
          onReduce={() =>
            handleReduceSingleItem(
              activeChartModalItem.productId || activeChartModalItem.productName,
              activeChartModalItem.originalOrderQty || activeChartModalItem.recommendedOrderQty
            )
          }
          onRestore={() =>
            handleRestoreSingleItem(
              activeChartModalItem.productId || activeChartModalItem.productName,
              activeChartModalItem.originalOrderQty || activeChartModalItem.recommendedOrderQty
            )
          }
          onClose={() => setActiveChartModalItem(null)}
        />
      )}
    </div>
  );
};
