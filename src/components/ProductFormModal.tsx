import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Save,
  Package,
  Barcode,
  Hash,
  DollarSign,
  Tag,
  Calendar,
  Layers,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  Percent,
  Check,
  AlertCircle,
  RefreshCw,
  Boxes,
  Trash2,
  Award,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { Product, WholesaleUnit } from '../types';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSuccess?: (product: Product, isEdit: boolean) => void;
  onPrintPriceTag?: (product: Product) => void;
}

const SAMPLE_IMAGES = [
  { label: 'Beras / Gula', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Minyak / Botol', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { label: 'Minuman / Susu', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80' },
  { label: 'Kopi / Teh', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Snack / Biskuit', url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Mie / Instan', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
  { label: 'Perawatan / Sabun', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80' },
  { label: 'Pembersih Rumah', url: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?auto=format&fit=crop&w=600&q=80' },
];

const PRESET_UNITS = [
  { name: 'Dus (40 Pcs)', multiplier: 40, label: 'Dus Mie (40 pcs)' },
  { name: 'Dus / Karton (12 Pcs)', multiplier: 12, label: 'Dus Minyak 1L / Sabun (12 pcs)' },
  { name: 'Dus / Karton (6 Pouch)', multiplier: 6, label: 'Dus Minyak 2L (6 pcs)' },
  { name: 'Slop (10 Bungkus)', multiplier: 10, label: 'Slop Rokok (10 bks)' },
  { name: 'Bal (200 Bungkus / 20 Slop)', multiplier: 200, label: 'Bal Rokok (200 bks)' },
  { name: 'Dus (24 Botol)', multiplier: 24, label: 'Dus Aqua/Minuman (24 btl)' },
  { name: 'Renceng (10 Sachet)', multiplier: 10, label: 'Renceng Kopi/Susu (10 sch)' },
  { name: 'Dus (120 Sachet / 12 Renceng)', multiplier: 120, label: 'Dus Kopi (120 sch)' },
  { name: 'Lusin (12 Pcs)', multiplier: 12, label: 'Lusin Sabun/Barang (12 pcs)' },
  { name: 'Karton (72 Pcs / 6 Lusin)', multiplier: 72, label: 'Karton Sabun (72 pcs)' },
  { name: 'Bal / Karung (5 Sak / 25kg)', multiplier: 5, label: 'Bal Beras 5kg (5 sak)' },
  { name: 'Pak (5 Pcs)', multiplier: 5, label: 'Pak Mini (5 pcs)' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
  onPrintPriceTag,
}) => {
  const { categories, addProduct, updateProduct, settings } = usePOS();

  const isEditMode = Boolean(productToEdit);

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('groceries');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState('pcs');
  const [aisle, setAisle] = useState('Lorong 1 - Rak A1');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [batchNumber, setBatchNumber] = useState('');
  const [image, setImage] = useState('');
  const [promoBadge, setPromoBadge] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [description, setDescription] = useState('');
  const [wholesaleUnits, setWholesaleUnits] = useState<WholesaleUnit[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineFeedback, setOnlineFeedback] = useState<{ type: 'success' | 'error'; message: string; source?: string } | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setBrand(productToEdit.brand || '');
      setSku(productToEdit.sku || '');
      setBarcode(productToEdit.barcode || '');
      setCategoryId(productToEdit.categoryId || 'groceries');
      setPrice(productToEdit.price || 0);
      setCostPrice(productToEdit.costPrice || 0);
      setStock(productToEdit.stock || 0);
      setMinStock(productToEdit.minStock || 5);
      setUnit(productToEdit.unit || 'pcs');
      setAisle(productToEdit.aisle || 'Lorong 1 - Rak A1');
      setExpiryDate(productToEdit.expiryDate || '2027-12-31');
      setBatchNumber(productToEdit.batchNumber || '');
      setImage(productToEdit.image || SAMPLE_IMAGES[0].url);
      setPromoBadge(productToEdit.promoBadge || '');
      setIsPopular(Boolean(productToEdit.isPopular));
      setDescription(productToEdit.description || '');
      setWholesaleUnits(productToEdit.wholesaleUnits || []);
    } else {
      // Reset defaults for new item
      setName('');
      setBrand('');
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setSku(`SKU-${randNum}`);
      setBarcode(`899${Math.floor(100000000 + Math.random() * 900000000)}`);
      setCategoryId('groceries');
      setPrice(15000);
      setCostPrice(12000);
      setStock(24);
      setMinStock(6);
      setUnit('pcs');
      setAisle('Lorong 1 - Rak A1');
      setExpiryDate('2027-12-31');
      setBatchNumber(`BCH-${randNum}`);
      setImage(SAMPLE_IMAGES[0].url);
      setPromoBadge('');
      setIsPopular(false);
      setDescription('');
      setWholesaleUnits([]);
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    const random12 = `899${Math.floor(100000000 + Math.random() * 900000000)}`;
    setBarcode(random12);
  };

  const handleOnlineBarcodeLookup = async (codeToUse?: string) => {
    const code = (codeToUse || barcode).trim();
    if (!code) {
      setOnlineFeedback({ type: 'error', message: 'Masukkan barcode terlebih dahulu.' });
      return;
    }

    setOnlineLoading(true);
    setOnlineFeedback(null);

    try {
      const res = await fetch('/api/online/lookup-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        const item = json.data;
        if (item.name) setName(item.name);
        if (item.brand) setBrand(item.brand);
        if (item.categoryId) setCategoryId(item.categoryId);
        if (item.unit) setUnit(item.unit);
        if (item.price > 0) setPrice(item.price);
        if (item.costPrice > 0) setCostPrice(item.costPrice);
        if (item.image && !item.image.includes('placeholder')) setImage(item.image);
        if (item.description) setDescription(item.description);

        if (Array.isArray(item.wholesaleUnits) && item.wholesaleUnits.length > 0) {
          setWholesaleUnits(
            item.wholesaleUnits.map((u: any, idx: number) => ({
              id: `wh-${Date.now()}-${idx}`,
              name: u.name,
              multiplier: u.multiplier,
              price: u.price,
              costPrice: u.costPrice,
              barcode: `${code}-${u.multiplier}`,
            }))
          );
        }

        setOnlineFeedback({
          type: 'success',
          message: `Berhasil mencocokkan produk dari ${json.source || 'Database Internet'}!`,
          source: json.source,
        });
      } else {
        setOnlineFeedback({
          type: 'error',
          message: json.message || `Barcode ${code} tidak ditemukan di database internet.`,
        });
      }
    } catch {
      setOnlineFeedback({
        type: 'error',
        message: 'Gagal terhubung ke database online. Pastikan koneksi aktif.',
      });
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleOnlineNameSearch = async () => {
    const q = name.trim();
    if (!q) {
      setOnlineFeedback({ type: 'error', message: 'Ketik nama produk terlebih dahulu.' });
      return;
    }

    setOnlineLoading(true);
    setOnlineFeedback(null);

    try {
      const res = await fetch('/api/online/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.results) && json.results.length > 0) {
        const item = json.results[0];
        if (item.name) setName(item.name);
        if (item.brand) setBrand(item.brand);
        if (item.barcode) setBarcode(item.barcode);
        if (item.categoryId) setCategoryId(item.categoryId);
        if (item.unit) setUnit(item.unit);
        if (item.price > 0) setPrice(item.price);
        if (item.costPrice > 0) setCostPrice(item.costPrice);
        if (item.image) setImage(item.image);
        if (item.description) setDescription(item.description);

        if (Array.isArray(item.wholesaleUnits) && item.wholesaleUnits.length > 0) {
          setWholesaleUnits(
            item.wholesaleUnits.map((u: any, idx: number) => ({
              id: `wh-${Date.now()}-${idx}`,
              name: u.name,
              multiplier: u.multiplier,
              price: u.price,
              costPrice: u.costPrice,
              barcode: `${item.barcode}-${u.multiplier}`,
            }))
          );
        }

        setOnlineFeedback({
          type: 'success',
          message: `Berhasil mencocokkan dengan data resmi: "${item.name}"!`,
          source: json.source,
        });
      } else {
        setOnlineFeedback({
          type: 'error',
          message: `Tidak ditemukan produk "${q}" di database internet.`,
        });
      }
    } catch {
      setOnlineFeedback({
        type: 'error',
        message: 'Gagal terhubung ke database online.',
      });
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleGenerateSku = () => {
    const catCode = categoryId.slice(0, 3).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${catCode}-${rand}`);
  };

  const marginNominal = Math.max(0, price - costPrice);
  const marginPercent = price > 0 ? (marginNominal / price) * 100 : 0;
  const isEligibleForPoints = marginPercent >= (settings.minProfitPercentForPoints ?? 15);

  const handleAddWholesaleUnit = (preset?: { name: string; multiplier: number }) => {
    const multiplier = preset ? preset.multiplier : 10;
    const unitName = preset ? preset.name : `Dus (${multiplier} ${unit})`;
    const suggestedPrice = Math.round((price * multiplier * 0.95) / 500) * 500; // 5% grosir discount
    const suggestedCost = costPrice * multiplier;

    const newUnit: WholesaleUnit = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: unitName,
      multiplier,
      price: suggestedPrice > 0 ? suggestedPrice : price * multiplier,
      costPrice: suggestedCost > 0 ? suggestedCost : undefined,
      barcode: barcode ? `${barcode}-${multiplier}` : undefined,
    };

    setWholesaleUnits((prev) => [...prev, newUnit]);
  };

  const handleUpdateWholesaleUnit = (id: string, updated: Partial<WholesaleUnit>) => {
    setWholesaleUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
    );
  };

  const handleDeleteWholesaleUnit = (id: string) => {
    setWholesaleUnits((prev) => prev.filter((u) => u.id !== id));
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Nama produk wajib diisi';
    if (!sku.trim()) errs.sku = 'SKU / Kode barang wajib diisi';
    if (!barcode.trim()) errs.barcode = 'Barcode wajib diisi';
    if (price <= 0) errs.price = 'Harga jual harus lebih dari 0';
    if (costPrice < 0) errs.costPrice = 'Harga modal tidak boleh negatif';
    if (stock < 0) errs.stock = 'Stok tidak boleh negatif';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const productPayload: Omit<Product, 'id'> = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      sku: sku.trim(),
      barcode: barcode.trim(),
      categoryId,
      price: Number(price),
      costPrice: Number(costPrice),
      stock: Number(stock),
      minStock: Number(minStock),
      unit: unit.trim() || 'pcs',
      aisle: aisle.trim() || undefined,
      expiryDate: expiryDate || undefined,
      batchNumber: batchNumber.trim() || undefined,
      image: image.trim() || SAMPLE_IMAGES[0].url,
      promoBadge: promoBadge.trim() || undefined,
      isPopular,
      description: description.trim() || undefined,
      wholesaleUnits: wholesaleUnits.length > 0 ? wholesaleUnits : undefined,
    };

    if (isEditMode && productToEdit) {
      updateProduct(productToEdit.id, productPayload);
      if (onSuccess) onSuccess({ ...productPayload, id: productToEdit.id }, true);
    } else {
      const created = addProduct(productPayload);
      if (onSuccess) onSuccess(created, false);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEditMode ? 'Edit Master Item Produk' : 'Tambah Master Item Produk Baru'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {isEditMode ? 'Perbarui Data' : 'Produk Baru'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditMode
                  ? `Mengubah informasi untuk SKU: ${productToEdit?.sku}`
                  : 'Daftarkan item barang baru ke dalam katalog dan inventaris stok toko'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Online Match Feedback Banner */}
          {onlineFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in-50 ${
                onlineFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              {onlineFeedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">{onlineFeedback.message}</p>
                {onlineFeedback.source && (
                  <p className="text-[11px] opacity-80 mt-0.5">Sumber Data: {onlineFeedback.source}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOnlineFeedback(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 1: Informasi Pokok */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                <span>Informasi Utama Produk</span>
              </h4>
              <button
                type="button"
                onClick={handleOnlineNameSearch}
                disabled={onlineLoading}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Globe className="w-3 h-3" />
                <span>{onlineLoading ? 'Mencari...' : 'Cari di Database Internet'}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Produk / Barang <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Beras Pandan Wangi Premium 5kg, Indomie Goreng Spesial..."
                    className={`flex-1 px-3 py-2 text-sm rounded-xl border ${
                      errors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none`}
                  />
                  <button
                    type="button"
                    onClick={handleOnlineNameSearch}
                    disabled={onlineLoading || !name.trim()}
                    className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 cursor-pointer disabled:opacity-40"
                    title="Cari spesifikasi produk online dari nama"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Cari Online</span>
                  </button>
                </div>
                {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand / Merk Pabrikan
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Contoh: Indofood, Unilever, Mayora, Wings..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {categories
                    .filter((c) => c.id !== 'all')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Barcode, SKU & Satuan */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-blue-500" />
              <span>Kode SKU, Barcode & Satuan</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    SKU / Kode Barang <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto
                  </button>
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="SEM-BRS-5KG"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {errors.sku && <p className="text-[11px] text-rose-500 mt-1">{errors.sku}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Barcode EAN-13 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOnlineBarcodeLookup()}
                      disabled={onlineLoading || !barcode.trim()}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold disabled:opacity-40"
                      title="Cek ke database Open Food Facts & Internet"
                    >
                      <Globe className="w-2.5 h-2.5" /> Cek Online
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Acak EAN
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="899999901001"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {errors.barcode && <p className="text-[11px] text-rose-500 mt-1">{errors.barcode}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Satuan Kemasan
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="pcs">Pcs / Buah</option>
                  <option value="botol">Botol</option>
                  <option value="kaleng">Kaleng</option>
                  <option value="bungkus">Bungkus / Sachet</option>
                  <option value="sak">Sak (5kg/10kg/25kg)</option>
                  <option value="pouch">Pouch (Refill)</option>
                  <option value="dus">Dus / Karton</option>
                  <option value="pack">Pack / Multipack</option>
                  <option value="kg">Kilogram (Kg)</option>
                  <option value="liter">Liter (L)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Harga & Margin Keuntungan */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Harga Beli (Modal/HPP) & Harga Jual Eceran</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs normal-case font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Margin: <strong className="font-bold">{(marginPercent ?? 0).toFixed(1)}%</strong> ({formatCurrency(marginNominal)})
                </span>
                {isEligibleForPoints ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 shadow-2xs">
                    <Award className="w-3 h-3 stroke-[2.5]" />
                    <span>Dapat Poin Member (≥15%)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Tanpa Poin (&lt;15%)</span>
                  </span>
                )}
              </div>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Harga Modal / Beli (HPP) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    placeholder="12000"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {errors.costPrice && <p className="text-[11px] text-rose-500 mt-1">{errors.costPrice}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Harga Jual Konsumen (Eceran) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="15000"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {errors.price && <p className="text-[11px] text-rose-500 mt-1">{errors.price}</p>}
              </div>
            </div>
          </div>

          {/* Section: Satuan Grosir (Wholesale Units) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-500" />
                  <span>Satuan Grosir & Bertingkat (Dus, Slop, Lusin, Karton, Renceng, Bal)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Atur kemasan grosir dengan harga khusus. Kasir dapat memilih satuan ini langsung saat transaksi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddWholesaleUnit()}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Satuan Grosir</span>
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Preset cepat:</span>
              {PRESET_UNITS.slice(0, 6).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddWholesaleUnit(preset)}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-white dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  +{preset.label}
                </button>
              ))}
            </div>

            {/* Wholesale Units List */}
            {wholesaleUnits.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {wholesaleUnits.map((u, idx) => {
                  const unitHpp = (u.costPrice ?? costPrice * u.multiplier);
                  const unitNominal = Math.max(0, u.price - unitHpp);
                  const unitMargin = u.price > 0 ? (unitNominal / u.price) * 100 : 0;
                  const unitPointsEligible = unitMargin >= (settings.minProfitPercentForPoints ?? 15);

                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            (Isi: {u.multiplier} {unit})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              unitPointsEligible
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            Margin {(unitMargin ?? 0).toFixed(1)}% {unitPointsEligible ? '• Poin Aktif' : '• Tanpa Poin (<15%)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteWholesaleUnit(u.id)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title="Hapus Satuan Grosir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Nama Satuan
                          </label>
                          <input
                            type="text"
                            value={u.name}
                            onChange={(e) => handleUpdateWholesaleUnit(u.id, { name: e.target.value })}
                            placeholder="Dus (40 Pcs)"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Isi / Multiplier ({unit})
                          </label>
                          <input
                            type="number"
                            min={2}
                            value={u.multiplier}
                            onChange={(e) => {
                              const newMult = Math.max(1, Number(e.target.value));
                              handleUpdateWholesaleUnit(u.id, {
                                multiplier: newMult,
                                costPrice: costPrice * newMult,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Harga Jual Grosir (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={u.price || ''}
                            onChange={(e) => handleUpdateWholesaleUnit(u.id, { price: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            Harga Modal HPP (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={u.costPrice ?? (costPrice * u.multiplier)}
                            onChange={(e) => handleUpdateWholesaleUnit(u.id, { costPrice: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                Belum ada satuan grosir. Klik tombol <span className="font-semibold text-emerald-600">+ Satuan Grosir</span> atau pilih preset di atas untuk menambahkan dus/slop/lusin.
              </div>
            )}
          </div>

          {/* Section 4: Stok, Lokasi Rak & Batch FEFO */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Inventaris, Lokasi Rak & Batch FEFO</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stok Saat Ini
                </label>
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Min. Stok (Alert)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi Rak Display
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={aisle}
                    onChange={(e) => setAisle(e.target.value)}
                    placeholder="Lorong 1 - Rak A1"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tgl Expired (FEFO)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Gambar & Promosi */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
              <span>Gambar & Atribut Tambahan</span>
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Foto Produk
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {image ? (
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {/* Preset Thumbnails */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                  {SAMPLE_IMAGES.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImage(s.url)}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Label Promo (Opsional)
                  </label>
                  <input
                    type="text"
                    value={promoBadge}
                    onChange={(e) => setPromoBadge(e.target.value)}
                    placeholder="Contoh: Diskon 10%, Beli 2 Gratis 1, Promo Spesial..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPopular}
                      onChange={(e) => setIsPopular(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Tandai sebagai Produk Terlaris / Populer (Best Seller)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Keterangan Singkat
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan spesifikasi produk, berat bersih, nomor izin BPOM/Halal..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
            <div>
              {isEditMode && productToEdit && onPrintPriceTag && (
                <button
                  type="button"
                  onClick={() => onPrintPriceTag(productToEdit)}
                  className="px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Cetak Pricetag (A4/F4)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Produk Baru'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
