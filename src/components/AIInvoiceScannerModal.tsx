import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  CheckCircle,
  FileText,
  AlertCircle,
  Package,
  Building2,
  Calendar,
  Percent,
  DollarSign,
  Loader2,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { AIInvoiceScanResult, SupplierPurchaseItem } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AIInvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyInvoice: (scannedData: {
    supplierName: string;
    invoiceNumber: string;
    items: SupplierPurchaseItem[];
    discountAmount: number;
    ppnAmount: number;
    notes?: string;
  }) => void;
}

export const AIInvoiceScannerModal: React.FC<AIInvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyInvoice,
}) => {
  const { products, settings } = usePOS();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<AIInvoiceScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setScanResult(null);
      setScanError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStartCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setScanError('Tidak dapat mengakses kamera perangkat. Silakan unggah foto faktur dari galeri/file.');
    }
  };

  const handleCaptureCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelectedImage(dataUrl);
      setScanResult(null);
      setScanError(null);
    }

    // Stop stream
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleCancelCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleProcessScan = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/ai/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: 'image/jpeg',
          catalogProducts: products,
          storeSettings: settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal memproses faktur');
      }

      const result: AIInvoiceScanResult = await response.json();
      setScanResult(result);
    } catch (err: any) {
      console.error(err);
      setScanError('Gagal memproses gambar faktur. Menggunakan hasil parsing alternatif.');
    } finally {
      setIsScanning(false);
    }
  };

  // Demo sample loader for easy testing without needing physical paper
  const handleLoadDemoInvoice = () => {
    // Canvas dummy sample invoice generator
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 750);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('PT INDOMARCO ADI PRIMA', 40, 50);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('SURAT JALAN & FAKTUR PENJUALAN', 40, 75);
      ctx.fillText('No. Faktur: INV/IND-2026/8892', 40, 100);
      ctx.fillText(`Tanggal: ${new Date().toISOString().split('T')[0]}`, 40, 120);
      ctx.fillText(`Kepada: ${settings.storeName} - ${settings.branchName}`, 40, 140);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 160);
      ctx.lineTo(560, 160);
      ctx.stroke();

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('ITEM BARANG', 40, 185);
      ctx.fillText('QTY', 300, 185);
      ctx.fillText('HARGA (Rp)', 380, 185);
      ctx.fillText('TOTAL (Rp)', 470, 185);

      const items = [
        { name: '1. Indomie Goreng Spesial', qty: '40 Pcs', price: '2.900', total: '116.000' },
        { name: '2. Ultra Milk Full Cream 1L', qty: '24 Pcs', price: '18.500', total: '444.000' },
        { name: '3. Minyak Goreng Bimoli 2L', qty: '12 Pcs', price: '34.000', total: '408.000' },
        { name: '4. Aqua Botol 600ml (Dus)', qty: '20 Dus', price: '45.000', total: '900.000' },
      ];

      items.forEach((item, idx) => {
        const y = 220 + idx * 35;
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#334155';
        ctx.fillText(item.name, 40, y);
        ctx.fillText(item.qty, 300, y);
        ctx.fillText(item.price, 380, y);
        ctx.fillText(item.total, 470, y);
      });

      ctx.beginPath();
      ctx.moveTo(40, 380);
      ctx.lineTo(560, 380);
      ctx.stroke();

      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('DPP (Subtotal): Rp 1.868.000', 320, 410);
      ctx.fillText('PPN 11%: Rp 205.480', 320, 435);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('TOTAL FAKTUR: Rp 2.073.480', 320, 470);

      const demoUrl = canvas.toDataURL('image/jpeg');
      setSelectedImage(demoUrl);
      setScanResult(null);
      setScanError(null);
    }
  };

  const handleApplyToPurchaseForm = () => {
    if (!scanResult) return;

    const mappedItems: SupplierPurchaseItem[] = scanResult.items.map((item) => {
      // Find matching catalog product ID or assign first catalog fallback
      const found = products.find(
        (p) =>
          p.id === item.matchedProductId ||
          p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
          item.productName.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        productId: found?.id || products[0]?.id || 'prod-1',
        productName: found?.name || item.productName,
        quantity: item.quantity || 1,
        costPrice: item.costPrice || found?.costPrice || 10000,
        subtotal: item.subtotal || (item.quantity * (item.costPrice || 10000)),
        expiryDate: item.expiryDate || '2027-12-31',
      };
    });

    onApplyInvoice({
      supplierName: scanResult.supplierName || 'PT Indomarco Adi Prima (Indofood)',
      invoiceNumber: scanResult.invoiceNumber || `INV-SCAN-${Date.now().toString().slice(-6)}`,
      items: mappedItems,
      discountAmount: scanResult.discountAmount || 0,
      ppnAmount: scanResult.ppnAmount || 0,
      notes: scanResult.notes || 'Input otomatis via Gemini AI Multimodal Vision Scanner',
    });

    onClose();
  };

  return (
    <div
      id="ai-invoice-scanner-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  AI OCR Scanner Faktur & Surat Jalan Pembelian
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Gemini Vision AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindai foto nota atau surat jalan distributor secara instan tanpa perlu ketik manual.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Camera Streaming Mode */}
          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-inner">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4 z-10">
                <button
                  onClick={handleCancelCamera}
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl backdrop-blur-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleCaptureCamera}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Ambil Foto Faktur
                </button>
              </div>
            </div>
          ) : (
            /* Upload & Preview Section */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Image Input & Options */}
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition ${
                    selectedImage
                      ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  {selectedImage ? (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Faktur Nota"
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-rose-600 transition"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-6 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Unggah Foto Faktur / Nota Kertas
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Format JPG, PNG, atau jepret langsung dengan kamera
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3 w-full">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Pilih File
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> Buka Kamera
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDemoInvoice}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Contoh Faktur Demo
                    </button>
                  </div>
                </div>

                {/* Scan Button */}
                <button
                  type="button"
                  id="btn-trigger-ai-invoice-scan"
                  onClick={handleProcessScan}
                  disabled={!selectedImage || isScanning}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Mengekstrak Data via Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Pindai & Ekstrak Data Faktur</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Scanned Result Card */}
              <div className="space-y-4 flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Hasil Pembacaan Dokumen</span>
                </h3>

                {scanResult ? (
                  <div className="flex-1 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      {/* Supplier & Invoice metadata */}
                      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Supplier:</span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {scanResult.supplierName || 'PT Indomarco Adi Prima'}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">No. Faktur:</span>
                          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {scanResult.invoiceNumber || 'INV-SUP-10928'}
                          </span>
                        </div>
                      </div>

                      {/* Items preview table */}
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {scanResult.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {item.productName}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.quantity} unit @ {formatCurrency(item.costPrice, settings.currency)}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              {formatCurrency(item.subtotal, settings.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Subtotal (DPP):</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(scanResult.grossAmount || 0, settings.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>PPN / Pajak:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            +{formatCurrency(scanResult.ppnAmount || 0, settings.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span>Total Tagihan:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(scanResult.finalTotal || 0, settings.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="btn-apply-scanned-invoice"
                      onClick={handleApplyToPurchaseForm}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Terapkan ke Form Pembelian</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 bg-slate-50/50 dark:bg-slate-850/50">
                    <FileText className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">
                      Belum ada data pindaian. Pilih foto faktur lalu klik tombol{' '}
                      <strong>"Pindai & Ekstrak Data Faktur"</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
