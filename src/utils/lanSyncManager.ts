import { LANConfig, LANRole, LANServerStatus, Product, Transaction, Customer, Supplier } from '../types';

const STORAGE_KEY_CONFIG = 'pos_lan_config';
const STORAGE_KEY_CLIENT_ID = 'pos_lan_client_id';

function createTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
  return undefined;
}

/** Header standar untuk request ke server LAN, termasuk Kunci LAN bila diisi. */
function lanHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const key = getLANConfig().lanKey;
    if (key) headers['X-LAN-Key'] = key;
  } catch {}
  return headers;
}

function generateClientId(): string {
  if (typeof window === 'undefined') return 'node-client';
  let id = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
  if (!id) {
    id = `term-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem(STORAGE_KEY_CLIENT_ID, id);
  }
  return id;
}

export function getDefaultLANConfig(): LANConfig {
  const currentOrigin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'http://localhost:3000';

  return {
    role: 'HOST',
    serverUrl: currentOrigin,
    clientName: 'Kasir Utama (Master)',
    clientId: generateClientId(),
    autoSync: true,
    syncInterval: 8,
  };
}

export function getLANConfig(): LANConfig {
  if (typeof window === 'undefined') return getDefaultLANConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.serverUrl && parsed.serverUrl.includes('169.254.')) {
        parsed.serverUrl = window.location.origin || 'http://localhost:3000';
      }
      return {
        ...getDefaultLANConfig(),
        ...parsed,
        clientId: generateClientId(),
      };
    }
  } catch (err) {
    console.warn('Error reading LAN config from localStorage:', err);
  }
  return getDefaultLANConfig();
}

export function saveLANConfig(updates: Partial<LANConfig>): LANConfig {
  const current = getLANConfig();
  const next: LANConfig = { ...current, ...updates };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('lan-config-changed', { detail: next }));
  }
  return next;
}

/**
 * Fetch LAN Server Status, active IPs, and connected clients
 */
export async function fetchLANServerStatus(customUrl?: string): Promise<LANServerStatus | null> {
  const config = getLANConfig();
  const baseUrl = (customUrl || config.serverUrl || '').replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/status`, {
      method: 'GET',
      headers: lanHeaders(),
      signal: createTimeoutSignal(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as LANServerStatus;
  } catch (err) {
    return null;
  }
}

/**
 * Test connectivity & measure ping response latency in milliseconds
 */
export async function testLANConnection(
  url: string
): Promise<{ success: boolean; latencyMs: number; status?: LANServerStatus; error?: string }> {
  const cleanUrl = url.replace(/\/+$/, '');
  const startTime = performance.now();
  try {
    const res = await fetch(`${cleanUrl}/api/lan/status`, {
      method: 'GET',
      headers: lanHeaders(),
      signal: createTimeoutSignal(5000),
    });
    const latencyMs = Math.round(performance.now() - startTime);
    if (res.ok) {
      const data = await res.json();
      return { success: true, latencyMs, status: data };
    }
    return { success: false, latencyMs, error: `Server merespon dengan status ${res.status}` };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      error: err.name === 'TimeoutError' ? 'Koneksi waktu habis (Timeout 5s). Pastikan IP dan port benar.' : (err.message || 'Gagal terhubung ke host.'),
    };
  }
}

/**
 * Register this terminal to the LAN master server
 */
export async function registerLANClient(): Promise<boolean> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return false;

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/client/register`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify({
        clientId: config.clientId,
        clientName: config.clientName,
        role: config.role,
        deviceType: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : typeof navigator !== 'undefined' && /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
      }),
      signal: createTimeoutSignal(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send periodic heartbeat ping to LAN master server
 */
export async function sendLANHeartbeat(transactionsCount = 0): Promise<{ activeClientsCount: number; databaseVersion: number } | null> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return null;

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/client/heartbeat`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify({
        clientId: config.clientId,
        clientName: config.clientName,
        role: config.role,
        transactionsCount,
      }),
      signal: createTimeoutSignal(3000),
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pull complete master catalog and transactions from LAN master server
 */
export async function pullLANMasterData(): Promise<{
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  heldOrders: any[];
  version: number;
} | null> {
  const config = getLANConfig();
  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/data/pull`, {
      method: 'GET',
      headers: lanHeaders(),
      signal: createTimeoutSignal(8000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        products: data.products || [],
        transactions: data.transactions || [],
        customers: data.customers || [],
        suppliers: data.suppliers || [],
        heldOrders: data.heldOrders || [],
        version: data.version || 1,
      };
    }
    return null;
  } catch (err) {
    console.warn('Error pulling master data from LAN server:', err);
    return null;
  }
}

/**
 * Push completed checkout transaction to LAN Master Database
 * (Master server will persist record & automatically deduct stock across network)
 */
export async function pushTransactionToLANServer(
  transaction: Transaction
): Promise<LANPushResult> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') {
    return { success: false, skipped: true, error: 'Mode Standalone lokal aktif' };
  }

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/data/push-transaction`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify({
        transaction,
        clientId: config.clientId,
        clientName: config.clientName,
      }),
      signal: createTimeoutSignal(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lan-transaction-pushed', {
            detail: { transaction, updatedStocks: data.updatedStocks },
          })
        );
      }
      return { success: true, updatedStocks: data.updatedStocks };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, status: res.status, error: errData.error || `HTTP ${res.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengirim transaksi ke server LAN' };
  }
}

export interface LANPushResult {
  success: boolean;
  /** true bila tidak dikirim karena mode Standalone (bukan kegagalan). */
  skipped?: boolean;
  /** Kode HTTP bila server menolak (4xx = data ditolak, tidak perlu dikirim ulang). */
  status?: number;
  duplicate?: boolean;
  updatedStocks?: Array<{ productId: string; newStock: number }>;
  error?: string;
}

export interface LANStockReturnPayload {
  /** Kunci unik retur/void (mis. id retur atau id transaksi) agar tidak diproses dua kali. */
  key: string;
  kind: 'return' | 'void';
  items: Array<{ productId: string; quantity: number; unitMultiplier?: number }>;
  transactionId?: string;
  transactionUpdate?: { status?: string; returnedAmount?: number; returnReason?: string; returnedAt?: string };
}

/** Kirim retur/void ke server LAN: stok dikembalikan di server dan status transaksi diperbarui. */
export async function pushStockReturnToLANServer(payload: LANStockReturnPayload): Promise<LANPushResult> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return { success: false, skipped: true };
  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/data/stock-return`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify({ ...payload, clientId: config.clientId, clientName: config.clientName }),
      signal: createTimeoutSignal(6000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, duplicate: data.duplicate, updatedStocks: data.updatedStocks };
    return { success: false, status: res.status, error: data.error || `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengirim retur ke server LAN' };
  }
}

// -------------------------------------------------------------
// Antrean kirim ulang: penjualan / retur yang gagal terkirim ke server LAN (mis. jaringan putus)
// disimpan di perangkat dan dikirim ulang otomatis. Aman diulang karena server idempoten.
// -------------------------------------------------------------
const STORAGE_KEY_RETRY_QUEUE = 'pos_lan_retry_queue_v1';

type LANRetryEntry =
  | { type: 'sale'; id: string; transaction: Transaction; attempts: number; queuedAt: string }
  | { type: 'stock-return'; id: string; payload: LANStockReturnPayload; attempts: number; queuedAt: string };

function readRetryQueue(): LANRetryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RETRY_QUEUE);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeRetryQueue(list: LANRetryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RETRY_QUEUE, JSON.stringify(list));
  } catch (err) {
    console.error('[LAN] Gagal menyimpan antrean kirim ulang:', err);
  }
}

export function getLANRetryQueueSize(): number {
  return readRetryQueue().length;
}

export function queueLANSale(transaction: Transaction): void {
  const list = readRetryQueue();
  const id = `sale:${transaction.id || transaction.invoiceNumber}`;
  if (list.some((e) => e.id === id)) return;
  list.push({ type: 'sale', id, transaction, attempts: 0, queuedAt: new Date().toISOString() });
  writeRetryQueue(list);
}

export function queueLANStockReturn(payload: LANStockReturnPayload): void {
  const list = readRetryQueue();
  const id = `${payload.kind}:${payload.key}`;
  if (list.some((e) => e.id === id)) return;
  list.push({ type: 'stock-return', id, payload, attempts: 0, queuedAt: new Date().toISOString() });
  writeRetryQueue(list);
}

let isFlushingRetryQueue = false;

/**
 * Kirim ulang antrean. Mengembalikan stok terbaru dari server untuk diterapkan di layar.
 * Entri dihapus bila berhasil, atau bila server menolak datanya (HTTP 4xx) agar tidak macet selamanya.
 */
export async function flushLANRetryQueue(): Promise<Array<{ productId: string; newStock: number }>> {
  if (isFlushingRetryQueue) return [];
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return [];
  isFlushingRetryQueue = true;
  const updatedStocks: Array<{ productId: string; newStock: number }> = [];
  try {
    const list = readRetryQueue();
    if (list.length === 0) return [];
    const remaining: LANRetryEntry[] = [];
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const result =
        entry.type === 'sale'
          ? await pushTransactionToLANServer(entry.transaction)
          : await pushStockReturnToLANServer(entry.payload);
      if (result.success) {
        updatedStocks.push(...(result.updatedStocks || []));
      } else if (result.status && result.status >= 400 && result.status < 500 && result.status !== 401 && result.status !== 429) {
        console.error(`[LAN] Server menolak ${entry.id}, dihapus dari antrean:`, result.error);
      } else {
        remaining.push({ ...entry, attempts: entry.attempts + 1 });
        // Server belum bisa dihubungi: simpan sisanya, coba lagi nanti.
        if (!result.status) {
          remaining.push(...list.slice(i + 1));
          break;
        }
      }
    }
    // Gabungkan dengan entri baru yang mungkin masuk selama proses kirim ulang
    const latest = readRetryQueue();
    const handledIds = new Set(list.map((e) => e.id));
    writeRetryQueue([...remaining, ...latest.filter((e) => !handledIds.has(e.id))]);
  } finally {
    isFlushingRetryQueue = false;
  }
  return updatedStocks;
}

/**
 * Sync / update products to LAN Server Database
 */
export async function pushProductsToLANServer(products: Product[], auditNote?: string): Promise<boolean> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return false;

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/data/sync-products`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify({ products, auditNote }),
      signal: createTimeoutSignal(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Seed or overwrite server database with client's current catalog and records
 */
export async function seedLANServerDatabase(payload: {
  products: Product[];
  customers?: Customer[];
  suppliers?: Supplier[];
  transactions?: Transaction[];
}): Promise<{ success: boolean; error?: string }> {
  const config = getLANConfig();
  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/database/seed`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify(payload),
      signal: createTimeoutSignal(10000),
    });
    if (res.ok) {
      return { success: true };
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error || `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal melakukan seed ke server LAN' };
  }
}

/**
 * Fetch shared held orders from LAN Server
 */
export async function fetchLANSharedHeldOrders(): Promise<any[]> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return [];

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/orders/held`, {
      method: 'GET',
      headers: lanHeaders(),
      signal: createTimeoutSignal(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.heldOrders || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save a held order to shared pool on LAN Server
 */
export async function pushLANSharedHeldOrder(heldOrder: any): Promise<boolean> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return false;

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/orders/held`, {
      method: 'POST',
      headers: lanHeaders(),
      body: JSON.stringify({ heldOrder, clientName: config.clientName }),
      signal: createTimeoutSignal(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Release / delete a shared held order from LAN Server
 */
export async function deleteLANSharedHeldOrder(orderId: string): Promise<boolean> {
  const config = getLANConfig();
  if (config.role === 'STANDALONE') return false;

  const baseUrl = config.serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/lan/orders/held/${orderId}`, {
      method: 'DELETE',
      headers: lanHeaders(),
      signal: createTimeoutSignal(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
