import { Transaction, OfflineSyncState, CloudSyncResult } from '../types';

const DB_NAME = 'pos_retail_offline_db';
const DB_VERSION = 1;
const STORE_PENDING = 'pending_transactions';
const STORE_SYNCED = 'synced_transactions';
const LOCAL_STORAGE_FALLBACK_KEY = 'pos_offline_pending_txs_backup';

type StateListener = (state: OfflineSyncState) => void;

class OfflineSyncManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<StateListener> = new Set();
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private isSyncingNow: boolean = false;
  private lastSyncTime: string | null = null;
  private pendingCountCached: number = 0;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private bgSyncSupported: boolean = false;
  private pingIntervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check saved simulation state
      this.isSimulatedOffline = localStorage.getItem('pos_offline_simulation') === 'true';
      this.lastSyncTime = localStorage.getItem('pos_last_cloud_sync_time');
      this.init();
    }
  }

  // 1. Initialize DB, SW & Network Listeners
  private async init() {
    this.initIndexedDB();
    this.setupNetworkListeners();
    this.registerServiceWorker();
    await this.refreshPendingCount();

    // If online at boot and has pending items, attempt initial sync
    if (this.isOnline()) {
      setTimeout(() => {
        this.syncPendingTransactions().catch(() => {});
      }, 1500);
    }
  }

  // Open IndexedDB with automatic schema creation
  private initIndexedDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_PENDING)) {
          db.createObjectStore(STORE_PENDING, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SYNCED)) {
          db.createObjectStore(STORE_SYNCED, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[OfflineManager] IndexedDB open failed, using localStorage fallback:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Setup Online / Offline listeners & periodic active ping
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[OfflineManager] Network event: ONLINE');
      this.checkRealConnectivity();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineManager] Network event: OFFLINE');
      this.isOnlineStatus = false;
      this.notifyListeners();
    });

    // Active heartbeat check every 25 seconds
    this.pingIntervalId = setInterval(() => {
      if (!this.isSimulatedOffline) {
        this.checkRealConnectivity();
      }
    }, 25000);
  }

  // Verify real connectivity with short timeout
  public async checkRealConnectivity(): Promise<boolean> {
    if (this.isSimulatedOffline) {
      this.isOnlineStatus = false;
      this.notifyListeners();
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/pos/sync-status', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const wasOffline = !this.isOnlineStatus;
      this.isOnlineStatus = res.ok;

      // If connection was restored, trigger background push!
      if (wasOffline && this.isOnlineStatus) {
        console.log('[OfflineManager] Connection restored! Triggering cloud push...');
        this.syncPendingTransactions().catch((err) => {
          console.warn('[OfflineManager] Auto push after reconnect error:', err);
        });
      }

      this.notifyListeners();
      return this.isOnlineStatus;
    } catch {
      this.isOnlineStatus = false;
      this.notifyListeners();
      return false;
    }
  }

  // Register Service Worker and inspect Background Sync support
  private async registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      this.bgSyncSupported = 'SyncManager' in window;

      console.log('[OfflineManager] Service Worker registered. Background Sync supported:', this.bgSyncSupported);

      // Listen for messages from SW (e.g. background sync completed)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'BACKGROUND_SYNC_SUCCESS') {
          console.log('[OfflineManager] Background sync success from SW:', event.data);
          this.refreshPendingCount();
          this.lastSyncTime = event.data.serverTime || new Date().toISOString();
          localStorage.setItem('pos_last_cloud_sync_time', this.lastSyncTime);
          this.notifyListeners();

          window.dispatchEvent(
            new CustomEvent('pos-transactions-synced', {
              detail: { count: event.data.syncedCount, syncedIds: event.data.syncedIds },
            })
          );
        }
      });
    } catch (err) {
      console.warn('[OfflineManager] Service Worker registration failed:', err);
    }
  }

  // Request browser Background Sync tag
  private async requestBackgroundSync() {
    if (this.swRegistration && 'sync' in this.swRegistration) {
      try {
        await (this.swRegistration as any).sync.register('sync-pos-transactions');
        console.log('[OfflineManager] Background Sync registered tag: sync-pos-transactions');
      } catch (err) {
        console.warn('[OfflineManager] Could not register background sync:', err);
      }
    }
  }

  // 2. Queue & Storage Methods
  public async savePendingTransaction(tx: Transaction): Promise<void> {
    const enrichedTx: Transaction = {
      ...tx,
      syncStatus: 'pending_sync',
      offlineCreated: !this.isOnline(),
      syncRetryCount: (tx.syncRetryCount || 0),
    };

    try {
      const db = await this.initIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const trans = db.transaction(STORE_PENDING, 'readwrite');
        const store = trans.objectStore(STORE_PENDING);
        const req = store.put(enrichedTx);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage
      this.saveToLocalStorageFallback(enrichedTx);
    }

    await this.refreshPendingCount();
    await this.requestBackgroundSync();

    // Also notify SW if active
    if (this.swRegistration?.active) {
      this.swRegistration.active.postMessage({ type: 'NEW_PENDING_TRANSACTION', id: enrichedTx.id });
    }
  }

  // Retrieve all pending transactions
  public async getPendingTransactions(): Promise<Transaction[]> {
    try {
      const db = await this.initIndexedDB();
      const items = await new Promise<Transaction[]>((resolve, reject) => {
        const trans = db.transaction(STORE_PENDING, 'readonly');
        const store = trans.objectStore(STORE_PENDING);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      // Merge with localStorage fallback items if any
      const fallbackItems = this.getLocalStorageFallback();
      const combinedMap = new Map<string, Transaction>();
      for (const item of items) combinedMap.set(item.id, item);
      for (const item of fallbackItems) combinedMap.set(item.id, item);

      return Array.from(combinedMap.values());
    } catch {
      return this.getLocalStorageFallback();
    }
  }

  // Remove transaction from pending after successful cloud sync
  public async markTransactionSynced(txId: string, syncedAt: string): Promise<void> {
    try {
      const db = await this.initIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const trans = db.transaction([STORE_PENDING, STORE_SYNCED], 'readwrite');
        const pendingStore = trans.objectStore(STORE_PENDING);
        const syncedStore = trans.objectStore(STORE_SYNCED);

        const getReq = pendingStore.get(txId);
        getReq.onsuccess = () => {
          const item = getReq.result;
          if (item) {
            item.syncStatus = 'synced';
            item.syncedAt = syncedAt;
            syncedStore.put(item);
            pendingStore.delete(txId);
          }
          resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      });
    } catch {
      this.removeFromLocalStorageFallback(txId);
    }
  }

  // Fallback storage helpers
  private saveToLocalStorageFallback(tx: Transaction) {
    try {
      const existing = this.getLocalStorageFallback();
      const filtered = existing.filter((item) => item.id !== tx.id);
      filtered.push(tx);
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('[OfflineManager] LocalStorage quota exceeded:', e);
    }
  }

  private getLocalStorageFallback(): Transaction[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private removeFromLocalStorageFallback(txId: string) {
    try {
      const existing = this.getLocalStorageFallback();
      const filtered = existing.filter((item) => item.id !== txId);
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(filtered));
    } catch {}
  }

  // 3. Core Sync Engine: Push pending transactions to Cloud
  public async syncPendingTransactions(): Promise<CloudSyncResult> {
    if (this.isSyncingNow) {
      return { success: false, syncedCount: 0, syncedIds: [], error: 'Sinkronisasi sedang berlangsung' };
    }

    if (!this.isOnline()) {
      return { success: false, syncedCount: 0, syncedIds: [], error: 'Perangkat sedang dalam mode offline' };
    }

    const pending = await this.getPendingTransactions();
    if (pending.length === 0) {
      return { success: true, syncedCount: 0, syncedIds: [] };
    }

    this.isSyncingNow = true;
    this.notifyListeners();

    try {
      console.log(`[OfflineManager] Pushing ${pending.length} pending transactions to cloud...`);

      const res = await fetch('/api/pos/transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: pending,
          deviceId: 'pos-main-client',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server HTTP ${res.status}`);
      }

      const result: CloudSyncResult = await res.json();
      const now = result.serverTime || new Date().toISOString();

      // Clean up synced items from local pending queue
      for (const id of result.syncedIds || pending.map((t) => t.id)) {
        await this.markTransactionSynced(id, now);
        this.removeFromLocalStorageFallback(id);
      }

      this.lastSyncTime = now;
      localStorage.setItem('pos_last_cloud_sync_time', now);
      await this.refreshPendingCount();

      // Dispatch event to update UI & toast
      window.dispatchEvent(
        new CustomEvent('pos-transactions-synced', {
          detail: {
            count: result.syncedCount || pending.length,
            syncedIds: result.syncedIds,
          },
        })
      );

      console.log(`[OfflineManager] Successfully synced ${result.syncedCount} transactions to cloud.`);
      return result;
    } catch (err: any) {
      console.warn('[OfflineManager] Cloud sync failed:', err);
      // Increment retry counts
      for (const tx of pending) {
        tx.syncRetryCount = (tx.syncRetryCount || 0) + 1;
        await this.savePendingTransaction(tx);
      }
      return {
        success: false,
        syncedCount: 0,
        syncedIds: [],
        error: err.message || 'Gagal terhubung ke cloud server',
      };
    } finally {
      this.isSyncingNow = false;
      this.notifyListeners();
    }
  }

  // 4. Online / Offline state getters & simulation
  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return this.isOnlineStatus;
  }

  public isOfflineSimulated(): boolean {
    return this.isSimulatedOffline;
  }

  public toggleOfflineSimulation(enable?: boolean): boolean {
    const next = enable !== undefined ? enable : !this.isSimulatedOffline;
    this.isSimulatedOffline = next;
    localStorage.setItem('pos_offline_simulation', next ? 'true' : 'false');
    console.log(`[OfflineManager] Offline simulation mode: ${next ? 'ACTIVE (SIMULATED OFFLINE)' : 'DISABLED (REAL NETWORK)'}`);

    if (!next) {
      // Re-check real connectivity and push pending
      this.checkRealConnectivity();
    } else {
      this.notifyListeners();
    }

    return this.isSimulatedOffline;
  }

  public async refreshPendingCount(): Promise<number> {
    try {
      const items = await this.getPendingTransactions();
      this.pendingCountCached = items.length;
    } catch {
      this.pendingCountCached = this.getLocalStorageFallback().length;
    }
    this.notifyListeners();
    return this.pendingCountCached;
  }

  public getPendingCount(): number {
    return this.pendingCountCached;
  }

  public getState(): OfflineSyncState {
    return {
      isOnline: this.isOnline(),
      isOfflineSimulated: this.isSimulatedOffline,
      isSyncing: this.isSyncingNow,
      pendingCount: this.pendingCountCached,
      lastSyncTime: this.lastSyncTime,
      serviceWorkerActive: !!this.swRegistration?.active,
      backgroundSyncSupported: this.bgSyncSupported,
    };
  }

  // 5. Subscription for React components
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[OfflineManager] Listener error:', err);
      }
    });
  }
}

// Global Singleton Instance
export const offlineSyncManager = new OfflineSyncManager();
