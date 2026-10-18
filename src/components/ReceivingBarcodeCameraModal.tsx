import React, { useEffect, useState, useRef } from 'react';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2, ScanBarcode } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { errorMessage } from '../utils/errors';

interface ReceivingBarcodeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const ReceivingBarcodeCameraModal: React.FC<ReceivingBarcodeCameraModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastCodeTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const scannerElementId = 'receiving-barcode-scanner-view';

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        const html5QrCode = new Html5Qrcode(scannerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.333333,
          },
          (decodedText) => {
            if (!isMounted) return;
            const now = Date.now();
            // Debounce duplicate scans within 1.5 seconds
            if (
              lastCodeTimeRef.current.code === decodedText &&
              now - lastCodeTimeRef.current.time < 1500
            ) {
              return;
            }

            lastCodeTimeRef.current = { code: decodedText, time: now };
            setLastScanned(decodedText);
            onScan(decodedText);
          },
          () => {
            // Ignore frame-by-frame non-matching scans
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.warn('[ReceivingScanner] Gagal membuka kamera:', err);
        setCameraError(
          errorMessage(err) || 'Izin kamera ditolak atau kamera tidak tersedia di perangkat ini.'
        );
        setIsScanning(false);
      }
    };

    // Small delay to ensure modal DOM container is fully mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear();
          html5QrCodeRef.current = null;
        });
      }
    };
  }, [isOpen, onScan]);

  const handleClose = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
    }
    html5QrCodeRef.current = null;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Scan Barcode Penerimaan Barang
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Arahkan kamera ke barcode produk supplier
              </p>
            </div>
          </div>
          <button aria-label="Tutup"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera View Area */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] relative">
          <div
            id="receiving-barcode-scanner-view"
            className="w-full max-w-xs overflow-hidden rounded-xl border-2 border-emerald-500/50"
          />

          {cameraError && (
            <div role="alert" className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs text-center space-y-2 max-w-xs">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="font-semibold">{cameraError}</p>
              <p className="text-[11px] text-rose-300">
                Gunakan scanner barcode fisik (USB/Bluetooth) atau ketik barcode secara manual di kolom input faktur.
              </p>
            </div>
          )}

          {lastScanned && !cameraError && (
            <div className="absolute bottom-6 px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Barcode Terbaca: {lastScanned}</span>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            Setiap barcode yang terbaca akan otomatis menambah 1 baris barang baru.
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition shadow-sm"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
