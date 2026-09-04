import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  ScanBarcode,
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { playScannerSound } from '../utils/scannerAudio';
import { Product } from '../types';

interface ScanFeedback {
  type: 'success' | 'error' | 'info';
  code: string;
  product?: Product;
  message: string;
  timestamp: number;
}

export const BarcodeScannerModal: React.FC = () => {
  const {
    isBarcodeScannerOpen,
    setIsBarcodeScannerOpen,
    scanBarcodeAndAddToCart,
    cart,
    finalTotal,
    settings,
    products,
  } = usePOS();

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [recentScans, setRecentScans] = useState<ScanFeedback[]>([]);
  const [lastFeedback, setLastFeedback] = useState<ScanFeedback | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const html5QrRegionId = 'pos-html5-barcode-scanner-region';
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const isProcessingRef = useRef(false);

  // Close scanner and cleanup
  const stopCameraStream = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping barcode scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
    setIsTorchOn(false);
    setHasTorchCapability(false);
  }, []);

  const handleClose = useCallback(async () => {
    await stopCameraStream();
    setIsBarcodeScannerOpen(false);
  }, [stopCameraStream, setIsBarcodeScannerOpen]);

  // Handle scanned barcode with debounce and automatic cart addition
  const handleBarcodeDetected = useCallback(
    (decodedText: string) => {
      const code = decodedText.trim();
      if (!code) return;

      const now = Date.now();
      // Debounce identical barcode within 1500ms, or different barcode within 400ms
      if (
        lastScannedCodeRef.current.code === code &&
        now - lastScannedCodeRef.current.time < 1600
      ) {
        return;
      }
      if (now - lastScannedCodeRef.current.time < 400) {
        return;
      }

      lastScannedCodeRef.current = { code, time: now };
      isProcessingRef.current = true;

      // Automatically add product to POS cart
      const result = scanBarcodeAndAddToCart(code);

      if (soundEnabled) {
        playScannerSound(result.success ? 'success' : 'error');
      }

      const feedback: ScanFeedback = {
        type: result.success ? 'success' : 'error',
        code,
        product: result.product,
        message: result.message,
        timestamp: now,
      };

      setLastFeedback(feedback);
      setRecentScans((prev) => [feedback, ...prev.slice(0, 4)]);

      // If continuous mode is disabled, auto close upon successful addition
      if (!continuousMode && result.success) {
        setTimeout(() => {
          handleClose();
        }, 600);
      }

      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    },
    [scanBarcodeAndAddToCart, soundEnabled, continuousMode, handleClose]
  );

  // Start the camera scanner
  const startCamera = useCallback(
    async (cameraIdToUse?: string) => {
      setCameraError(null);
      setIsStartingCamera(true);

      try {
        await stopCameraStream();

        // Get available camera devices
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setCameraError('Tidak ada kamera video yang terdeteksi di perangkat Anda.');
          setIsStartingCamera(false);
          return;
        }

        setAvailableCameras(devices);

        // Select camera: prefer back/environment camera or user specified
        let targetCameraId = cameraIdToUse;
        if (!targetCameraId) {
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('belakang')
          );
          targetCameraId = backCam ? backCam.id : devices[0].id;
        }

        setSelectedCameraId(targetCameraId);

        // Ensure container element exists in DOM
        const scannerElement = document.getElementById(html5QrRegionId);
        if (!scannerElement) {
          setIsStartingCamera(false);
          return;
        }

        const html5Qrcode = new Html5Qrcode(html5QrRegionId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });

        scannerRef.current = html5Qrcode;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333,
        };

        await html5Qrcode.start(
          targetCameraId,
          config,
          (decodedText) => {
            handleBarcodeDetected(decodedText);
          },
          () => {
            // Ignore scan parse frame misses
          }
        );

        setIsCameraActive(true);
        setIsStartingCamera(false);

        // Check torch support on the video track
        try {
          const videoElem = document.querySelector(`#${html5QrRegionId} video`) as HTMLVideoElement;
          if (videoElem && videoElem.srcObject) {
            const track = (videoElem.srcObject as MediaStream).getVideoTracks()[0];
            const capabilities = (track.getCapabilities?.() as any) || {};
            if (capabilities.torch) {
              setHasTorchCapability(true);
            }
          }
        } catch {
          // Torch check ignore
        }
      } catch (err: any) {
        console.error('Camera start error:', err);
        setIsStartingCamera(false);
        setIsCameraActive(false);

        const errorMsg = String(err?.message || err || '');
        if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
          setCameraError(
            'Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.'
          );
        } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('DevicesNotFoundError')) {
          setCameraError('Kamera tidak ditemukan pada perangkat Anda.');
        } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('TrackStartError')) {
          setCameraError('Kamera sedang digunakan oleh aplikasi lain atau tab browser lain.');
        } else {
          setCameraError(`Gagal mengakses kamera: ${errorMsg || 'Terjadi kesalahan sistem'}`);
        }
      }
    },
    [stopCameraStream, handleBarcodeDetected]
  );

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    try {
      const videoElem = document.querySelector(`#${html5QrRegionId} video`) as HTMLVideoElement;
      if (videoElem && videoElem.srcObject) {
        const track = (videoElem.srcObject as MediaStream).getVideoTracks()[0];
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      }
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Switch between cameras
  const switchCamera = (nextCamId: string) => {
    setSelectedCameraId(nextCamId);
    startCamera(nextCamId);
  };

  // Open / Close lifecycle
  useEffect(() => {
    if (isBarcodeScannerOpen) {
      // Small timeout to allow DOM element to render
      const timer = setTimeout(() => {
        startCamera();
      }, 150);

      // Handle ESC key to close
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        stopCameraStream();
      };
    } else {
      stopCameraStream();
    }
  }, [isBarcodeScannerOpen, startCamera, stopCameraStream, handleClose]);

  // Manual barcode submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  if (!isBarcodeScannerOpen) return null;

  // Curated demo test barcodes from actual store products
  const demoProducts = products.filter((p) => p.barcode).slice(0, 4);

  return (
    <div
      id="barcode-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="barcode-scanner-modal-content"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Scanner Barcode Kamera</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                  AUTO ADD
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Arahkan barcode barang ke bingkai kamera untuk masuk keranjang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                  : 'bg-slate-800/50 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Suara Kasir Aktif' : 'Suara Dimatikan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              id="btn-close-barcode-scanner"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Video Viewport Area */}
        <div className="relative w-full bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Container */}
          <div id={html5QrRegionId} className="w-full h-full object-cover"></div>

          {/* Reticle / Viewfinder Frame Overlay (Only visible when camera is active) */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Semi-transparent Dark Mask with Center Cutout */}
              <div className="relative w-64 h-44 sm:w-72 sm:h-48 border-2 border-emerald-500/80 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                {/* 4 Corner Accents */}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>

                {/* Laser Sweep Beam Animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-scanner-laser"></div>

                {/* Reticle Helper Text */}
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Arahkan Barcode Kemari
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loading / Starting State */}
          {isStartingCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 gap-3 z-10">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-semibold">Mengaktifkan kamera kasir...</p>
              <p className="text-[11px] text-slate-400 text-center max-w-xs px-4">
                Mohon izinkan akses kamera jika browser menampilkan konfirmasi izin.
              </p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-10">
              <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Gagal Mengakses Kamera</h4>
              <p className="text-xs text-rose-300/90 max-w-xs mb-4">{cameraError}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startCamera(selectedCameraId)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Feedback Toast on detected item */}
          {lastFeedback && (
            <div
              key={lastFeedback.timestamp}
              className={`absolute top-3 inset-x-3 z-20 p-2.5 rounded-xl border backdrop-blur-md shadow-lg transition-all animate-slide-down flex items-center justify-between gap-2 ${
                lastFeedback.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100'
                  : 'bg-rose-950/90 border-rose-500/60 text-rose-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {lastFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {lastFeedback.product ? lastFeedback.product.name : `Barcode: ${lastFeedback.code}`}
                  </p>
                  <p className="text-[10px] opacity-90 truncate">{lastFeedback.message}</p>
                </div>
              </div>

              {lastFeedback.product && (
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    +{formatCurrency(lastFeedback.product.price, settings.currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Controls Overlay on Camera View (Torch & Camera Switch) */}
          {isCameraActive && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
              {/* Torch Button if supported */}
              {hasTorchCapability && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-lg backdrop-blur-md border text-xs transition-colors cursor-pointer ${
                    isTorchOn
                      ? 'bg-amber-500/90 border-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'
                  }`}
                  title={isTorchOn ? 'Matikan Lampu' : 'Nyalakan Lampu'}
                >
                  {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              {/* Camera Switch if multiple detected */}
              {availableCameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-[11px] py-1.5 px-2.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  {availableCameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Current Cart Status Mini-Bar */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Isi Keranjang:{' '}
              <strong className="text-white">
                {cart.reduce((s, i) => s + i.quantity, 0)} item
              </strong>
            </span>
          </div>
          <div className="font-mono text-emerald-400 font-bold">
            Total: {formatCurrency(finalTotal, settings.currency)}
          </div>
        </div>

        {/* Controls & Manual Input Fallback */}
        <div className="p-3 space-y-3 bg-slate-900 overflow-y-auto max-h-56">
          {/* Continuous Mode Switcher */}
          <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded-xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-slate-300 font-medium">Mode Scan Beruntun (Continuous)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Manual Barcode Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik/paste barcode lalu tekan Enter..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Tambah
            </button>
          </form>

          {/* Quick Barcode Demo Test Buttons for Easy Desktop/Testing */}
          {demoProducts.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Uji Cepat Barcode Barang Toko</span>
                </span>
                <span className="text-[10px] text-slate-500">Klik untuk simulasikan scan</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {demoProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleBarcodeDetected(p.barcode)}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-[10px] text-emerald-400">{p.barcode}</span>
                    <span className="truncate max-w-[120px]">({p.name.split(' ')[0]})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Button */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-200">Esc</kbd>{' '}
            atau tombol selesai saat rampung.
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Selesai & Ke Kasir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
