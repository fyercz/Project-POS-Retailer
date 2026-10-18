// Muat .env lebih dulu sebelum modul lain membaca process.env
import './src/server/loadEnv.ts';
import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import {
  initSqliteMasterDatabase,
  getAllProducts as getSqliteProducts,
  getProductByIdOrBarcode as getSqliteProductByIdOrBarcode,
  upsertProducts as upsertSqliteProducts,
  applyStockMovement as applySqliteStockMovement,
  type StockMovementItem,
  getAllTransactions as getSqliteTransactions,
  upsertTransactions as upsertSqliteTransactions,
  queryTransactionsPaginated as querySqliteTransactionsPaginated,
  getAllCustomers as getSqliteCustomers,
  upsertCustomers as upsertSqliteCustomers,
  getAllSuppliers as getSqliteSuppliers,
  upsertSuppliers as upsertSqliteSuppliers,
  getAllHeldOrders as getSqliteHeldOrders,
  saveHeldOrder as saveSqliteHeldOrder,
  deleteHeldOrder as deleteSqliteHeldOrder,
  getDatabaseStatus as getSqliteDatabaseStatus,
  checkDatabaseIntegrity as checkSqliteIntegrity,
  cleanAndPruneDatabase as cleanSqliteDatabase,
} from './src/server/sqliteMasterDb.ts';

import {
  adminOnly,
  sameOriginApi,
  createRateLimiter,
  validateTransaction,
  lanPairing,
  lanKeyGuard,
  toPublicProduct,
  isLoopbackAddress,
  getLocalMachineAddresses,
} from './src/server/security.ts';
import { aiRouter } from './src/server/routes/ai.ts';
import { onlineRouter } from './src/server/routes/online.ts';
import { systemRouter } from './src/server/routes/system.ts';
import { saleStockDeltas } from './src/domain/stockMovements.ts';


const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
// Express 5: req.body = undefined bila tidak ada body JSON (Express 4: {}). Samakan agar handler
// yang membaca req.body tetap menjawab 400 dengan pesan jelas, bukan crash 500.
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Pembatasan origin: hanya halaman dari server ini sendiri yang boleh memakai API
// (perangkat LAN lain memuat aplikasi dari server yang sama, jadi tetap same-origin).
app.use(sameOriginApi);

// Kunci LAN opsional (LAN_KEY di .env): perangkat lain harus dipasangkan dulu.
app.use(lanPairing);
app.use('/api', lanKeyGuard);

// Endpoint administratif (git-pull, git-configure, verify-files, cleanup-*, seed database):
// hanya dari komputer server (localhost) atau dengan ADMIN_TOKEN di .env.
// GET /api/system/git-status (hanya baca) tetap terbuka untuk semua perangkat.

// Endpoint AI memakai kuota Gemini: batasi laju per perangkat
app.use('/api/ai', createRateLimiter(40, 60_000));
app.use('/api/online', createRateLimiter(60, 60_000));

// Health check endpoint
app.get('/api/health', (req, res) => {
  let version = 'unknown';
  // Cari package.json di folder kerja, lalu di folder aplikasi (dist/server.cjs -> ..)
  for (const dir of [process.cwd(), path.resolve(path.dirname(process.argv[1] || '.'), '..')]) {
    try {
      version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')).version;
      break;
    } catch {}
  }
  res.json({ status: 'ok', version, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// =======================================================
// POS MULTI-CLIENT LAN SERVER DATABASE & CLOUD SYNC ENGINE
// =======================================================

// 1. Network IP Discovery for LAN Access
function getLocalLanIps(): string[] {
  try {
    const interfaces = os.networkInterfaces();
    const results: string[] = [];
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          // Exclude link-local IPs (169.254.x.x) which are inaccessible from outside containers
          if (!net.address.startsWith('169.254.')) {
            results.push(net.address);
          }
        }
      }
    }
    return results.length > 0 ? results : ['127.0.0.1'];
  } catch {
    return ['127.0.0.1'];
  }
}

// 2. Persistent Storage for Master Database File
const DATA_DIR = process.env.POS_DATA_DIR || path.join(process.cwd(), 'data');
const LAN_DB_FILE = path.join(DATA_DIR, 'lan-database.json');

// Memory Stores for High-Speed LAN Multi-Client Access
const lanProductsStore = new Map<string, any>();
const lanTransactionsStore = new Map<string, any>();
const lanCustomersStore = new Map<string, any>();
const lanSuppliersStore = new Map<string, any>();
const lanHeldOrdersStore = new Map<string, any>();
const lanActiveClientsStore = new Map<string, any>();
const lanServerLogs: Array<{ id: string; timestamp: string; level: 'info' | 'success' | 'warn'; message: string }> = [];

let lanDatabaseVersion = 1;
let lanLastUpdated = new Date().toISOString();

function addLanLog(level: 'info' | 'success' | 'warn', message: string) {
  const logItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  lanServerLogs.unshift(logItem);
  if (lanServerLogs.length > 60) {
    lanServerLogs.pop();
  }
  console.log(`[LAN Server] [${level.toUpperCase()}] ${message}`);
}

// Tandai data server berubah (nomor versi dipakai kasir untuk mendeteksi pembaruan).
// SQLite adalah SATU-SATUNYA penyimpanan permanen; Map di atas hanya cache baca cepat.
// Dulu seluruh isi (puluhan ribu produk/transaksi) ditulis ulang ke lan-database.json setiap
// perubahan: berat (beberapa MB per transaksi) dan hanya duplikat SQLite. File JSON lama tetap
// dibaca sekali saat start sebagai cadangan migrasi bila SQLite gagal.
function scheduleLanDbSave() {
  lanLastUpdated = new Date().toISOString();
  lanDatabaseVersion++;
}

// Initial Database Bootstrapper
async function initLanDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Initialize SQLite Relational Database in WAL Mode
    await initSqliteMasterDatabase();

    // 2. Load latest records directly from SQLite Master DB
    const [dbProducts, dbTransactions, dbCustomers, dbSuppliers, dbHeld] = await Promise.all([
      getSqliteProducts(),
      getSqliteTransactions(1000),
      getSqliteCustomers(),
      getSqliteSuppliers(),
      getSqliteHeldOrders(),
    ]);

    lanProductsStore.clear();
    dbProducts.forEach((p: any) => lanProductsStore.set(p.id, p));

    lanTransactionsStore.clear();
    dbTransactions.forEach((t: any) => lanTransactionsStore.set(t.id || t.invoiceNumber, t));

    lanCustomersStore.clear();
    dbCustomers.forEach((c: any) => lanCustomersStore.set(c.id, c));

    lanSuppliersStore.clear();
    dbSuppliers.forEach((s: any) => lanSuppliersStore.set(s.id, s));

    lanHeldOrdersStore.clear();
    dbHeld.forEach((h: any) => lanHeldOrdersStore.set(h.id, h));

    lanDatabaseVersion = 1;
    lanLastUpdated = new Date().toISOString();
    addLanLog(
      'success',
      `Basis Data Relasional SQLite (WAL Mode) aktif: ${lanProductsStore.size} produk, ${lanTransactionsStore.size} transaksi, ${lanCustomersStore.size} member.`
    );
    return;
  } catch (err: any) {
    console.warn('[LAN Server] Error initializing SQLite DB, checking fallback JSON:', err?.message || err);
  }

  // Fallback to legacy JSON if SQLite initialization fails
  try {
    if (fs.existsSync(LAN_DB_FILE)) {
      const raw = fs.readFileSync(LAN_DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.products)) {
        data.products.forEach((p: any) => lanProductsStore.set(p.id, p));
      }
      if (Array.isArray(data.transactions)) {
        data.transactions.forEach((t: any) => lanTransactionsStore.set(t.id || t.invoiceNumber, t));
      }
      if (Array.isArray(data.customers)) {
        data.customers.forEach((c: any) => lanCustomersStore.set(c.id, c));
      }
      if (Array.isArray(data.suppliers)) {
        data.suppliers.forEach((s: any) => lanSuppliersStore.set(s.id, s));
      }
      if (Array.isArray(data.heldOrders)) {
        data.heldOrders.forEach((h: any) => lanHeldOrdersStore.set(h.id, h));
      }
      lanDatabaseVersion = data.version || 1;
      lanLastUpdated = data.lastUpdated || new Date().toISOString();
      addLanLog('warn', `SQLite gagal dibuka; memakai salinan lama lan-database.json (${lanProductsStore.size} produk, ${lanTransactionsStore.size} transaksi). Perubahan baru TIDAK tersimpan permanen sampai SQLite pulih.`);
      return;
    }
  } catch (err: any) {
    console.warn('[LAN Server] Failed loading existing LAN DB, initializing fresh:', err?.message || err);
  }

  // Tanpa SQLite dan tanpa berkas lama: server mulai KOSONG (dulu diisi katalog FMCG contoh).
  addLanLog('warn', 'Database SQLite tidak dapat dibuka dan tidak ada data lama. Server berjalan tanpa data; periksa folder data/.');
}

// Server baru menerima request setelah database siap (lihat setupViteOrStatic).
const dbReady = initLanDatabase();

function isLocalRequest(req: express.Request): boolean {
  const addr = req.socket.remoteAddress || '';
  return isLoopbackAddress(addr) || getLocalMachineAddresses().includes(addr.replace(/^::ffff:/i, '').toLowerCase());
}

// Clean client IP helper
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const rawIp = req.socket.remoteAddress || '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

// ----------------------------------------------------
// LAN SERVER REST ENDPOINTS
// ----------------------------------------------------

// 1. LAN Status & Connectivity Info
app.get('/api/lan/status', (req, res) => {
  const localIps = getLocalLanIps();
  const primaryIp = localIps[0] || '127.0.0.1';
  const now = Date.now();

  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined;
  const protoHeader = (req.headers['x-forwarded-proto'] || req.protocol || 'http') as string;
  const webOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : `http://localhost:${PORT}`;

  const hasRealLanIp = localIps.some(
    (ip) =>
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
  const recommendedUrl = hasRealLanIp ? `http://${primaryIp}:${PORT}` : webOrigin;
  const isCloudEnvironment = !hasRealLanIp;

  // Filter clients active in the last 45 seconds
  const activeClientsList = Array.from(lanActiveClientsStore.values()).map((c) => {
    const lastSeenTime = new Date(c.lastSeen || 0).getTime();
    const isOnline = now - lastSeenTime < 45000;
    return { ...c, isOnline };
  });

  const dbSizeApprox = Math.round(
    JSON.stringify({
      p: Array.from(lanProductsStore.values()),
      t: Array.from(lanTransactionsStore.values()),
    }).length / 1024
  );

  res.json({
    isServerRunning: true,
    role: 'HOST',
    port: PORT,
    localIps,
    primaryIp,
    webOrigin,
    recommendedUrl,
    isCloudEnvironment,
    serverUptime: Math.round(process.uptime()),
    connectedClients: activeClientsList,
    stats: {
      totalProducts: lanProductsStore.size,
      totalTransactions: lanTransactionsStore.size,
      totalCustomers: lanCustomersStore.size,
      totalHeldOrders: lanHeldOrdersStore.size,
      dbSizeKb: dbSizeApprox,
      lastUpdated: lanLastUpdated,
      databaseVersion: lanDatabaseVersion,
    },
    recentLogs: lanServerLogs.slice(0, 20),
    // Kunci LAN hanya ditunjukkan ke komputer server sendiri (untuk membuat link pairing)
    pairing: {
      required: Boolean((process.env.LAN_KEY || '').trim()),
      key: isLocalRequest(req) ? (process.env.LAN_KEY || '').trim() || undefined : undefined,
    },
  });
});

// 2. Client Device Registration
app.post('/api/lan/client/register', (req, res) => {
  try {
    const { clientId, clientName, role, deviceType } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId wajib diisi' });
    }

    const ip = getClientIp(req);
    const clientRecord = {
      id: clientId,
      name: clientName || `Kasir Terminal ${lanActiveClientsStore.size + 1}`,
      role: role || 'CLIENT',
      ip,
      deviceType: deviceType || 'desktop',
      lastSeen: new Date().toISOString(),
      isOnline: true,
      transactionsCount: 0,
      userAgent: req.headers['user-agent']?.slice(0, 80) || '',
    };

    lanActiveClientsStore.set(clientId, clientRecord);
    addLanLog('success', `Terminal Kasir "${clientRecord.name}" terhubung dari IP ${ip}.`);

    res.json({
      success: true,
      message: 'Perangkat berhasil terdaftar di Server Database LAN.',
      client: clientRecord,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Client Heartbeat Ping
app.post('/api/lan/client/heartbeat', (req, res) => {
  const { clientId, clientName, role, transactionsCount } = req.body;
  if (clientId) {
    const existing = lanActiveClientsStore.get(clientId) || {
      id: clientId,
      name: clientName || 'Kasir Terminal',
      role: role || 'CLIENT',
      ip: getClientIp(req),
      transactionsCount: 0,
    };

    existing.lastSeen = new Date().toISOString();
    if (clientName) existing.name = clientName;
    if (typeof transactionsCount === 'number') existing.transactionsCount = transactionsCount;
    lanActiveClientsStore.set(clientId, existing);
  }

  // Count active devices in the last 45s
  const now = Date.now();
  const activeCount = Array.from(lanActiveClientsStore.values()).filter(
    (c) => now - new Date(c.lastSeen || 0).getTime() < 45000
  ).length;

  res.json({
    success: true,
    serverTime: new Date().toISOString(),
    activeClientsCount: activeCount,
    databaseVersion: lanDatabaseVersion,
    totalProducts: lanProductsStore.size,
    totalHeldOrders: lanHeldOrdersStore.size,
  });
});

// 4. Pull All Master Data (for initial sync or continuous sync)
app.get('/api/lan/data/pull', (req, res) => {
  res.json({
    success: true,
    version: lanDatabaseVersion,
    lastUpdated: lanLastUpdated,
    products: Array.from(lanProductsStore.values()),
    transactions: Array.from(lanTransactionsStore.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ),
    customers: Array.from(lanCustomersStore.values()),
    suppliers: Array.from(lanSuppliersStore.values()),
    heldOrders: Array.from(lanHeldOrdersStore.values()),
  });
});

// -------------------------------------------------------------
// Pergerakan stok (penjualan, retur, void)
// Sumber kebenaran stok = SQLite. Setiap pergerakan punya kunci unik (mis. "sale:<id transaksi>")
// yang dicatat atomik bersama perubahan stok, jadi pengiriman ulang tidak memotong stok dua kali,
// juga setelah server di-restart.
// -------------------------------------------------------------
const memoryAppliedMovements = new Set<string>(); // cadangan bila SQLite tidak tersedia

// Aturan yang sama dengan aplikasi kasir (src/domain/stockMovements.ts)
function saleMovementItems(tx: any): StockMovementItem[] {
  return saleStockDeltas(tx?.items);
}

async function applyStockMovement(
  key: string,
  kind: string,
  items: StockMovementItem[]
): Promise<{ duplicate: boolean; updatedStocks: Array<{ productId: string; newStock: number }> }> {
  let fromDb = new Map<string, number>();
  try {
    const r = await applySqliteStockMovement(key, kind, items);
    if (r.duplicate) return { duplicate: true, updatedStocks: [] };
    fromDb = new Map(r.updatedStocks.map((u) => [u.productId, u.newStock]));
  } catch (err: any) {
    console.warn('[Stok] SQLite tidak tersedia, memakai stok di memori:', err?.message || err);
    if (memoryAppliedMovements.has(key)) return { duplicate: true, updatedStocks: [] };
    memoryAppliedMovements.add(key);
  }

  const deltas = new Map<string, number>();
  for (const i of items) deltas.set(i.productId, (deltas.get(i.productId) || 0) + i.delta);

  const updatedStocks: Array<{ productId: string; newStock: number }> = [];
  for (const [productId, delta] of deltas) {
    const prod = lanProductsStore.get(productId);
    const newStock = fromDb.has(productId)
      ? fromDb.get(productId)!
      : prod
        ? Math.max(0, (Number(prod.stock) || 0) + delta)
        : undefined;
    if (newStock === undefined) continue;
    if (prod) prod.stock = newStock;
    updatedStocks.push({ productId, newStock });
  }
  return { duplicate: false, updatedStocks };
}

/** Simpan transaksi ke memori tanpa menghapus penanda "stok sudah diproses". */
function putTransaction(key: string, tx: any): any {
  const existing = lanTransactionsStore.get(key);
  const merged = existing?.lanProcessedAt
    ? { ...tx, lanProcessedAt: existing.lanProcessedAt, processedByTerminal: existing.processedByTerminal }
    : tx;
  lanTransactionsStore.set(key, merged);
  return merged;
}

// 5. Push Transaction from any LAN Terminal (Auto Deduct Stock in Master DB)
app.post('/api/lan/data/push-transaction', async (req, res) => {
  try {
    const { transaction, clientId, clientName } = req.body || {};
    if (!transaction || (!transaction.id && !transaction.invoiceNumber)) {
      return res.status(400).json({ success: false, error: 'Transaksi tidak valid' });
    }

    const validationError = validateTransaction(transaction);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const txKey = String(transaction.id || transaction.invoiceNumber);
    const now = new Date().toISOString();
    const existing = lanTransactionsStore.get(txKey);
    const duplicateResponse = () =>
      res.json({
        success: true,
        duplicate: true,
        message: 'Transaksi ini sudah pernah diproses; stok tidak dipotong lagi.',
        transaction: existing || transaction,
        updatedStocks: [],
        serverTime: now,
      });

    if (existing?.lanProcessedAt) return duplicateResponse();

    // Transaksi berstatus retur/void tidak memotong stok (pengembalian stok lewat /stock-return).
    const isSale = transaction.status !== 'refunded' && transaction.status !== 'void';
    let updatedStocks: Array<{ productId: string; newStock: number }> = [];
    if (isSale) {
      const result = await applyStockMovement(`sale:${txKey}`, 'sale', saleMovementItems(transaction));
      if (result.duplicate) return duplicateResponse();
      updatedStocks = result.updatedStocks;
    }

    const enriched = {
      ...transaction,
      id: txKey,
      syncStatus: 'synced',
      syncedAt: now,
      lanProcessedAt: now,
      processedByTerminal: clientName || clientId || 'Terminal Kasir',
    };
    lanTransactionsStore.set(txKey, enriched);

    if (clientId && lanActiveClientsStore.has(clientId)) {
      const client = lanActiveClientsStore.get(clientId);
      client.transactionsCount = (client.transactionsCount || 0) + 1;
      client.lastSeen = now;
    }

    // Poin & total belanja member (hanya untuk penjualan), lalu simpan ke SQLite agar tidak hilang saat restart
    if (isSale && transaction.customer?.id && lanCustomersStore.has(transaction.customer.id)) {
      const cust = lanCustomersStore.get(transaction.customer.id);
      cust.totalSpent = (cust.totalSpent || 0) + (transaction.finalTotal || 0);
      cust.ordersCount = (cust.ordersCount || 0) + 1;
      if (transaction.pointsEarned) cust.points = (cust.points || 0) + transaction.pointsEarned;
      if (transaction.pointsRedeemed) cust.points = Math.max(0, (cust.points || 0) - transaction.pointsRedeemed);
      await upsertSqliteCustomers([cust]).catch((e: any) =>
        console.error('[SQLite Server] Gagal menyimpan poin member:', e?.message || e)
      );
    }

    await upsertSqliteTransactions([enriched], clientId || 'lan-terminal', clientName || 'Kasir').catch((e: any) =>
      console.error('[SQLite Server] Gagal menyimpan transaksi LAN:', e?.message || e)
    );
    scheduleLanDbSave();

    addLanLog(
      'success',
      `Transaksi ${transaction.invoiceNumber} (Rp ${(transaction.finalTotal || 0).toLocaleString('id-ID')}) dari ${clientName || 'Kasir'} diproses. Stok ${updatedStocks.length} produk dipotong.`
    );

    res.json({
      success: true,
      message: 'Transaksi tersimpan di Server Database LAN dan stok terpotong.',
      transaction: enriched,
      updatedStocks,
      serverTime: now,
    });
  } catch (err: any) {
    console.error('Error processing LAN transaction push:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. Retur penjualan / void: kembalikan stok (idempoten) dan perbarui status transaksi
app.post('/api/lan/data/stock-return', async (req, res) => {
  try {
    const { key, kind, items, transactionId, transactionUpdate, clientName } = req.body || {};
    if (typeof key !== 'string' || !key.trim() || key.length > 200) {
      return res.status(400).json({ success: false, error: 'Kunci retur tidak valid.' });
    }
    const movementKind = kind === 'void' ? 'void' : 'return';
    if (!Array.isArray(items) || items.length > 2000) {
      return res.status(400).json({ success: false, error: 'Daftar barang retur tidak valid.' });
    }

    const movement: StockMovementItem[] = [];
    for (const it of items) {
      const productId = it?.productId;
      const qty = Number(it?.quantity);
      const mult = it?.unitMultiplier === undefined ? 1 : Number(it.unitMultiplier);
      if (typeof productId !== 'string' || !productId) {
        return res.status(400).json({ success: false, error: 'Produk retur tidak valid.' });
      }
      if (!Number.isFinite(qty) || qty <= 0 || qty > 100000 || !Number.isFinite(mult) || mult <= 0 || mult > 100000) {
        return res.status(400).json({ success: false, error: 'Jumlah barang retur tidak valid.' });
      }
      movement.push({ productId, delta: qty * mult });
    }

    const result = await applyStockMovement(`${movementKind}:${key}`, movementKind, movement);

    let updatedTx: any = undefined;
    if (!result.duplicate && typeof transactionId === 'string' && transactionUpdate && typeof transactionUpdate === 'object') {
      const existing = lanTransactionsStore.get(transactionId);
      if (existing) {
        const patch: any = {};
        if (['completed', 'refunded', 'void'].includes(transactionUpdate.status)) patch.status = transactionUpdate.status;
        if (Number.isFinite(transactionUpdate.returnedAmount)) patch.returnedAmount = transactionUpdate.returnedAmount;
        if (typeof transactionUpdate.returnReason === 'string') patch.returnReason = transactionUpdate.returnReason.slice(0, 500);
        if (typeof transactionUpdate.returnedAt === 'string') patch.returnedAt = transactionUpdate.returnedAt;
        updatedTx = { ...existing, ...patch };
        lanTransactionsStore.set(transactionId, updatedTx);
        await upsertSqliteTransactions([updatedTx], 'lan-terminal', clientName || 'Kasir').catch((e: any) =>
          console.error('[SQLite Server] Gagal menyimpan status retur:', e?.message || e)
        );
      }
    }

    scheduleLanDbSave();
    if (!result.duplicate) {
      addLanLog('info', `${movementKind === 'void' ? 'Void' : 'Retur'} ${key} dari ${clientName || 'Kasir'}: stok ${result.updatedStocks.length} produk dikembalikan.`);
    }
    res.json({ success: true, duplicate: result.duplicate, updatedStocks: result.updatedStocks, transaction: updatedTx });
  } catch (err: any) {
    console.error('Error processing stock return:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Sync / Update Product Catalog on Master LAN Database
// Stok produk yang sudah ada TIDAK ditimpa di sini: stok hanya berubah lewat penjualan,
// retur/void, atau /stock-adjust (selisih), supaya edit produk di satu kasir tidak menimpa
// penjualan dari kasir lain. Produk baru memakai stok yang dikirim.
app.post('/api/lan/data/sync-products', async (req, res) => {
  try {
    const { products, auditNote } = req.body || {};
    if (!Array.isArray(products) || products.length > 5000) {
      return res.status(400).json({ success: false, error: 'products harus berupa array (maks. 5000)' });
    }

    const accepted: any[] = [];
    for (const p of products) {
      if (!p || typeof p.id !== 'string' || !p.id) continue;
      const existing = lanProductsStore.get(p.id);
      const next = existing ? { ...p, stock: existing.stock } : { ...p, stock: Math.max(0, Number(p.stock) || 0) };
      lanProductsStore.set(p.id, next);
      accepted.push(next);
    }

    await upsertSqliteProducts(accepted, { keepExistingStock: true }).catch((e: any) =>
      console.error('[SQLite Server] Gagal menyimpan produk:', e?.message || e)
    );
    scheduleLanDbSave();
    addLanLog('info', `Katalog produk diperbarui: ${accepted.length} item. ${typeof auditNote === 'string' ? auditNote.slice(0, 200) : ''}`);

    res.json({
      success: true,
      updatedStocks: accepted.map((p) => ({ productId: p.id, newStock: Number(p.stock) || 0 })),
      totalProductsInServer: lanProductsStore.size,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6b. Penyesuaian stok (stock opname, barang masuk, retur ke supplier, koreksi manual).
// Dikirim sebagai SELISIH (+/-), idempoten lewat kunci unik, sehingga aman digabung
// dengan penjualan dari kasir lain yang terjadi bersamaan.
app.post('/api/lan/data/stock-adjust', async (req, res) => {
  try {
    const { key, items, reason, clientName } = req.body || {};
    if (typeof key !== 'string' || !key.trim() || key.length > 200) {
      return res.status(400).json({ success: false, error: 'Kunci penyesuaian stok tidak valid.' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 5000) {
      return res.status(400).json({ success: false, error: 'Daftar penyesuaian stok tidak valid.' });
    }
    const movement: StockMovementItem[] = [];
    for (const it of items) {
      const delta = Number(it?.delta);
      if (typeof it?.productId !== 'string' || !it.productId || !Number.isFinite(delta) || Math.abs(delta) > 1e7) {
        return res.status(400).json({ success: false, error: 'Item penyesuaian stok tidak valid.' });
      }
      if (delta !== 0) movement.push({ productId: it.productId, delta });
    }

    const result = await applyStockMovement(`adjust:${key}`, 'adjust', movement);
    scheduleLanDbSave();
    if (!result.duplicate && movement.length > 0) {
      addLanLog('info', `Penyesuaian stok ${movement.length} produk dari ${clientName || 'Kasir'}${typeof reason === 'string' && reason ? ` (${reason.slice(0, 100)})` : ''}.`);
    }
    res.json({ success: true, duplicate: result.duplicate, updatedStocks: result.updatedStocks });
  } catch (err: any) {
    console.error('Error processing stock adjust:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic QR Shelf Tag Live Verification Endpoint
// Returns real-time inventory level, last price update date, and product info
app.get('/api/shelf/:productId', async (req, res) => {
  try {
    const rawId = req.params.productId;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    // 1. Check in-memory store first
    let product: any = lanProductsStore.get(rawId);

    // If not found by direct ID, search in-memory by barcode or SKU
    if (!product) {
      for (const p of lanProductsStore.values()) {
        if (p.barcode === rawId || p.sku === rawId) {
          product = p;
          break;
        }
      }
    }

    // 2. If not found in memory, check SQLite database
    if (!product) {
      const sqliteProd = await getSqliteProductByIdOrBarcode(rawId);
      if (sqliteProd) {
        product = sqliteProd;
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produk tidak ditemukan dalam katalog',
        productId: rawId,
      });
    }

    // Determine stock status
    const stock = Number(product.stock) || 0;
    const minStock = Number(product.minStock) || 5;
    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (stock <= 0) stockStatus = 'out_of_stock';
    else if (stock <= minStock) stockStatus = 'low_stock';

    // Determine last price update date
    let lastPriceUpdateDate = product.updatedAt || product.createdAt || new Date().toISOString();
    let previousSellingPrice: number | undefined = undefined;
    let changeType = 'catalog_sync';

    if (Array.isArray(product.priceHistory) && product.priceHistory.length > 0) {
      const sorted = [...product.priceHistory].sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      lastPriceUpdateDate = sorted[0].date;
      previousSellingPrice = sorted[0].previousSellingPrice;
      changeType = sorted[0].changeType;
    }

    // Halaman ini dibuka pembeli lewat QR rak: jangan kirim harga modal / data internal.
    res.json({
      success: true,
      product: toPublicProduct(product),
      currentStock: stock,
      minStock,
      stockStatus,
      price: Number(product.price) || 0,
      lastPriceUpdate: {
        date: lastPriceUpdateDate,
        previousPrice: previousSellingPrice,
        changeType,
      },
      aisle: product.aisle || null,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Seed or Overwrite Master Database from Client State
app.post('/api/lan/database/seed', adminOnly, async (req, res) => {
  try {
    const { products, customers, suppliers, transactions } = req.body;

    if (Array.isArray(products) && products.length > 0) {
      lanProductsStore.clear();
      products.forEach((p) => lanProductsStore.set(p.id, p));
    }
    if (Array.isArray(customers) && customers.length > 0) {
      lanCustomersStore.clear();
      customers.forEach((c) => lanCustomersStore.set(c.id, c));
    }
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      lanSuppliersStore.clear();
      suppliers.forEach((s) => lanSuppliersStore.set(s.id, s));
    }
    if (Array.isArray(transactions) && transactions.length > 0) {
      transactions.forEach((t) => putTransaction(t.id || t.invoiceNumber, t));
    }

    scheduleLanDbSave();
    const persistErrors: string[] = [];
    const persist = async (label: string, run: () => Promise<unknown>) => {
      try {
        await run();
      } catch (e: any) {
        persistErrors.push(`${label}: ${e?.message || e}`);
        console.error(`[SQLite Server] Gagal menyimpan ${label} saat seed:`, e?.message || e);
      }
    };
    if (Array.isArray(products) && products.length > 0) await persist('produk', () => upsertSqliteProducts(products));
    if (Array.isArray(customers) && customers.length > 0) await persist('member', () => upsertSqliteCustomers(customers));
    if (Array.isArray(suppliers) && suppliers.length > 0) await persist('supplier', () => upsertSqliteSuppliers(suppliers));
    if (Array.isArray(transactions) && transactions.length > 0) await persist('transaksi', () => upsertSqliteTransactions(transactions, 'seed-client', 'Admin'));
    addLanLog('warn', `Master Server Database di-seed ulang (SQLite Relational WAL): ${lanProductsStore.size} produk, ${lanCustomersStore.size} member, ${lanTransactionsStore.size} transaksi.`);

    res.status(persistErrors.length === 0 ? 200 : 500).json({
      success: persistErrors.length === 0,
      persisted: persistErrors.length === 0,
      persistErrors,
      message: persistErrors.length === 0
        ? 'Master database server berhasil diperbarui dari data kasir lokal.'
        : 'Data masuk ke memori server, tetapi sebagian GAGAL disimpan ke database: ' + persistErrors.join('; '),
      stats: {
        products: lanProductsStore.size,
        customers: lanCustomersStore.size,
        suppliers: lanSuppliersStore.size,
        transactions: lanTransactionsStore.size,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Shared Held Orders (Order Parking across any LAN terminal)
app.get('/api/lan/orders/held', (req, res) => {
  res.json({
    success: true,
    heldOrders: Array.from(lanHeldOrdersStore.values()),
  });
});

app.post('/api/lan/orders/held', (req, res) => {
  try {
    const { heldOrder, clientName } = req.body;
    if (!heldOrder || !heldOrder.id) {
      return res.status(400).json({ success: false, error: 'heldOrder wajib memiliki id' });
    }

    const orderWithTerminal = {
      ...heldOrder,
      parkedAtTerminal: clientName || 'Kasir',
      parkedAtTime: new Date().toISOString(),
    };

    lanHeldOrdersStore.set(heldOrder.id, orderWithTerminal);
    saveSqliteHeldOrder(orderWithTerminal).catch((e) => addLanLog('warn', `Gagal menyimpan pesanan parkir ke database: ${e?.message || e}`));
    scheduleLanDbSave();
    addLanLog('info', `Pesanan #${heldOrder.id.slice(-6)} diparkir oleh ${clientName || 'Kasir'}. Bisa dipanggil di kasir manapun.`);

    res.json({
      success: true,
      heldOrder: orderWithTerminal,
      totalHeldOrders: lanHeldOrdersStore.size,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/lan/orders/held/:id', (req, res) => {
  const { id } = req.params;
  const existed = lanHeldOrdersStore.has(id);
  lanHeldOrdersStore.delete(id);
  deleteSqliteHeldOrder(id).catch((e) => addLanLog('warn', `Gagal menghapus pesanan parkir dari database: ${e?.message || e}`));
  if (existed) {
    scheduleLanDbSave();
    addLanLog('info', `Pesanan parkir #${id.slice(-6)} telah diambil & diselesaikan.`);
  }
  res.json({ success: true, removed: existed, remaining: lanHeldOrdersStore.size });
});

// 9. Central POS Sync & Relational Database Layer
app.get('/api/pos/sync-status', async (req, res) => {
  try {
    const dbStatus = await getSqliteDatabaseStatus();
    res.json({
      status: 'online',
      cloudSynced: true,
      database: 'SQLite Relational (WAL Mode)',
      journalMode: dbStatus.journalMode || 'wal',
      integrity: dbStatus.integrity || 'ok',
      fileSizeKb: dbStatus.fileSizeKb || 0,
      counts: dbStatus.counts,
      serverTime: new Date().toISOString(),
      totalCloudTransactions: dbStatus.counts.transactions || lanTransactionsStore.size,
      lanStatus: {
        activeClients: lanActiveClientsStore.size,
        productsCount: dbStatus.counts.products || lanProductsStore.size,
      },
    });
  } catch {
    res.json({
      status: 'online',
      cloudSynced: true,
      database: 'SQLite Relational (WAL Mode)',
      serverTime: new Date().toISOString(),
      totalCloudTransactions: lanTransactionsStore.size,
      lanStatus: {
        activeClients: lanActiveClientsStore.size,
        productsCount: lanProductsStore.size,
      },
    });
  }
});

app.get('/api/pos/database/status', async (req, res) => {
  try {
    const status = await getSqliteDatabaseStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/database/check-integrity', adminOnly, async (req, res) => {
  try {
    const check = await checkSqliteIntegrity();
    res.json({
      success: true,
      ...check,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Prune obsolete database records, truncate WAL file, and run VACUUM
app.post('/api/pos/database/clean-obsolete', adminOnly, async (req, res) => {
  try {
    const result = await cleanSqliteDatabase();
    res.json({
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/transactions/sync', async (req, res) => {
  try {
    const { transactions, deviceId, cashierName } = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ success: false, error: 'Data transaksi tidak valid' });
    }

    const now = new Date().toISOString();
    const syncedIds: string[] = [];

    const rejected: Array<{ id: string; error: string }> = [];
    const validTransactions: any[] = [];
    for (const tx of transactions) {
      if (!tx || (!tx.id && !tx.invoiceNumber)) continue;
      const key = tx.id || tx.invoiceNumber;
      const txError = validateTransaction(tx);
      if (txError) {
        rejected.push({ id: String(key), error: txError });
        continue;
      }
      const stored = putTransaction(key, {
        ...tx,
        syncStatus: 'synced',
        syncedAt: now,
        syncedByDevice: deviceId || 'pos-terminal',
        syncedByCashier: cashierName || 'Kasir',
      });
      validTransactions.push(stored);
      syncedIds.push(key);
    }

    // Simpan ke SQLite. Bila sekaligus gagal, coba satu per satu agar satu transaksi
    // bermasalah tidak menggagalkan yang lain, dan HANYA laporkan yang benar-benar tersimpan.
    try {
      await upsertSqliteTransactions(validTransactions, deviceId || 'pos-terminal', cashierName || 'Kasir');
    } catch (batchErr: any) {
      console.warn('[SQLite Server] Simpan sekaligus gagal, mencoba satu per satu:', batchErr?.message || batchErr);
      for (const tx of validTransactions) {
        const key = String(tx.id || tx.invoiceNumber);
        try {
          await upsertSqliteTransactions([tx], deviceId || 'pos-terminal', cashierName || 'Kasir');
        } catch (e: any) {
          console.error('[SQLite Server] Gagal menyimpan transaksi', key, e?.message || e);
          const idx = syncedIds.indexOf(key);
          if (idx > -1) syncedIds.splice(idx, 1);
          rejected.push({ id: key, error: 'Gagal disimpan di database server: ' + (e?.message || e) });
        }
      }
    }

    scheduleLanDbSave();
    res.json({
      success: true,
      syncedCount: syncedIds.length,
      syncedIds,
      rejected,
      serverTime: now,
      database: 'SQLite Relational (WAL Mode)',
      totalCloudTransactions: lanTransactionsStore.size,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/transactions', async (req, res) => {
  try {
    const tx = req.body;
    if (!tx || (!tx.id && !tx.invoiceNumber)) {
      return res.status(400).json({ success: false, error: 'Transaksi tidak valid' });
    }
    const txError = validateTransaction(tx);
    if (txError) {
      return res.status(400).json({ success: false, error: txError });
    }
    const key = tx.id || tx.invoiceNumber;
    const stored = putTransaction(key, tx);

    // Simpan ke SQLite; bila gagal, jawab error agar kasir menyimpannya di antrean offline
    try {
      await upsertSqliteTransactions([stored]);
    } catch (e: any) {
      console.error('[SQLite Server] Gagal menyimpan transaksi:', e?.message || e);
      scheduleLanDbSave();
      return res.status(500).json({ success: false, error: 'Transaksi gagal disimpan di database server.' });
    }

    scheduleLanDbSave();
    res.json({ success: true, transaction: tx, serverTime: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pos/transactions', async (req, res) => {
  try {
    const {
      page,
      limit,
      pageSize,
      cursor,
      startDate,
      endDate,
      from,
      to,
      preset,
      paymentMethod,
      method,
      syncStatus,
      search,
      q,
      all,
    } = req.query;

    // If 'all=true' explicitly requested (e.g., full backup export), return up to 5000 transactions
    if (all === 'true' || all === '1') {
      const list = await getSqliteTransactions(5000);
      return res.json({ success: true, count: list.length, totalCount: list.length, transactions: list });
    }

    let computedStartDate = (startDate || from) as string | undefined;
    let computedEndDate = (endDate || to) as string | undefined;

    // Handle preset 'today' if explicitly passed
    if (preset === 'today') {
      // Hari ini menurut jam komputer server (WIB), bukan UTC
      const now = new Date();
      computedStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      computedEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    }

    const paginated = await querySqliteTransactionsPaginated({
      page: page ? parseInt(String(page), 10) : 1,
      pageSize: pageSize || limit ? parseInt(String(pageSize || limit), 10) : 25,
      cursor: cursor ? String(cursor) : undefined,
      startDate: computedStartDate,
      endDate: computedEndDate,
      paymentMethod: (paymentMethod || method) ? String(paymentMethod || method) : undefined,
      syncStatus: syncStatus ? String(syncStatus) : undefined,
      search: (search || q) ? String(search || q) : undefined,
    });

    res.json({
      success: true,
      ...paginated,
      count: paginated.transactions.length,
    });
  } catch (err: any) {
    console.warn('[Transactions API] Error in paginated query, using fallback:', err?.message || err);
    const list = Array.from(lanTransactionsStore.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    res.json({
      success: true,
      transactions: list.slice(0, 25),
      totalCount: list.length,
      totalSalesAmount: list.reduce((sum, t) => sum + (t.finalTotal || 0), 0),
      page: 1,
      pageSize: 25,
      totalPages: Math.ceil(list.length / 25) || 1,
      hasNextPage: list.length > 25,
      hasPrevPage: false,
      nextCursor: null,
      period: {},
      count: Math.min(25, list.length),
    });
  }
});

// Endpoint AI, pencarian online, dan sistem ada di src/server/routes/
app.use(aiRouter);
app.use(onlineRouter);
app.use(systemRouter);

// Vite Middleware for development & Static Serving for production
async function setupViteOrStatic() {
  // Serve public folder assets
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  const distAssets = path.join(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(distAssets)) {
    app.use('/assets', express.static(distAssets));
  }

  // Mode produksi: NODE_ENV=production, atau menjalankan bundel hasil build (dist/server.cjs)
  // yang sudah punya dist/index.html. Sebelumnya `node dist/server.cjs` tanpa NODE_ENV
  // diam-diam menjalankan server dev Vite.
  const runningBundle = typeof __filename !== 'undefined' && path.basename(__filename) === 'server.cjs';
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (runningBundle && fs.existsSync(path.join(process.cwd(), 'dist', 'index.html')));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5: penangkap semua rute memakai sintaks path-to-regexp v8
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await dbReady;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ulilmart Retail Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
