import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import os from 'node:os';

/**
 * Pembantu keamanan untuk server kasir.
 * Sengaja tanpa dependensi (hanya tipe express) supaya mudah dites dengan `node --test`.
 */

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isLoopbackAddress(address: string | undefined | null): boolean {
  return !!address && LOOPBACK_ADDRESSES.has(address);
}

function normalizeAddress(address: string): string {
  return address.replace(/^::ffff:/i, '').toLowerCase();
}

/** Alamat IP milik komputer server sendiri (mis. 192.168.1.5), supaya membuka lewat IP LAN dari PC kasir tetap dianggap lokal. */
export function getLocalMachineAddresses(): string[] {
  const result: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const info of list || []) result.push(normalizeAddress(info.address));
  }
  return result;
}

function hostnameOf(hostHeader: string): string {
  let h = hostHeader.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(1, h.indexOf(']'));
  const idx = h.lastIndexOf(':');
  if (idx > -1 && h.indexOf(':') === idx) h = h.slice(0, idx); // buang :port (bukan IPv6 polos)
  return h;
}

function isPrivateIPv4(h: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

/**
 * Apakah nama host termasuk jaringan lokal/toko (localhost, IP privat, nama komputer, *.local)?
 * Domain publik (mis. situs jahat yang memakai DNS-rebinding) tidak termasuk.
 * Tambahan nama host lain lewat env ALLOWED_HOSTS (dipisah koma).
 */
export function isTrustedHost(hostHeader: string | undefined | null): boolean {
  if (!hostHeader) return false;
  const h = hostnameOf(hostHeader);
  if (!h) return false;
  if (h === 'localhost' || h === '::1' || h.endsWith('.localhost')) return true;
  if (isPrivateIPv4(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.home')) return true;
  if (!h.includes('.') && !h.includes(':')) return true; // nama komputer satu kata, mis. "kasir-pc"
  if (h === os.hostname().toLowerCase()) return true;
  const extra = (process.env.ALLOWED_HOSTS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  return extra.includes(h);
}

/** Origin yang boleh memakai API: host yang sama, atau halaman dari jaringan lokal/toko. */
export function isAllowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (isSameOrigin(origin, host)) return true;
  try {
    return isTrustedHost(new URL(origin).host);
  } catch {
    return false;
  }
}

/** Apakah header Origin berasal dari host yang sama dengan server ini? */
export function isSameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true; // permintaan non-browser / same-origin GET tidak mengirim Origin
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface AdminCheckInput {
  remoteAddress: string | undefined;
  origin: string | undefined;
  host: string | undefined;
  providedToken: string | undefined;
  adminToken: string | undefined;
  /** Alamat IP komputer server sendiri (opsional); permintaan dari alamat ini dianggap lokal. */
  localAddresses?: string[];
}

export interface AdminCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Aturan akses admin:
 *  1. Permintaan dari website lain (Origin berbeda) selalu ditolak, supaya website
 *     jahat yang dibuka di komputer kasir tidak bisa memanggil server lokal.
 *  2. Komputer server sendiri (localhost) boleh tanpa token.
 *  3. Perangkat lain di jaringan hanya boleh jika ADMIN_TOKEN di .env diset dan cocok.
 */
export function checkAdminAccess(input: AdminCheckInput): AdminCheckResult {
  if (!isAllowedOrigin(input.origin, input.host)) {
    return { allowed: false, reason: 'Origin tidak diizinkan.' };
  }
  // Tangkal DNS-rebinding: header Host harus nama lokal/toko, bukan domain publik.
  if (!isTrustedHost(input.host)) {
    return { allowed: false, reason: 'Host tidak diizinkan untuk fitur administratif.' };
  }
  if (isLoopbackAddress(input.remoteAddress)) {
    return { allowed: true };
  }
  if (input.remoteAddress && input.localAddresses?.includes(normalizeAddress(input.remoteAddress))) {
    return { allowed: true };
  }
  const token = (input.adminToken || '').trim();
  if (!token) {
    return {
      allowed: false,
      reason: 'Fitur ini hanya bisa dipakai dari komputer server kasir (atau set ADMIN_TOKEN di file .env).',
    };
  }
  if (input.providedToken && safeEqual(input.providedToken, token)) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Token admin tidak valid.' };
}

/** Middleware Express: hanya admin (localhost atau token) yang boleh lewat. */
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const headerToken = req.headers['x-admin-token'];
  const result = checkAdminAccess({
    remoteAddress: req.socket.remoteAddress,
    origin: req.headers.origin as string | undefined,
    host: req.headers.host,
    providedToken: Array.isArray(headerToken) ? headerToken[0] : headerToken,
    adminToken: process.env.ADMIN_TOKEN,
    localAddresses: getLocalMachineAddresses(),
  });
  if (!result.allowed) {
    return res.status(403).json({ success: false, error: result.reason || 'Akses ditolak.' });
  }
  next();
}

/**
 * Pembatasan CORS: hanya halaman dari server ini atau dari jaringan lokal/toko
 * (localhost, IP privat, nama komputer) yang boleh memakai API. Situs di internet
 * yang dibuka di komputer kasir tidak bisa memanggil API; permintaan lintas-origin
 * yang mengubah data dari origin lain ditolak.
 */
export function sameOriginApi(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;
  if (origin && !isAllowedOrigin(origin, req.headers.host)) {
    if (req.method === 'OPTIONS') return res.sendStatus(403);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(403).json({ success: false, error: 'Permintaan lintas-origin ditolak.' });
    }
    return next(); // GET lintas-origin: tanpa header CORS, browser tidak akan mengizinkan pembacaan
  }
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Token');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}

/** Pembatas laju sederhana per IP (in-memory), mis. untuk endpoint AI yang memakai kuota Gemini. */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.socket.remoteAddress || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
    }
    next();
  };
}

/** Validasi dasar transaksi dari kasir. Mengembalikan pesan error, atau null jika layak. */
export function validateTransaction(tx: any): string | null {
  if (!tx || typeof tx !== 'object') return 'Transaksi tidak valid.';
  if (!tx.id && !tx.invoiceNumber) return 'Transaksi tidak punya id atau nomor invoice.';

  const isReturn = tx.status === 'refunded' || tx.status === 'void';
  const money = ['subtotal', 'finalTotal', 'taxAmount', 'serviceChargeAmount', 'discountAmount'];
  for (const field of money) {
    const v = tx[field];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) return `Nilai ${field} tidak valid.`;
    if (v < 0 && !isReturn) return `Nilai ${field} tidak boleh negatif.`;
    if (Math.abs(v) > 1e12) return `Nilai ${field} tidak masuk akal.`;
  }

  if (tx.items !== undefined && tx.items !== null) {
    if (!Array.isArray(tx.items)) return 'Daftar item tidak valid.';
    if (tx.items.length > 2000) return 'Jumlah item terlalu banyak.';
    for (const item of tx.items) {
      if (!item || typeof item !== 'object') return 'Item transaksi tidak valid.';
      const qty = item.quantity === undefined ? 1 : item.quantity;
      if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0 || qty > 100000) {
        return 'Jumlah (quantity) item tidak valid.';
      }
      const mult = item.selectedUnit?.multiplier;
      if (mult !== undefined && (typeof mult !== 'number' || !Number.isFinite(mult) || mult <= 0 || mult > 100000)) {
        return 'Satuan (multiplier) item tidak valid.';
      }
    }
  }
  return null;
}
