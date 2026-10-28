import QRCode from 'qrcode';
import { Product } from '../types';
import { formatCurrency, formatDate } from './formatters';
import { generateBarcodeSvgString } from './barcodeGenerator';
import { escapeHtml, escapeTextFields } from './escapeHtml';

export interface LastPriceUpdateInfo {
  formattedDate: string;
  formattedDateTime: string;
  isoString: string;
  previousPrice?: number;
  priceDiff?: number;
  priceDiffPercent?: number;
  changeType?: string;
  changeTypeLabel?: string;
  notes?: string;
  daysAgo: number;
  isRecent: boolean;
}

/**
 * Generate SVG string of a QR Code asynchronously
 */
export async function generateQrSvgString(
  text: string,
  options?: {
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  try {
    const svgStr = await QRCode.toString(text, {
      type: 'svg',
      margin: options?.margin ?? 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: options?.darkColor || '#000000',
        light: options?.lightColor || '#ffffff',
      },
    });
    return svgStr;
  } catch (err) {
    console.error('Error generating QR code SVG:', err);
    // Fallback simple SVG representation
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="#f1f5f9"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="#64748b">QR Error</text></svg>`;
  }
}

/**
 * Returns dynamic URL pointing to the real-time shelf inventory & price verification view
 */
// Alamat dasar QR label rak yang dipakai saat ini (diatur jendela label QR; lihat resolveShelfBase)
let shelfBaseOverride: string | null = null;
export function setShelfQrBase(base: string | null): void {
  shelfBaseOverride = base ? base.replace(/\/+$/, '') : null;
}

const LOCAL_HOSTS = /^(localhost|127(?:\.\d+){3}|\[?::1\]?|0\.0\.0\.0)$/i;

/**
 * Alamat dasar untuk QR label rak (murni, teruji). QR dipindai dari HP, jadi alamatnya harus bisa
 * dijangkau dari jaringan toko. Dulu selalu alamat browser: di PC kasir yang dibuka lewat
 * MULAI-KASIR.bat itu 'localhost' -> QR tidak bisa dibuka dari HP mana pun.
 */
export function resolveShelfBase(
  origin: string,
  hostname: string,
  lanStatus?: { recommendedUrl?: string; localIps?: string[] } | null
): { base: string; warning?: string } {
  if (!LOCAL_HOSTS.test(hostname)) return { base: origin };
  const rec = lanStatus?.recommendedUrl || '';
  let recHost = '';
  try {
    recHost = rec ? new URL(rec).hostname : '';
  } catch {
    recHost = '';
  }
  if (rec && recHost && !LOCAL_HOSTS.test(recHost)) return { base: rec.replace(/\/+$/, '') };
  return {
    base: origin,
    warning:
      'PC ini belum terhubung ke jaringan (Wi-Fi/LAN): QR akan berisi alamat localhost dan TIDAK bisa dibuka dari HP. Sambungkan PC ke jaringan toko lalu buka ulang jendela ini.',
  };
}

export function getDynamicShelfUrl(productId: string): string {
  if (shelfBaseOverride) return `${shelfBaseOverride}/?shelf=${encodeURIComponent(productId)}`;
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/$/, '');
    return `${origin}${pathname}/?shelf=${encodeURIComponent(productId)}`;
  }
  return `https://pos-retail.app/?shelf=${encodeURIComponent(productId)}`;
}

/**
 * Extracts and calculates the last price update date and contextual info
 */
export function getLastPriceUpdateInfo(product: Product): LastPriceUpdateInfo {
  // Dulu tanggal tetap '2026-10-01' bila tidak ada riwayat: label mencetak tanggal yang tidak pernah
  // terjadi. Kini: riwayat harga -> tanggal penerimaan -> tanggal impor -> tanpa tanggal.
  let targetDate: string | null = null;
  let previousPrice: number | undefined = undefined;
  let changeType: string | undefined = undefined;
  let notes: string | undefined = undefined;

  if (product.priceHistory && product.priceHistory.length > 0) {
    // Sort descending by date
    const sorted = [...product.priceHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const newest = sorted[0];
    targetDate = newest.date;
    previousPrice = newest.previousSellingPrice;
    changeType = newest.changeType;
    notes = newest.notes;
  } else if (product.lastOrderDate) {
    targetDate = product.lastOrderDate;
    changeType = 'purchase_receiving';
    notes = 'Penerimaan Stok Pertama';
  } else if (product.importedAt) {
    targetDate = product.importedAt;
    notes = 'Data impor';
  }

  if (!targetDate || Number.isNaN(new Date(targetDate).getTime())) {
    return { formattedDate: '', formattedDateTime: '', isoString: '', daysAgo: undefined, isRecent: false } as unknown as LastPriceUpdateInfo;
  }
  const d = new Date(targetDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isRecent = daysAgo <= 7;

  let changeTypeLabel = 'Penyesuaian Katalog';
  if (changeType === 'bulk_adjust') changeTypeLabel = 'Optimasi AI Dinamis';
  else if (changeType === 'purchase_receiving') changeTypeLabel = 'Faktur Pembelian Baru';
  else if (changeType === 'promotion') changeTypeLabel = 'Promo Khusus';
  else if (changeType === 'manual_update') changeTypeLabel = 'Update Manual';

  // Format short date
  const formattedDate = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedDateTime = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  let priceDiff: number | undefined = undefined;
  let priceDiffPercent: number | undefined = undefined;
  if (previousPrice && previousPrice > 0) {
    priceDiff = product.price - previousPrice;
    priceDiffPercent = Math.round(((product.price - previousPrice) / previousPrice) * 100);
  }

  return {
    formattedDate,
    formattedDateTime,
    isoString: targetDate,
    previousPrice,
    priceDiff,
    priceDiffPercent,
    changeType,
    changeTypeLabel,
    notes,
    daysAgo,
    isRecent,
  };
}

export type QRShelfTagPreset =
  | 'gondola_standard_60x40' // 60mm x 40mm retail shelf talker (standard)
  | 'compact_strip_50x30'    // 50mm x 30mm compact shelf rail tag
  | 'thermal_roll_58mm'      // Continuous 58mm thermal sticker roll
  | 'thermal_roll_80mm'      // Continuous 80mm thermal sticker roll
  | 'sheet_a4_3x8';          // A4 Sticker Paper Sheet (24 labels: 3 col x 8 row)

export interface QRShelfTagOptions {
  preset: QRShelfTagPreset;
  showStoreHeader: boolean;
  showQrCode: boolean;
  showBarcode: boolean;
  showLastPriceUpdate: boolean;
  showStockLevel: boolean;
  showAisleLocation: boolean;
  showUnit: boolean;
  showCutLines: boolean;
  qrSize: 'compact' | 'standard' | 'prominent';
  storeName?: string;
  branchName?: string;
  customPromoBadge?: string;
}

/**
 * Pre-generate QR SVGs for a batch of products
 */
export async function prepareProductQrSvgs(
  products: Product[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const product of products) {
    if (!result[product.id]) {
      const url = getDynamicShelfUrl(product.id);
      result[product.id] = await generateQrSvgString(url, { margin: 1 });
    }
  }
  return result;
}

/**
 * Generates single label HTML for print or preview
 */
export function generateSingleQrShelfLabelHtml(
  product: Product,
  qrSvg: string,
  options: QRShelfTagOptions,
  currency: string = 'IDR'
): string {
  const priceUpdate = getLastPriceUpdateInfo(product);
  const formattedPrice = formatCurrency(product.price, currency);
  const barcodeSvg = options.showBarcode
    ? generateBarcodeSvgString(product.barcode || product.sku, {
        height: 22,
        barWidth: 1.1,
        showText: false,
      })
    : '';

  const borderStyle = options.showCutLines ? '1px dashed #94a3b8' : '1px solid #e2e8f0';
  // Teks dari data di-escape sebelum masuk HTML (cegah XSS). barcodeSvg & qrSvg dibuat dari data mentah di atas.
  product = escapeTextFields(product);
  options = { ...options, storeName: escapeHtml(options.storeName), branchName: options.branchName ? escapeHtml(options.branchName) : options.branchName, customPromoBadge: options.customPromoBadge ? escapeHtml(options.customPromoBadge) : options.customPromoBadge };

  // Stock status badge
  let stockBadgeColor = '#059669';
  let stockBadgeBg = '#ecfdf5';
  let stockText = `${product.stock} ${product.unit || 'pcs'}`;
  if (product.stock <= 0) {
    stockBadgeColor = '#e11d48';
    stockBadgeBg = '#fff1f2';
    stockText = 'Habis';
  } else if (product.stock <= product.minStock) {
    stockBadgeColor = '#d97706';
    stockBadgeBg = '#fffbeb';
    stockText = `Sisa ${product.stock}`;
  }

  // QR dimensions based on size setting
  let qrDimension = '54px';
  if (options.qrSize === 'compact') qrDimension = '44px';
  if (options.qrSize === 'prominent') qrDimension = '68px';

  // Standard Gondola Talker (60x40mm)
  if (options.preset === 'gondola_standard_60x40' || options.preset === 'sheet_a4_3x8') {
    return `
      <div style="box-sizing: border-box; width: 100%; height: 100%; padding: 4.5px; border: ${borderStyle}; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative;">
        <!-- Header Bar -->
        ${
          options.showStoreHeader
            ? `
          <div style="background: #0f172a; color: #ffffff; padding: 2px 4px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; font-weight: 800; text-transform: uppercase; border-radius: 2px; line-height: 1;">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${options.storeName || 'ULILMART MAGETAN'}</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              ${options.showAisleLocation && product.aisle ? `<span style="background: #2563eb; color: #ffffff; padding: 0.5px 3px; border-radius: 2px; font-size: 6.5px;">${product.aisle}</span>` : ''}
              ${options.customPromoBadge ? `<span style="background: #e11d48; color: #ffffff; padding: 0.5px 3px; border-radius: 2px; font-size: 6.5px;">${options.customPromoBadge}</span>` : ''}
            </div>
          </div>`
            : ''
        }

        <!-- Product Name & Brand -->
        <div style="margin-top: 2px;">
          <div style="font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${product.brand ? product.brand.toUpperCase() : 'PRODUK'} &bull; SKU: ${product.sku}
          </div>
          <div style="font-size: 10.5px; font-weight: 900; color: #0f172a; line-height: 1.15; max-height: 25px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${product.name}
          </div>
        </div>

        <!-- Main Body: QR Code & Price Layout -->
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 4px; margin-top: 2px; border-top: 1px dashed #e2e8f0; padding-top: 2px;">
          <!-- Left: Dynamic QR Code with Real-Time Scan Hint -->
          ${
            options.showQrCode
              ? `
            <div style="display: flex; flex-direction: column; align-items: center; width: ${qrDimension}; shrink: 0;">
              <div style="width: ${qrDimension}; height: ${qrDimension}; display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 1px; border: 1px solid #cbd5e1; border-radius: 3px;">
                ${qrSvg}
              </div>
              <div style="font-size: 5.5px; font-weight: 800; color: #2563eb; text-align: center; line-height: 1; margin-top: 1.5px; letter-spacing: -0.2px;">
                SCAN CEK STOK
              </div>
            </div>`
              : ''
          }

          <!-- Right: Price & Real-Time Stats -->
          <div style="flex: 1; text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
            <!-- Price Display -->
            <div style="line-height: 1;">
              ${options.showUnit ? `<div style="font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase;">HARGA / ${product.unit || 'PCS'}</div>` : ''}
              <div style="font-size: 15px; font-weight: 900; color: #be123c; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: -0.5px;">
                ${formattedPrice}
              </div>
            </div>

            <!-- Barcode (if enabled) -->
            ${
              options.showBarcode && barcodeSvg
                ? `
              <div style="margin-top: 1.5px; max-width: 100%;">
                <div style="height: 13px; overflow: hidden; display: flex; justify-content: flex-end;">${barcodeSvg}</div>
                <div style="font-family: monospace; font-size: 6px; color: #475569; letter-spacing: 0.5px;">${product.barcode || product.sku}</div>
              </div>`
                : ''
            }

            <!-- Footer Meta: Last Price Update & Real-Time Stock -->
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 1.5px; font-size: 6.5px; border-top: 1px dotted #cbd5e1; padding-top: 1.5px;">
              ${
                options.showStockLevel
                  ? `
                <span style="background: ${stockBadgeBg}; color: ${stockBadgeColor}; font-weight: 800; padding: 0.5px 3px; border-radius: 2px;">
                  Stok: ${stockText}
                </span>`
                  : ''
              }
              ${
                options.showLastPriceUpdate && priceUpdate.formattedDate
                  ? `
                <span style="color: #475569; font-weight: 600;" title="Pembaruan harga terakhir">
                  Tgl Update: <strong>${priceUpdate.formattedDate}</strong>
                </span>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Compact Shelf Tag (50x30mm)
  if (options.preset === 'compact_strip_50x30') {
    return `
      <div style="box-sizing: border-box; width: 100%; height: 100%; padding: 3px; border: ${borderStyle}; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 6.5px; font-weight: 800; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px;">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${product.brand || options.storeName || 'ULILMART'}</span>
          ${options.showLastPriceUpdate && priceUpdate.formattedDate ? `<span style="color: #2563eb;">Upd: ${priceUpdate.formattedDate}</span>` : ''}
        </div>

        <div style="font-size: 8.5px; font-weight: 800; color: #0f172a; line-height: 1.1; max-height: 19px; overflow: hidden;">
          ${product.name}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 3px;">
          ${
            options.showQrCode
              ? `
            <div style="width: 36px; height: 36px; border: 1px solid #cbd5e1; border-radius: 2px; padding: 1px; shrink: 0;">
              ${qrSvg}
            </div>`
              : ''
          }
          <div style="flex: 1; text-align: right;">
            <div style="font-size: 13px; font-weight: 900; color: #be123c; font-family: ui-monospace, monospace; line-height: 1;">
              ${formattedPrice}
            </div>
            <div style="font-size: 6px; color: #64748b; margin-top: 1px;">
              ${options.showStockLevel ? `Stok: ${stockText}` : `SKU: ${product.sku}`}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Continuous Thermal Roll (58mm or 80mm)
  return `
    <div style="box-sizing: border-box; width: 100%; padding: 6px; border-bottom: ${borderStyle}; background: #ffffff; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
      <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #000000; padding-bottom: 2px; margin-bottom: 4px;">
        ${options.storeName || 'ULILMART MAGETAN'}
      </div>
      <div style="font-size: 11px; font-weight: 900; color: #000000; line-height: 1.2; margin-bottom: 4px;">
        ${product.name}
      </div>
      <div style="font-size: 7.5px; color: #475569; margin-bottom: 4px;">
        SKU: ${product.sku} | Barcode: ${product.barcode}
      </div>

      <div style="margin: 4px auto; width: 80px; height: 80px; padding: 2px; border: 1px solid #000000; background: #ffffff;">
        ${qrSvg}
      </div>
      <div style="font-size: 6.5px; font-weight: bold; color: #000000; margin-bottom: 4px;">
        PINDAI QR: CEK STOK &amp; HARGA REAL-TIME
      </div>

      <div style="background: #000000; color: #ffffff; padding: 4px; border-radius: 3px; margin: 4px 0;">
        <div style="font-size: 8px; font-weight: bold;">HARGA KONSUMEN</div>
        <div style="font-size: 18px; font-weight: 900; font-family: ui-monospace, monospace;">
          ${formattedPrice}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 7.5px; font-weight: bold; color: #000000; border-top: 1px dashed #000000; padding-top: 3px; margin-top: 2px;">
        <span>Stok: ${product.stock} ${product.unit || 'pcs'}</span>
        <span>Update: ${priceUpdate.formattedDate}</span>
      </div>
    </div>
  `;
}

/**
 * Generates full printable HTML document with exact print media CSS
 */
export function buildFullQRShelfPrintDocument(
  items: { product: Product; qrSvg: string; copies: number }[],
  options: QRShelfTagOptions,
  currency: string = 'IDR'
): string {
  // Flatten items by copies
  const flattened: { product: Product; qrSvg: string }[] = [];
  items.forEach((item) => {
    for (let i = 0; i < Math.max(1, item.copies); i++) {
      flattened.push({ product: item.product, qrSvg: item.qrSvg });
    }
  });

  // Handle thermal roll continuous mode
  if (options.preset === 'thermal_roll_58mm' || options.preset === 'thermal_roll_80mm') {
    const rollWidth = options.preset === 'thermal_roll_58mm' ? '58mm' : '80mm';
    const labelsHtml = flattened
      .map(
        (f, idx) => `
        <div class="thermal-label-tag" style="page-break-after: ${idx < flattened.length - 1 ? 'always' : 'auto'}; width: ${rollWidth}; box-sizing: border-box; margin: 0 auto 4mm auto;">
          ${generateSingleQrShelfLabelHtml(f.product, f.qrSvg, options, currency)}
        </div>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Cetak Label Rak QR - Thermal Roll</title>
        <style>
          @page {
            size: ${rollWidth} auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 2mm 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          @media screen {
            body {
              background: #f1f5f9;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .thermal-label-tag {
              background: #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              margin-bottom: 12px;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `;
  }

  // Handle A4 Sheet Grid Layout (24 labels: 3 cols x 8 rows)
  const itemsPerPage = options.preset === 'compact_strip_50x30' ? 36 : 24;
  const cols = options.preset === 'compact_strip_50x30' ? 4 : 3;
  const rows = options.preset === 'compact_strip_50x30' ? 9 : 8;
  const colWidth = options.preset === 'compact_strip_50x30' ? '48mm' : '64mm';
  const rowHeight = options.preset === 'compact_strip_50x30' ? '30mm' : '34mm';

  const pagesArray: { product: Product; qrSvg: string }[][] = [];
  for (let i = 0; i < flattened.length; i += itemsPerPage) {
    pagesArray.push(flattened.slice(i, i + itemsPerPage));
  }

  const pagesHtml = pagesArray
    .map((pageItems, pageIdx) => {
      const tags = pageItems
        .map(
          (item) => `
          <div style="width: 100%; height: 100%; box-sizing: border-box;">
            ${generateSingleQrShelfLabelHtml(item.product, item.qrSvg, options, currency)}
          </div>
        `
        )
        .join('');

      return `
        <div class="sheet-page" style="page-break-after: ${pageIdx < pagesArray.length - 1 ? 'always' : 'auto'}; width: 210mm; height: 296mm; overflow: hidden; box-sizing: border-box; display: grid; grid-template-columns: repeat(${cols}, ${colWidth}); grid-template-rows: repeat(${rows}, ${rowHeight}); gap: 2mm; padding: 4mm; margin: 0 auto; justify-content: center; align-content: start;">
          ${tags}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Cetak Label Rak QR Dinamis - Lembar A4</title>
      <style>
        @page {
          size: 210mm 297mm portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        @media screen {
          body {
            background: #e2e8f0;
            padding: 20px;
          }
          .sheet-page {
            background: #ffffff;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            margin: 0 auto 20px auto !important;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
}
