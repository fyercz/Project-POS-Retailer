import { code128 } from './code128';
/**
 * High Precision SVG Barcode Generator (Code 128 Subset B/C & Code 39)
 * Pure TypeScript, lightweight, pixel-crisp for A4/F4 price tags & thermal printers.
 */

// Code 128 pattern table (107 patterns, each pattern is 11 modules wide, stop pattern is 13 modules)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=StartB, 106=Stop)
];

const START_B_INDEX = 104;
const STOP_INDEX = 106;

/**
 * Encode ASCII text to Code 128 Pattern
 */
function encodeCode128(text: string): number[] {
  const clean = text.replace(/[^\x20-\x7E]/g, '') || '000000';
  const indices: number[] = [START_B_INDEX];

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    indices.push(charCode - 32);
  }

  // Calculate checksum
  let checksum = indices[0];
  for (let i = 1; i < indices.length; i++) {
    checksum += indices[i] * i;
  }
  indices.push(checksum % 103);
  indices.push(STOP_INDEX);

  return indices;
}

export interface BarcodeOptions {
  height?: number;
  barWidth?: number;
  showText?: boolean;
  textColor?: string;
  fontSize?: number;
  quietZone?: number;
}

/**
 * Generate standard SVG string for Code 128 barcode
 */
export function generateBarcodeSvgString(
  text: string,
  options: BarcodeOptions = {}
): string {
  const rawText = String(text || '000000').trim();
  const height = options.height || 40;
  const barWidth = options.barWidth || 1.4;
  const showText = options.showText ?? true;
  const fontSize = options.fontSize || 10;
  // Zona kosong minimal 10 MODUL di kiri-kanan (spesifikasi Code 128); nilai px lebih kecil dinaikkan
  const quietZone = Math.max(options.quietZone ?? 0, 10 * barWidth);

  // Code 128 dengan mode C otomatis untuk deret angka (src/utils/code128.ts, terverifikasi terhadap
  // python-barcode & pemindai ZXing). Dulu selalu mode B: EAN 13 digit = 178 modul -> kini ~123.
  let modules: string;
  try {
    modules = code128(rawText);
  } catch {
    modules = code128(rawText.replace(/[^\x20-\x7e]/g, ''));
  }
  const barElements: { x: number; width: number }[] = [];
  let currentX = quietZone;
  for (let i = 0; i < modules.length; ) {
    let j = i;
    while (j < modules.length && modules[j] === modules[i]) j++;
    if (modules[i] === '1') barElements.push({ x: currentX, width: (j - i) * barWidth });
    currentX += (j - i) * barWidth;
    i = j;
  }

  const totalWidth = currentX + quietZone;
  const totalHeight = showText ? height + fontSize + 4 : height;

  const rects = barElements
    .map((b) => `<rect x="${b.x.toFixed(2)}" y="0" width="${b.width.toFixed(2)}" height="${height}" fill="#000000" />`)
    .join('');

  const textElement = showText
    ? `<text x="${(totalWidth / 2).toFixed(2)}" y="${(height + fontSize).toFixed(2)}" font-family="monospace" font-size="${fontSize}px" font-weight="bold" fill="${options.textColor || '#000000'}" text-anchor="middle" letter-spacing="1.5px">${rawText}</text>`
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="${totalHeight}" style="max-height: ${totalHeight}px; display: block; margin: 0 auto;">
      ${rects}
      ${textElement}
    </svg>
  `.trim();
}
