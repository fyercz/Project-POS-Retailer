import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Resizes an image file if it exceeds maximum dimensions.
 * Mobile Android cameras often generate 12MP - 50MP images (4000x3000+),
 * which can cause ZXing/Wasm decoders to fail or timeout.
 * Downscaling to max 1280px dramatically improves barcode detection speed and accuracy.
 */
async function getOptimizedImageFile(file: File, maxDimension = 1280): Promise<File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;

      // If already within reasonable bounds, return original file
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      let targetWidth = width;
      let targetHeight = height;

      if (width > height) {
        if (width > maxDimension) {
          targetHeight = Math.round((height * maxDimension) / width);
          targetWidth = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          targetWidth = Math.round((width * maxDimension) / height);
          targetHeight = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw and slightly sharpen/enhance for barcode readability
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name || 'barcode.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Detects barcodes from an image file using Native BarcodeDetector API (Android Chrome 83+)
 * with fallback to Html5Qrcode.
 */
export async function decodeBarcodeFromPhoto(
  file: File,
  existingScannerInstance?: Html5Qrcode | null,
  html5QrContainerId = 'pos-html5-barcode-scanner-region'
): Promise<string | null> {
  if (!file) return null;

  // 1. Fast Native BarcodeDetector API if available in browser (Modern Chrome on Android)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorClass({
        formats: [
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'upc_a',
          'upc_e',
          'qr_code',
          'itf',
          'data_matrix',
        ],
      });

      let imageSource: ImageBitmap | HTMLImageElement | null = null;
      if (typeof createImageBitmap === 'function') {
        imageSource = await createImageBitmap(file);
      }

      if (imageSource) {
        const barcodes = await detector.detect(imageSource);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue.trim();
          if (raw) return raw;
        }
      }
    } catch (nativeErr) {
      console.warn('Native BarcodeDetector pass skipped:', nativeErr);
    }
  }

  // 2. Html5Qrcode standard scan pass
  let scanner = existingScannerInstance;
  let createdTempScanner = false;

  if (!scanner) {
    // Ensure container exists
    let container = document.getElementById(html5QrContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = html5QrContainerId;
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    scanner = new Html5Qrcode(html5QrContainerId, {
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
    createdTempScanner = true;
  }

  try {
    // First try original file
    try {
      const decoded = await scanner.scanFile(file, false);
      if (decoded && decoded.trim()) {
        return decoded.trim();
      }
    } catch {
      // If direct scan fails (often due to huge resolution), try optimized/downscaled version
      const optimizedFile = await getOptimizedImageFile(file, 1280);
      const decodedOptimized = await scanner.scanFile(optimizedFile, false);
      if (decodedOptimized && decodedOptimized.trim()) {
        return decodedOptimized.trim();
      }
    }
  } catch (err) {
    console.warn('Html5Qrcode scanFile failed:', err);
  } finally {
    if (createdTempScanner && scanner) {
      try {
        await scanner.clear();
      } catch {}
    }
  }

  return null;
}
