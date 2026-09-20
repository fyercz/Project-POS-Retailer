/**
 * Client-Side Image Compression & OCR Enhancement Utility for Gemini AI
 * Prevents 413 Payload Too Large and multi-megabyte camera uploads by
 * compressing photos down to high-clarity, token-efficient lightweight JPEGs (<400KB).
 */

export interface CompressionOptions {
  maxDimension?: number; // default 1600px (crystal clear for OCR text)
  maxWidth?: number; // alias for maxDimension
  maxHeight?: number; // alias for maxDimension
  quality?: number; // default 0.85
  targetMaxKb?: number; // target maximum size in KB (e.g., 450KB)
  enhanceOcrContrast?: boolean; // enhance contrast for faded thermal/dot-matrix receipts
}

export interface CompressionResult {
  dataUrl: string; // full data:image/jpeg;base64,...
  base64Raw: string; // raw base64 string without data prefix
  mimeType: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  savedPercent: number;
  width: number;
  height: number;
}

export type CompressedImageResult = CompressionResult;

/**
 * Helper to format bytes into readable KB / MB
 */
export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Load an image from File or Data URL safely
 */
const loadImage = (source: File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Gagal memuat gambar untuk dikompresi: ' + String(err)));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(source);
    }
  });
};

/**
 * Compress an image down for fast, lightweight AI processing
 */
export const compressImageForAI = async (
  source: File | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const effectiveMaxDim = options.maxDimension || options.maxWidth || options.maxHeight || 1600;
  const {
    quality = 0.85,
    targetMaxKb = 450,
    enhanceOcrContrast = false,
  } = options;

  // Calculate approximate original size
  let originalSizeBytes = 0;
  if (source instanceof File) {
    originalSizeBytes = source.size;
  } else if (typeof source === 'string') {
    originalSizeBytes = Math.round(source.length * 0.75);
  }
  const originalSizeKb = Math.round(originalSizeBytes / 1024);

  const img = await loadImage(source);

  // Compute aspect ratio scaling
  let { width, height } = img;
  if (width > effectiveMaxDim || height > effectiveMaxDim) {
    if (width > height) {
      height = Math.round((height * effectiveMaxDim) / width);
      width = effectiveMaxDim;
    } else {
      width = Math.round((width * effectiveMaxDim) / height);
      height = effectiveMaxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia pada browser.');
  }

  // Draw image with smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Optional OCR Contrast Enhancement for faded paper or thermal receipts
  if (enhanceOcrContrast) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const contrast = 1.25; // 25% contrast boost
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128; // Red
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Ignore filter error if tainted
    }
  }

  // Encode with progressive quality step-down if needed
  let currentQuality = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
  let compressedSizeKb = Math.round((dataUrl.length * 0.75) / 1024);

  // If still exceeds target max KB, gently step down quality once or twice
  while (compressedSizeKb > targetMaxKb && currentQuality > 0.55) {
    currentQuality -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
    compressedSizeKb = Math.round((dataUrl.length * 0.75) / 1024);
  }

  const base64Raw = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const compressedSizeBytes = Math.round(dataUrl.length * 0.75);
  const finalOrigBytes = Math.max(originalSizeBytes, compressedSizeBytes);
  const compressionRatio = finalOrigBytes > 0
    ? (finalOrigBytes - compressedSizeBytes) / finalOrigBytes
    : 0;
  const savedPercent = Math.max(0, Math.round(compressionRatio * 100));

  return {
    dataUrl,
    base64Raw,
    mimeType: 'image/jpeg',
    originalSizeKb: Math.max(originalSizeKb, compressedSizeKb),
    compressedSizeKb,
    originalSizeBytes: finalOrigBytes,
    compressedSizeBytes,
    compressionRatio,
    savedPercent,
    width,
    height,
  };
};
