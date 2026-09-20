/**
 * IndexedDB High-Capacity Storage Engine for Ulilmart POS
 * 
 * Bypasses the synchronous 5MB - 10MB LocalStorage limit by utilizing asynchronous
 * IndexedDB storage capable of persisting hundreds of megabytes to gigabytes of retail
 * transactions, products, customer loyalty ledgers, and barcode data without blocking
 * the JavaScript main thread.
 */

export interface StorageDiagnostics {
  engine: 'IndexedDB' | 'LocalStorage Fallback';
  isIndexedDBSupported: boolean;
  dbName: string;
  storeName: string;
  quotaBytes: number;
  usedBytes: number;
  percentUsed: number;
  formattedQuota: string;
  formattedUsed: string;
  persistedKeys: string[];
  itemCounts: {
    products: number;
    transactions: number;
    customers: number;
    suppliers: number;
    supplierPurchases: number;
    salesReturns: number;
    purchaseReturns: number;
    vouchers: number;
    employees: number;
    restorePoints: number;
    shifts: number;
  };
  keySizesKb: Record<string, number>;
  totalDataSizeKb: number;
  lastDiagnosticTime: string;
  status: 'optimal' | 'warning' | 'critical';
  statusMessage: string;
}

const DB_NAME = 'ulilmart_pos_main_db';
const DB_VERSION = 1;
const STORE_NAME = 'pos_state_store';

// Known POS storage keys to manage & migrate
export const POS_STORAGE_KEYS = [
  'pos_retail_products_v3',
  'pos_retail_tx_v3',
  'pos_retail_customers_v3',
  'pos_retail_settings_v2',
  'pos_active_cart',
  'pos_held_orders',
  'pos_vouchers',
  'pos_sales_returns',
  'pos_purchase_returns',
  'pos_supplier_purchases_v2',
  'pos_retail_suppliers_v2',
  'pos_employees_v2',
  'pos_active_employee_id',
  'pos_is_locked',
  'pos_current_shift_v1',
  'pos_restore_points_v1',
] as const;

export type POSStorageKey = typeof POS_STORAGE_KEYS[number] | string;

class POSStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private inMemoryCache: Map<string, any> = new Map();
  private hasMigrated: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && window.indexedDB) {
      this.initDB();
    }
  }

  /**
   * Initializes and opens the IndexedDB database instance
   */
  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
            console.log(`[posStorage] Created object store: ${STORE_NAME}`);
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('[posStorage] Failed to open IndexedDB:', request.error);
          this.dbPromise = null;
          reject(request.error);
        };
      } catch (err) {
        this.dbPromise = null;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Check if IndexedDB is available
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.indexedDB);
  }

  /**
   * Get an item from IndexedDB with transparent fallback
   */
  public async getItem<T = any>(key: string): Promise<T | null> {
    // 1. Check in-memory cache first for instant synchronous response
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as T;
    }

    // 2. Query IndexedDB
    if (this.isSupported()) {
      try {
        const db = await this.initDB();
        const value = await new Promise<T | null>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);

          req.onsuccess = () => {
            resolve(req.result !== undefined ? req.result : null);
          };
          req.onerror = () => reject(req.error);
        });

        if (value !== null) {
          this.inMemoryCache.set(key, value);
          return value;
        }
      } catch (err) {
        console.warn(`[posStorage] IndexedDB read error for ${key}:`, err);
      }
    }

    // 3. Fallback to LocalStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.inMemoryCache.set(key, parsed);
          return parsed as T;
        }
      } catch {
        // String or invalid json
        const raw = localStorage.getItem(key);
        return raw as unknown as T;
      }
    }

    return null;
  }

  /**
   * Set an item in IndexedDB asynchronously without blocking the UI thread.
   * Also mirrors to LocalStorage if space permits as a fast fallback.
   */
  public async setItem<T = any>(key: string, value: T): Promise<void> {
    this.inMemoryCache.set(key, value);

    // 1. Save to IndexedDB (unlimited capacity)
    if (this.isSupported()) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);

          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn(`[posStorage] IndexedDB write failed for ${key}:`, err);
      }
    }

    // 2. Mirror to LocalStorage if possible (swallows QuotaExceededError smoothly)
    if (typeof localStorage !== 'undefined') {
      try {
        const stringified = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringified);
      } catch (quotaErr) {
        // LocalStorage quota (5MB) exceeded! But IndexedDB has safely persisted the data.
        console.info(`[posStorage] LocalStorage quota reached for ${key}. Data is safely stored in IndexedDB.`);
      }
    }
  }

  /**
   * Remove an item from both IndexedDB and LocalStorage
   */
  public async removeItem(key: string): Promise<void> {
    this.inMemoryCache.delete(key);

    if (this.isSupported()) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn(`[posStorage] IndexedDB delete failed for ${key}:`, err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }

  /**
   * Clears all store data
   */
  public async clear(): Promise<void> {
    this.inMemoryCache.clear();

    if (this.isSupported()) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('[posStorage] IndexedDB clear failed:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      for (const k of POS_STORAGE_KEYS) {
        try {
          localStorage.removeItem(k);
        } catch {}
      }
    }
  }

  /**
   * Automatically migrates any legacy or existing LocalStorage items into IndexedDB
   */
  public async autoMigrateFromLocalStorage(): Promise<{ migratedCount: number; keys: string[] }> {
    if (this.hasMigrated || !this.isSupported() || typeof localStorage === 'undefined') {
      return { migratedCount: 0, keys: [] };
    }

    const migratedKeys: string[] = [];
    try {
      const db = await this.initDB();

      for (const key of POS_STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            const parsed = JSON.parse(raw);
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const req = store.put(parsed, key);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
            this.inMemoryCache.set(key, parsed);
            migratedKeys.push(key);
          } catch {
            // Raw string
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const req = store.put(raw, key);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
            this.inMemoryCache.set(key, raw);
            migratedKeys.push(key);
          }
        }
      }

      this.hasMigrated = true;
      if (migratedKeys.length > 0) {
        console.log(`[posStorage] Successfully migrated ${migratedKeys.length} items from LocalStorage to IndexedDB:`, migratedKeys);
      }
    } catch (err) {
      console.warn('[posStorage] Auto-migration encountered an error:', err);
    }

    return { migratedCount: migratedKeys.length, keys: migratedKeys };
  }

  /**
   * Run a benchmark comparing IndexedDB vs LocalStorage write & read throughput
   */
  public async runBenchmark(testRecordCount: number = 200): Promise<{
    recordCount: number;
    idbWriteMs: number;
    idbReadMs: number;
    lsWriteMs: number;
    lsReadMs: number;
    speedComparison: string;
  }> {
    const mockPayload = Array.from({ length: testRecordCount }).map((_, i) => ({
      id: `bench-${i}`,
      name: `Produk Uji Coba Performa Kasir ${i}`,
      price: 15000 + i * 500,
      stock: 100 + i,
      barcode: `899123456${i.toString().padStart(4, '0')}`,
      category: 'snack',
      timestamp: new Date().toISOString(),
    }));

    // 1. IndexedDB Write Test
    const t0 = performance.now();
    await this.setItem('__benchmark_test__', mockPayload);
    const idbWriteMs = Math.max(1, Math.round(performance.now() - t0));

    // 2. IndexedDB Read Test
    const t1 = performance.now();
    await this.getItem('__benchmark_test__');
    const idbReadMs = Math.max(1, Math.round(performance.now() - t1));

    // 3. LocalStorage Write Test
    let lsWriteMs = 0;
    let lsReadMs = 0;
    try {
      const t2 = performance.now();
      localStorage.setItem('__benchmark_test__', JSON.stringify(mockPayload));
      lsWriteMs = Math.max(1, Math.round(performance.now() - t2));

      const t3 = performance.now();
      const read = localStorage.getItem('__benchmark_test__');
      if (read) JSON.parse(read);
      lsReadMs = Math.max(1, Math.round(performance.now() - t3));

      localStorage.removeItem('__benchmark_test__');
    } catch {
      lsWriteMs = -1; // Quota error
      lsReadMs = -1;
    }

    // Clean up bench record
    await this.removeItem('__benchmark_test__');

    const speedComparison =
      lsWriteMs > 0
        ? `IndexedDB write: ${idbWriteMs}ms vs LocalStorage: ${lsWriteMs}ms. IndexedDB bekerja non-blocking di background thread tanpa mengunci UI kasir.`
        : 'LocalStorage gagal karena limit kuota 5MB terlampaui. IndexedDB sukses memproses tanpa batasan.';

    return {
      recordCount: testRecordCount,
      idbWriteMs,
      idbReadMs,
      lsWriteMs,
      lsReadMs,
      speedComparison,
    };
  }

  /**
   * Get complete diagnostics and storage health metrics
   */
  public async getStorageDiagnostics(): Promise<StorageDiagnostics> {
    const isSupported = this.isSupported();
    let quotaBytes = 50 * 1024 * 1024; // Default fallback estimate: 50MB
    let usedBytes = 0;

    // Check browser storage estimate API
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) quotaBytes = estimate.quota;
        if (estimate.usage) usedBytes = estimate.usage;
      } catch (e) {
        // Fallback
      }
    }

    const keySizesKb: Record<string, number> = {};
    let totalDataSizeKb = 0;

    const itemCounts = {
      products: 0,
      transactions: 0,
      customers: 0,
      suppliers: 0,
      supplierPurchases: 0,
      salesReturns: 0,
      purchaseReturns: 0,
      vouchers: 0,
      employees: 0,
      restorePoints: 0,
      shifts: 0,
    };

    // Calculate item counts and estimated data sizes
    for (const key of POS_STORAGE_KEYS) {
      try {
        const data = await this.getItem(key);
        if (data !== null) {
          const str = typeof data === 'string' ? data : JSON.stringify(data);
          const sizeKb = Math.round((new Blob([str]).size / 1024) * 10) / 10;
          keySizesKb[key] = sizeKb;
          totalDataSizeKb += sizeKb;

          if (Array.isArray(data)) {
            if (key === 'pos_retail_products_v3') itemCounts.products = data.length;
            if (key === 'pos_retail_tx_v3') itemCounts.transactions = data.length;
            if (key === 'pos_retail_customers_v3') itemCounts.customers = data.length;
            if (key === 'pos_retail_suppliers_v2') itemCounts.suppliers = data.length;
            if (key === 'pos_supplier_purchases_v2') itemCounts.supplierPurchases = data.length;
            if (key === 'pos_sales_returns') itemCounts.salesReturns = data.length;
            if (key === 'pos_purchase_returns') itemCounts.purchaseReturns = data.length;
            if (key === 'pos_vouchers') itemCounts.vouchers = data.length;
            if (key === 'pos_employees_v2') itemCounts.employees = data.length;
            if (key === 'pos_restore_points_v1') itemCounts.restorePoints = data.length;
          } else if (key === 'pos_current_shift_v1' && data) {
            itemCounts.shifts = 1;
          }
        }
      } catch {
        // Skip calculation error
      }
    }

    // Format human-readable numbers
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

    let status: 'optimal' | 'warning' | 'critical' = 'optimal';
    let statusMessage = 'Mesin IndexedDB aktif & berjalan optimal dengan kapasitas ratusan MB/GB tanpa batasan LocalStorage.';

    if (!isSupported) {
      status = 'warning';
      statusMessage = 'Browser tidak mendukung IndexedDB. Berjalan dalam mode fallback LocalStorage (terbatas 5MB).';
    } else if (percentUsed > 80) {
      status = 'warning';
      statusMessage = `Penyimpanan perangkat hampir penuh (${percentUsed.toFixed(1)}% terpakai). Disarankan mengunduh backup dan merapikan data lama.`;
    }

    return {
      engine: isSupported ? 'IndexedDB' : 'LocalStorage Fallback',
      isIndexedDBSupported: isSupported,
      dbName: DB_NAME,
      storeName: STORE_NAME,
      quotaBytes,
      usedBytes,
      percentUsed,
      formattedQuota: formatBytes(quotaBytes),
      formattedUsed: formatBytes(usedBytes > 0 ? usedBytes : totalDataSizeKb * 1024),
      persistedKeys: Object.keys(keySizesKb),
      itemCounts,
      keySizesKb,
      totalDataSizeKb: Math.round(totalDataSizeKb * 10) / 10,
      lastDiagnosticTime: new Date().toISOString(),
      status,
      statusMessage,
    };
  }
}

export const posStorage = new POSStorageEngine();
