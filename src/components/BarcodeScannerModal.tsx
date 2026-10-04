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
  ExternalLink,
  Info,
  Copy,
  Check,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { usePOS } from '../context/POSContext';
import { formatCurrency } from '../utils/formatters';
import { playScannerSound } from '../utils/scannerAudio';
import { Product } from '../types';
import {
  CameraErrorInfo,
  getCameraErrorMessage,
  isAndroidDevice,
  isRunningInIframe,
  isSecureContextEnvironment,
  getChromeFlagsInstructions,
} from '../utils/cameraHelper';
import { decodeBarcodeFromPhoto } from '../utils/barcodePhotoDecoder';

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
    openUnregisteredBarcodePrompt,
    cart,
    finalTotal,
    settings,
    products,
  } = usePOS();

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorDetails, setCameraErrorDetails] = useState<CameraErrorInfo | null>(null);
  const [showTroubleshootHelp, setShowTroubleshootHelp] = useState(false);
  const [showFlagsGuide, setShowFlagsGuide] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
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
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const html5QrRegionId = 'pos-html5-barcode-scanner-region';
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const isProcessingRef = useRef(false);

  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';

  const flagsInstructions = getChromeFlagsInstructions(currentOrigin);
  const isSecure = isSecureContextEnvironment();
  const isAndroid = isAndroidDevice();

  const copyToClipboard = (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

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

      // If product not found in store database, prompt to add product with higher authority
      if (!result.success) {
        openUnregisteredBarcodePrompt(code);
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
    [scanBarcodeAndAddToCart, openUnregisteredBarcodePrompt, soundEnabled, continuousMode, handleClose]
  );

  // Start the camera scanner with Android resilience
  const startCamera = useCallback(
    async (cameraIdToUse?: string) => {
      setCameraError(null);
      setCameraErrorDetails(null);
      setIsStartingCamera(true);

      // Check for Insecure Context on Android (e.g. http://192.168.x.x:3000)
      // On non-secure contexts, Chrome disables getUserMedia entirely and suppresses the permission prompt!
      if (!isSecureContextEnvironment() && isAndroidDevice()) {
        await stopCameraStream();
        setIsStartingCamera(false);
        setIsCameraActive(false);
        const errInfo = getCameraErrorMessage(new Error('Insecure Context'));
        setCameraError(errInfo.message);
        setCameraErrorDetails(errInfo);
        setShowTroubleshootHelp(true);
        setShowFlagsGuide(true);
        return;
      }

      try {
        await stopCameraStream();

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

        // Dynamic responsive qrbox to avoid OverconstrainedError on Android portrait screens
        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.max(200, Math.min(Math.floor(minEdge * 0.85), 320));
            const boxHeight = Math.max(130, Math.min(Math.floor(boxWidth * 0.65), 220));
            return { width: boxWidth, height: boxHeight };
          },
        };

        if (cameraIdToUse) {
          await html5Qrcode.start(
            cameraIdToUse,
            config,
            (decodedText) => handleBarcodeDetected(decodedText),
            () => {}
          );
          setSelectedCameraId(cameraIdToUse);
        } else {
          try {
            // First attempt: back/environment camera
            await html5Qrcode.start(
              { facingMode: 'environment' },
              config,
              (decodedText) => handleBarcodeDetected(decodedText),
              () => {}
            );
          } catch (envErr) {
            console.warn('Back camera start failed, trying user camera fallback:', envErr);
            // Fallback: any available camera / front camera
            await html5Qrcode.start(
              { facingMode: 'user' },
              config,
              (decodedText) => handleBarcodeDetected(decodedText),
              () => {}
            );
          }
        }

        setIsCameraActive(true);
        setIsStartingCamera(false);

        // Fix video element attributes for mobile Android & iOS (playsinline & muted required for reliable autoplay)
        try {
          const videoElem = document.querySelector(`#${html5QrRegionId} video`) as HTMLVideoElement;
          if (videoElem) {
            videoElem.setAttribute('playsinline', 'true');
            videoElem.setAttribute('webkit-playsinline', 'true');
            videoElem.muted = true;
            videoElem.play().catch(() => {});
          }
        } catch {}

        // Query available cameras for selector dropdown once permission is granted
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            if (!cameraIdToUse) {
              const backCam = devices.find(
                (d) =>
                  d.label.toLowerCase().includes('back') ||
                  d.label.toLowerCase().includes('rear') ||
                  d.label.toLowerCase().includes('environment') ||
                  d.label.toLowerCase().includes('belakang')
              );
              setSelectedCameraId(backCam ? backCam.id : devices[0].id);
            }
          }
        } catch {}

        // Check torch capability
        try {
          const videoElem = document.querySelector(`#${html5QrRegionId} video`) as HTMLVideoElement;
          if (videoElem && videoElem.srcObject) {
            const track = (videoElem.srcObject as MediaStream).getVideoTracks()[0];
            const capabilities = (track.getCapabilities?.() as any) || {};
            if (capabilities.torch) {
              setHasTorchCapability(true);
            }
          }
        } catch {}
      } catch (err: any) {
        console.error('Camera start error:', err);
        setIsStartingCamera(false);
        setIsCameraActive(false);

        const errorInfo = getCameraErrorMessage(err);
        setCameraError(errorInfo.message);
        setCameraErrorDetails(errorInfo);
        if (errorInfo.isPermissionDenied || isAndroidDevice() || errorInfo.isInsecureContext) {
          setShowTroubleshootHelp(true);
        }
      }
    },
    [stopCameraStream, handleBarcodeDetected]
  );

  // Native Android camera / photo capture fallback via file input (works 100% on HTTP & Insecure Contexts!)
  const handleNativeCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningPhoto(true);
      setCameraError(null);

      const decodedText = await decodeBarcodeFromPhoto(
        file,
        scannerRef.current,
        html5QrRegionId
      );

      if (decodedText) {
        handleBarcodeDetected(decodedText);
      } else {
        setCameraError(
          'Barcode tidak terbaca jelas pada foto. Dekatkan kamera HP (10-15 cm) agar garis barcode tajam dan cukup terang, atau gunakan input teks manual.'
        );
        setCameraErrorDetails({
          title: 'Barcode Tidak Terbaca dari Foto',
          message:
            'Garis barcode tidak terbaca jelas. Pastikan foto tidak buram atau gunakan input manual di bawah.',
          isPermissionDenied: false,
          isIframeIssue: false,
          isInsecureContext: !isSecureContextEnvironment(),
          actionType: 'native_capture',
        });
      }
    } catch (err: any) {
      console.warn('Barcode photo scan failed:', err);
      setCameraError('Gagal memproses foto barcode.');
    } finally {
      setIsScanningPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

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
      const timer = setTimeout(() => {
        startCamera();
      }, 150);

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
                <span>Scanner Barcode Kasir</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                  AUTO ADD
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pindai barcode barang fisik untuk otomatis masuk ke keranjang belanja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) {
                  playScannerSound('success', { volume: 0.08 });
                }
              }}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                  : 'bg-slate-800/50 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Suara Chirp Kasir Aktif (Berhasil & Gagal)' : 'Suara Dimatikan'}
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
        <div className="relative w-full bg-black min-h-[220px] aspect-4/3 flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Container */}
          <div id={html5QrRegionId} className="w-full h-full object-cover"></div>

          {/* Reticle / Viewfinder Frame Overlay (Only visible when camera stream is active) */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
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
                Mohon tunggu atau izinkan akses kamera jika diminta browser.
              </p>
            </div>
          )}

          {/* Dedicated Insecure Context & Android Camera Troubleshooting Screen */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-start bg-slate-950/95 p-4 text-center z-10 overflow-y-auto">
              <div className="w-full max-w-md mx-auto my-auto space-y-3 pt-2 pb-4">
                {/* Error Header Icon */}
                <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {cameraErrorDetails?.isInsecureContext ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">
                    {cameraErrorDetails?.title || 'Kamera Belum Dapat Dinyalakan'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed px-2">
                    {cameraError}
                  </p>
                </div>

                {/* Primary Action Button: Native Camera Direct Capture */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    disabled={isScanningPhoto}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {isScanningPhoto
                        ? 'Sedang Memproses Foto Barcode...'
                        : '📸 Buka Kamera HP (Langsung Scan Tanpa Perlu HTTPS)'}
                    </span>
                  </button>
                  <p className="text-[11px] text-emerald-400/90 leading-tight">
                    ✓ Rekomendasi Tercepat: Buka kamera HP langsung &amp; produk otomatis masuk keranjang!
                  </p>
                </div>

                {/* Secondary Actions */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startCamera(selectedCameraId)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Coba Nyalakan Lagi</span>
                  </button>

                  {cameraErrorDetails?.isIframeIssue && (
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      <span>Buka di Tab Baru</span>
                    </button>
                  )}
                </div>

                {/* Android Chrome Flags Interactive Guide (For Users who want continuous live stream on HTTP LAN) */}
                {cameraErrorDetails?.isInsecureContext && (
                  <div className="pt-2 text-left">
                    <button
                      type="button"
                      onClick={() => setShowFlagsGuide(!showFlagsGuide)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs text-slate-300 font-semibold cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2 text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Cara Mengaktifkan Live Video Stream di Chrome Android</span>
                      </span>
                      {showFlagsGuide ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showFlagsGuide && (
                      <div className="mt-2 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-2.5">
                        <p className="text-slate-300 leading-snug">
                          Karena Anda membuka kasir via alamat IP lokal HTTP (bukan HTTPS), Chrome menyembunyikan izin kamera. Ikuti 3 langkah 1-menit ini untuk membukanya:
                        </p>

                        <div className="space-y-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          {/* Step 1: Copy URL */}
                          <div className="space-y-1">
                            <span className="font-semibold text-white">1. Salin Alamat Kasir Ini:</span>
                            <div className="flex items-center gap-1.5">
                              <code className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono select-all truncate">
                                {flagsInstructions.targetOrigin}
                              </code>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(flagsInstructions.targetOrigin, 'origin')
                                }
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-white font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                {copiedText === 'origin' ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedText === 'origin' ? 'Tersalin' : 'Salin URL'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Step 2: Copy Flags URL */}
                          <div className="space-y-1 pt-1">
                            <span className="font-semibold text-white">2. Buka Tab Baru Chrome &amp; Ketik:</span>
                            <div className="flex items-center gap-1.5">
                              <code className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300 font-mono select-all truncate">
                                {flagsInstructions.flagsUrl}
                              </code>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(flagsInstructions.flagsUrl, 'flags')
                                }
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-white font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                {copiedText === 'flags' ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedText === 'flags' ? 'Tersalin' : 'Salin Flag'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Step 3: Enable & Relaunch */}
                          <div className="space-y-0.5 pt-1 text-slate-300">
                            <span className="font-semibold text-white">3. Tempel URL Kasir, Pilih "Enabled", lalu Relaunch:</span>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              Tempel URL kasir ke kotak teks Chrome Flags, ubah menu menjadi <strong>Enabled</strong>, lalu ketuk tombol biru <strong>Relaunch</strong> di pojok kanan bawah Chrome.
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 text-center">
                          <button
                            type="button"
                            onClick={() => startCamera(selectedCameraId)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Sudah Relaunch? Uji Coba Nyalakan Live Kamera</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard HTTPS Permission Guidance if not insecure context */}
                {!cameraErrorDetails?.isInsecureContext && (
                  <div className="w-full text-left pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTroubleshootHelp(!showTroubleshootHelp)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 mx-auto underline cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {showTroubleshootHelp
                          ? 'Sembunyikan Panduan Izin'
                          : 'Panduan Mengizinkan Akses Kamera di Browser'}
                      </span>
                    </button>

                    {showTroubleshootHelp && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                        <p className="font-semibold text-white text-xs">
                          Langkah di Google Chrome / Browser HP:
                        </p>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                          <li>
                            Ketuk ikon <strong>Gembok (🔒)</strong> atau ikon setelan di sebelah kiri kolom URL browser.
                          </li>
                          <li>
                            Pilih menu <strong>Izin situs (Permissions)</strong>.
                          </li>
                          <li>
                            Ubah status <strong>Kamera</strong> menjadi <strong>Izinkan (Allow)</strong>.
                          </li>
                          <li>
                            Tutup tab lain yang sedang memakai kamera, lalu ketuk tombol{' '}
                            <strong>Coba Nyalakan Lagi</strong>.
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
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

              {lastFeedback.product ? (
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    +{formatCurrency(lastFeedback.product.price, settings.currency)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openUnregisteredBarcodePrompt(lastFeedback.code)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 flex items-center gap-1 shadow cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Produk</span>
                </button>
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

          {/* Hidden file input with capture="environment" for native Android camera intent */}
          <input
            type="file"
            ref={nativeCameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleNativeCameraScan}
            className="hidden"
          />

          {/* Quick Camera Snapshot Fallback Button for Android/Mobile */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              disabled={isScanningPhoto}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-teal-400" />
              <span>
                {isScanningPhoto
                  ? 'Sedang Membaca Barcode...'
                  : 'Ambil Foto Barcode (Kamera HP Android)'}
              </span>
            </button>
          </div>

          {/* Manual Barcode Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik/paste nomor barcode..."
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
            <span>Selesai &amp; Ke Kasir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
