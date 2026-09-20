/**
 * Direct Thermal ESC/POS Printer Utility
 * Supports:
 * - Web Serial API (USB-to-Serial / Virtual COM / POS Thermal Printers)
 * - Web Bluetooth API (Portable Bluetooth Thermal Printers)
 * - Auto-formatting for 58mm (32 chars) and 80mm (42-48 chars)
 * - RJ11 Cash Drawer Kick Pulse (0x1B, 0x70, 0x00, 0x19, 0xFA)
 * - Auto-Cutter (0x1D, 0x56, 0x42, 0x00)
 */

import { Transaction, StoreSettings } from '../types';
import { formatCurrency, formatDate } from './formatters';

export type ThermalPaperWidth = '58mm' | '80mm';
export type PrinterConnectionType = 'serial' | 'bluetooth' | 'system';

export interface PrinterConfig {
  connectionType: PrinterConnectionType;
  paperWidth: ThermalPaperWidth;
  baudRate: number;
  autoCut: boolean;
  kickCashDrawer: boolean;
  printerName?: string;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  connectionType: 'system',
  paperWidth: '58mm',
  baudRate: 9600,
  autoCut: true,
  kickCashDrawer: true,
  printerName: 'Default System Thermal',
};

// Local storage key for printer preferences
const PRINTER_STORAGE_KEY = 'pos_escpos_printer_config';

export const getSavedPrinterConfig = (): PrinterConfig => {
  try {
    const saved = localStorage.getItem(PRINTER_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load printer config:', e);
  }
  return DEFAULT_PRINTER_CONFIG;
};

export const savePrinterConfig = (config: PrinterConfig) => {
  try {
    localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save printer config:', e);
  }
};

// Check Web Hardware API capabilities
export const checkPrinterHardwareSupport = () => {
  const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
  const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  return { hasSerial, hasBluetooth };
};

/**
 * ESC/POS Command Builder for raw thermal printer byte streams
 */
export class EscPosBuilder {
  private buffer: number[] = [];
  private widthChars: number;

  constructor(paperWidth: ThermalPaperWidth = '58mm') {
    this.widthChars = paperWidth === '58mm' ? 32 : 48;
    this.init();
  }

  // Initialize printer
  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  // Alignment: 0: left, 1: center, 2: right
  align(align: 'left' | 'center' | 'right'): this {
    const code = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, code); // ESC a n
    return this;
  }

  // Bold text
  bold(enable: boolean): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0); // ESC E n
    return this;
  }

  // Text size (normal, double-height, double-width)
  size(size: 'normal' | 'double_h' | 'double_w' | 'large'): this {
    let n = 0x00;
    if (size === 'double_h') n = 0x01;
    else if (size === 'double_w') n = 0x10;
    else if (size === 'large') n = 0x11;
    this.buffer.push(0x1d, 0x21, n); // GS ! n
    return this;
  }

  // Append raw text
  text(str: string): this {
    // Basic clean-up for standard thermal printer ASCII
    const cleanStr = str
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[^\x20-\x7E\n\r]/g, ' '); // Strip non-ASCII
    for (let i = 0; i < cleanStr.length; i++) {
      this.buffer.push(cleanStr.charCodeAt(i));
    }
    return this;
  }

  // Append text and newline
  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  // Draw full divider line
  divider(char: string = '-'): this {
    const lineStr = char.repeat(this.widthChars);
    this.line(lineStr);
    return this;
  }

  // Print two columns (Left text, Right text justified)
  twoColumns(left: string, right: string): this {
    const leftLen = left.length;
    const rightLen = right.length;
    const spacesNeeded = this.widthChars - (leftLen + rightLen);

    if (spacesNeeded >= 1) {
      this.line(left + ' '.repeat(spacesNeeded) + right);
    } else {
      // If too long, print left then right on next line right-aligned
      this.line(left);
      const rightSpaces = Math.max(0, this.widthChars - rightLen);
      this.line(' '.repeat(rightSpaces) + right);
    }
    return this;
  }

  // Feed n lines
  feed(lines: number = 2): this {
    this.buffer.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  // RJ11 Cash Drawer Kick Pulse
  kickCashDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  // Full / Partial Auto-Cutter
  cut(partial: boolean = false): this {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, partial ? 0x01 : 0x00); // GS V n
    return this;
  }

  // Get raw Uint8Array
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate ESC/POS formatted receipt from a Transaction
 */
export const buildTransactionReceiptEscPos = (
  tx: Transaction,
  settings: StoreSettings,
  paperWidth: ThermalPaperWidth = '58mm',
  autoCut: boolean = true,
  kickCashDrawer: boolean = false
): Uint8Array => {
  const builder = new EscPosBuilder(paperWidth);

  // Trigger cash drawer pulse first if configured
  if (kickCashDrawer) {
    builder.kickCashDrawer();
  }

  // Header: Store info centered
  builder.align('center');
  builder.bold(true);
  builder.size('large');
  builder.line(settings.storeName || 'SMART RETAIL POS');
  builder.size('normal');
  builder.bold(false);

  if (settings.address) {
    builder.line(settings.address);
  }
  if (settings.phone) {
    builder.line(`Telp: ${settings.phone}`);
  }

  builder.divider('=');

  // Transaction Meta
  builder.align('left');
  builder.twoColumns('No. Nota:', tx.invoiceNumber);
  builder.twoColumns('Tanggal :', formatDate(tx.createdAt));
  builder.twoColumns('Kasir   :', tx.cashierName || 'Staff POS');
  if (tx.customer) {
    builder.twoColumns('Pelanggan:', `${tx.customer.name} (${tx.customer.tier})`);
  }
  if (tx.orderType && tx.orderType !== 'dine_in') {
    builder.twoColumns('Layanan :', tx.orderType.toUpperCase());
  }

  builder.divider('-');

  // Items List
  tx.items.forEach((item) => {
    // Line 1: Item Name
    builder.bold(true);
    builder.line(item.product.name);
    builder.bold(false);

    // Line 2: Qty x Price = Subtotal
    const unitPrice = item.unitPrice || item.product.price;
    const unitLabel = item.selectedUnit?.name || 'x';
    const qtyStr = ` ${item.quantity} ${unitLabel} @${formatCurrency(unitPrice, settings.currency)}`;
    const subtotalStr = formatCurrency(item.totalPrice, settings.currency);
    builder.twoColumns(qtyStr, subtotalStr);

    if (item.itemDiscountPercent && item.itemDiscountPercent > 0) {
      builder.twoColumns('   Diskon Item', `${item.itemDiscountPercent}%`);
    }
  });

  builder.divider('-');

  // Totals & Discounts
  builder.twoColumns('Subtotal', formatCurrency(tx.subtotal, settings.currency));

  if (tx.discountAmount > 0) {
    builder.twoColumns('Total Diskon', `-${formatCurrency(tx.discountAmount, settings.currency)}`);
  }

  if (tx.taxAmount > 0) {
    builder.twoColumns(`PPN (${settings.taxRatePercent}%)`, formatCurrency(tx.taxAmount, settings.currency));
  }

  builder.divider('=');

  // Final Total (Highlighted)
  builder.bold(true);
  builder.size('double_h');
  builder.twoColumns('TOTAL', formatCurrency(tx.finalTotal, settings.currency));
  builder.size('normal');
  builder.bold(false);

  builder.divider('-');

  // Payment Breakdown
  builder.twoColumns('Metode Bayar', tx.payment.method.toUpperCase());
  builder.twoColumns('Bayar / Tunai', formatCurrency(tx.payment.amountTendered, settings.currency));
  if (tx.payment.change > 0) {
    builder.twoColumns('Kembalian', formatCurrency(tx.payment.change, settings.currency));
  }
  if (tx.pointsEarned && tx.pointsEarned > 0) {
    builder.twoColumns('Poin Didapat', `+${tx.pointsEarned} Poin`);
  }

  // Footer note
  builder.feed(1);
  builder.align('center');
  builder.line(settings.receiptFooterMessage || 'Terima kasih atas kunjungan Anda!');
  builder.line('Barang yg dibeli tdk dpt ditukar');
  builder.line('Simpan nota ini sbg bukti sah');

  // Auto-cutter
  if (autoCut) {
    builder.cut(false);
  } else {
    builder.feed(3);
  }

  return builder.getBytes();
};

/**
 * Generate a Test Print ESC/POS Ticket
 */
export const buildTestReceiptEscPos = (
  paperWidth: ThermalPaperWidth = '58mm',
  kickDrawer: boolean = true
): Uint8Array => {
  const builder = new EscPosBuilder(paperWidth);

  if (kickDrawer) {
    builder.kickCashDrawer();
  }

  builder.align('center');
  builder.bold(true);
  builder.size('double_h');
  builder.line('TEST THERMAL PRINTER');
  builder.size('normal');
  builder.bold(false);
  builder.divider('=');
  builder.align('left');
  builder.line('Koneksi : BERHASIL TERHUBUNG');
  builder.line(`Lebar   : ${paperWidth}`);
  builder.line(`Waktu   : ${new Date().toLocaleTimeString('id-ID')}`);
  builder.divider('-');
  builder.align('center');
  builder.line('Hardware ESC/POS Direct Print');
  builder.line('Siap Melayani Kasir & Auto-Cut');
  builder.divider('=');
  builder.feed(1);
  builder.cut(false);

  return builder.getBytes();
};

/**
 * Print directly via Web Serial API (USB-Serial / Virtual COM POS Printers)
 */
export const printViaWebSerial = async (
  bytes: Uint8Array,
  baudRate: number = 9600
): Promise<{ success: boolean; message: string }> => {
  if (!('serial' in navigator)) {
    return {
      success: false,
      message: 'Web Serial API tidak didukung di browser ini. Gunakan Google Chrome / Microsoft Edge.',
    };
  }

  try {
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate });

    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();

    return {
      success: true,
      message: 'Berhasil mencetak langsung ke Thermal Printer via USB/Serial!',
    };
  } catch (err: any) {
    console.error('Web Serial Print error:', err);
    return {
      success: false,
      message: err?.message || 'Gagal berkomunikasi dengan port serial printer.',
    };
  }
};

/**
 * Print directly via Web Bluetooth API (Bluetooth Thermal Printers)
 */
export const printViaWebBluetooth = async (
  bytes: Uint8Array
): Promise<{ success: boolean; message: string }> => {
  if (!('bluetooth' in navigator)) {
    return {
      success: false,
      message: 'Web Bluetooth API tidak didukung di browser ini. Pastikan Bluetooth aktif di Chrome/Edge.',
    };
  }

  try {
    const bluetooth = (navigator as any).bluetooth;
    // Standard thermal printer Bluetooth service UUIDs or accept all devices
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common thermal service
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent
      ],
    });

    const server = await device.gatt.connect();
    // Try to find a writable characteristic
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('Tidak ditemukan port tulis Bluetooth yang kompatibel pada printer ini.');
    }

    // Bluetooth characteristic write limits (send in 100-byte chunks to avoid buffer overflow)
    const chunkSize = 100;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      if (writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
      // Small pause for hardware buffer
      await new Promise((r) => setTimeout(r, 20));
    }

    await device.gatt.disconnect();

    return {
      success: true,
      message: `Berhasil mencetak via Bluetooth ke printer: ${device.name || 'Thermal'}`,
    };
  } catch (err: any) {
    console.error('Web Bluetooth Print error:', err);
    return {
      success: false,
      message: err?.message || 'Gagal menghubungkan atau mencetak via Bluetooth.',
    };
  }
};

/**
 * Universal Hardware Cash Drawer Kick Pulse (RJ11)
 */
export const kickCashDrawerOnly = async (
  connectionType: 'serial' | 'bluetooth' = 'serial',
  baudRate: number = 9600
): Promise<{ success: boolean; message: string }> => {
  const builder = new EscPosBuilder('58mm');
  builder.kickCashDrawer();
  const bytes = builder.getBytes();

  if (connectionType === 'serial') {
    return printViaWebSerial(bytes, baudRate);
  } else {
    return printViaWebBluetooth(bytes);
  }
};
