import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Video,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Upload,
  RefreshCw,
  Eye,
  Check,
  Package,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sliders,
  History,
  ShieldCheck,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { AIStockOpnameDetectedItem, AIStockOpnameResult } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AIVisualStockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStockCounts?: (updates: { productId: string; newStock: number }[]) => void;
}

export const AIVisualStockOpnameModal: React.FC<AIVisualStockOpnameModalProps> = ({
  isOpen,
  onClose,
  onApplyStockCounts,
}) => {
  const { products, updateProductStock, settings, activeEmployee } = usePOS();

  const [scannedType, setScannedType] = useState<'shelf_image' | 'video_stream'>('shelf_image');
  const [shelfArea, setShelfArea] = useState<string>('Lorong 1 - Rak Sembako & Makanan');
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [isCapturingVideo, setIsCapturingVideo] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<AIStockOpnameResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoCaptureIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      // Clean up camera and intervals on unmount
      if (videoCaptureIntervalRef.current) {
        clearInterval(videoCaptureIntervalRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setNotification('Tidak dapat mengakses kamera langsung. Silakan pilih foto dari berkas/galeri.');
    }
  };

  const handleStopCamera = () => {
    if (videoCaptureIntervalRef.current) {
      clearInterval(videoCaptureIntervalRef.current);
      videoCaptureIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setIsCameraActive(false);
    setIsCapturingVideo(false);
  };

  const handleCaptureSinglePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedFrames([frame]);
      setScanResult(null);
    }
    handleStopCamera();
  };

  // Start continuous video sampling (capturing 4 frames across 3 seconds of scanning the shelf)
  const handleStartContinuousVideoSampling = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturingVideo(true);
    const frames: string[] = [];

    const captureInterval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      if (frames.length >= 4) {
        clearInterval(captureInterval);
        setCapturedFrames(frames);
        setIsCapturingVideo(false);
        handleStopCamera();
      }
    }, 700);

    videoCaptureIntervalRef.current = captureInterval;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const loadedFrames: string[] = [];
    let processed = 0;

    fileArray.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        loadedFrames.push(reader.result as string);
        processed++;
        if (processed === fileArray.length) {
          setCapturedFrames(loadedFrames);
          setScanResult(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Generate Demo Shelf Image for one-click testing
  const handleLoadDemoShelf = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Shelf Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 700, 450);

      // Shelf lines
      ctx.fillStyle = '#475569';
      ctx.fillRect(40, 180, 620, 12);
      ctx.fillRect(40, 360, 620, 12);

      // Draw Items on Shelf Top Level
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(60, 80, 60, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('INDOMIE', 65, 130);

      ctx.fillStyle = '#e11d48';
      ctx.fillRect(130, 80, 60, 100);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('INDOMIE', 135, 130);

      ctx.fillStyle = '#e11d48';
      ctx.fillRect(200, 80, 60, 100);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('INDOMIE', 205, 130);

      // Milk cartons
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(300, 70, 70, 110);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('ULTRA 1L', 308, 125);

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(380, 70, 70, 110);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('ULTRA 1L', 388, 125);

      // Bottom shelf items (Oils)
      ctx.fillStyle = '#eab308';
      ctx.fillRect(80, 240, 80, 120);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('BIMOLI 2L', 90, 300);

      ctx.fillStyle = '#eab308';
      ctx.fillRect(180, 240, 80, 120);
      ctx.fillStyle = '#0f172a';
      ctx.fillText('BIMOLI 2L', 190, 300);

      ctx.fillStyle = '#eab308';
      ctx.fillRect(280, 240, 80, 120);
      ctx.fillStyle = '#0f172a';
      ctx.fillText('BIMOLI 2L', 290, 300);

      const demo = canvas.toDataURL('image/jpeg');
      setCapturedFrames([demo]);
      setScanResult(null);
    }
  };

  const handleRunAiStockAudit = async () => {
    if (capturedFrames.length === 0) return;

    setIsProcessing(true);
    setNotification(null);

    try {
      const response = await fetch('/api/ai/visual-stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagesBase64: capturedFrames,
          mimeType: 'image/jpeg',
          scannedType,
          shelfArea,
          catalogProducts: products,
          storeSettings: settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menganalisis visual rak');
      }

      const result: AIStockOpnameResult = await response.json();
      setScanResult(result);
    } catch (err) {
      console.error(err);
      setNotification('Terjadi kendala saat menghubungi server AI. Menampilkan estimasi inspeksi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyAllStockCorrections = () => {
    if (!scanResult) return;

    let appliedCount = 0;
    scanResult.items.forEach((item) => {
      if (item.productId) {
        updateProductStock(item.productId, item.detectedCount);
        appliedCount++;
      }
    });

    setNotification(`Berhasil memperbarui stok ${appliedCount} produk sesuai hasil audit visual AI.`);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div
      id="ai-visual-stock-opname-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Opname Cerdas via Video & Kamera AI
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Gemini Vision Inspector
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hitung unit barang fisik di rak display secara otomatis melalui video atau foto kamera.
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

        {/* Notification banner */}
        {notification && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Audit Settings Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Rak / Area:
                </span>
                <select
                  value={shelfArea}
                  onChange={(e) => setShelfArea(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                >
                  <option value="Lorong 1 - Rak Sembako & Makanan">Lorong 1 - Rak Sembako & Makanan</option>
                  <option value="Lorong 2 - Rak Minuman Dingin & Susu">Lorong 2 - Rak Minuman & Susu</option>
                  <option value="Lorong 3 - Rak Snack & Biskuit">Lorong 3 - Rak Snack & Biskuit</option>
                  <option value="Lorong 4 - Rak Personal Care">Lorong 4 - Rak Personal Care</option>
                  <option value="Gudang Belakang - Palet Transit">Gudang Belakang - Palet Transit</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                <button
                  type="button"
                  onClick={() => setScannedType('shelf_image')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    scannedType === 'shelf_image'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Foto Rak
                </button>
                <button
                  type="button"
                  onClick={() => setScannedType('video_stream')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    scannedType === 'video_stream'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Video Scan Rak
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Auditor: <strong className="text-slate-800 dark:text-slate-200">{activeEmployee?.name || 'Staf Gudang'}</strong>
            </div>
          </div>

          {/* Camera Viewfinder or Frame Gallery */}
          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-inner">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning visual overlay overlaying the video */}
              <div className="absolute inset-0 border-2 border-teal-400/40 pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 rounded-md bg-teal-600/90 text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Kamera AI Siap Memindai Rak
                  </span>
                  <span className="text-[10px] text-white/80 font-mono bg-black/50 px-2 py-0.5 rounded">
                    Area: {shelfArea}
                  </span>
                </div>
              </div>

              {/* Camera Actions */}
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 z-10">
                <button
                  onClick={handleStopCamera}
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl backdrop-blur-sm cursor-pointer"
                >
                  Batal
                </button>

                {scannedType === 'shelf_image' ? (
                  <button
                    onClick={handleCaptureSinglePhoto}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Jepret Foto Rak
                  </button>
                ) : (
                  <button
                    onClick={handleStartContinuousVideoSampling}
                    disabled={isCapturingVideo}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    {isCapturingVideo ? 'Merekam Frame Rak...' : 'Mulai Rekam Scan Video (3 Detik)'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Visual Capture Source */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/40">
                  {capturedFrames.length > 0 ? (
                    <div className="w-full space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {capturedFrames.map((frame, i) => (
                          <div
                            key={i}
                            className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <img src={frame} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] bg-black/70 text-white rounded font-mono">
                              Frame #{i + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>{capturedFrames.length} Gambar / Frame Siap Dianalisis</span>
                        <button
                          onClick={() => setCapturedFrames([])}
                          className="text-rose-500 hover:underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Ambil Foto Rak atau Rekam Video Singkat
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Arahkan kamera ke susunan produk di rak supermarket
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Buka Kamera Live
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Unggah Berkas
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDemoShelf}
                      className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold rounded-xl hover:bg-teal-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Contoh Foto Rak Demo
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-run-ai-stock-audit"
                  onClick={handleRunAiStockAudit}
                  disabled={capturedFrames.length === 0 || isProcessing}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gemini AI Sedang Menghitung Unit Barang di Rak...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Mulai Hitung Stok Fisik via AI (Audit Visual)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: AI Analysis Result */}
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>Hasil Rekonsiliasi Stok Fisik vs Sistem</span>
                  </h3>
                  {scanResult && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Selisih: {scanResult.totalDiscrepancy} Item
                    </span>
                  )}
                </div>

                {scanResult ? (
                  <div className="flex-1 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      {/* Detected Items List */}
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {scanResult.items.map((item, idx) => {
                          const hasDiff = item.difference !== 0;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                hasDiff
                                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {item.productName}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>Lokasi: {item.shelfLocation}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Kondisi: {item.condition || 'Baik'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <div className="text-[10px] text-slate-400">Sistem / Fisik:</div>
                                  <div className="font-mono font-bold text-xs">
                                    <span className="text-slate-500">{item.systemStock}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-teal-600 dark:text-teal-400 text-sm">
                                      {item.detectedCount}
                                    </span>
                                  </div>
                                </div>

                                {item.difference !== 0 ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      item.difference < 0
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                    }`}
                                  >
                                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Sesuai
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Observations */}
                      {scanResult.aiObservations && scanResult.aiObservations.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-800/50 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                          <span className="font-bold block flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-teal-500" />
                            Observasi Visual AI:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                            {scanResult.aiObservations.map((obs, i) => (
                              <li key={i}>{obs}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Apply Button */}
                    <button
                      type="button"
                      id="btn-apply-all-stock-corrections"
                      onClick={handleApplyAllStockCorrections}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sinkronkan Hasil Hitung Fisik ke Master Stok</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 bg-slate-50/50 dark:bg-slate-850/50">
                    <Layers className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">
                      Belum ada hasil audit. Ambil foto rak barang atau rekam video lalu klik tombol{' '}
                      <strong>"Mulai Hitung Stok Fisik via AI"</strong>.
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
