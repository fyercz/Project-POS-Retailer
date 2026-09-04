// Ulilmart POS Service Worker - Offline Caching & Background Sync
const CACHE_NAME = 'ulilmart-pos-v1';
const DB_NAME = 'pos_retail_offline_db';
const DB_STORE = 'pending_transactions';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// 1. Install Event: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache asset warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Cleanup outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate for app assets, Network-First for API
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass non-GET and chrome-extension schemes
  if (event.request.method !== 'GET' || !requestUrl.protocol.startsWith('http')) {
    return;
  }

  // API endpoints: network-first, do not cache API errors
  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // Static assets and navigation: Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting navigation, return cached index.html
          if (event.request.mode === 'navigate') {
            return cache.match('/') || cache.match('/index.html');
          }
          return cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Sync API: Automatically triggered by browser when connection restores
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pos-transactions') {
    console.log('[SW] Background Sync triggered: tag="sync-pos-transactions"');
    event.waitUntil(syncPendingTransactionsFromSW());
  }
});

// Helper: Open IndexedDB in Service Worker context
function openSWIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push all pending transactions from IndexedDB to Cloud
async function syncPendingTransactionsFromSW() {
  try {
    const db = await openSWIndexedDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);

    const getAllReq = store.getAll();
    const pendingTransactions = await new Promise((resolve, reject) => {
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    });

    if (!pendingTransactions || pendingTransactions.length === 0) {
      console.log('[SW] No pending transactions to sync in IndexedDB.');
      return;
    }

    console.log(`[SW] Found ${pendingTransactions.length} pending transactions to sync to cloud.`);

    const response = await fetch('/api/pos/transactions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: pendingTransactions,
        deviceId: 'service-worker-bg-sync',
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloud server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('[SW] Cloud sync success:', result);

    // Remove synced transactions from IndexedDB
    const writeTx = db.transaction(DB_STORE, 'readwrite');
    const writeStore = writeTx.objectStore(DB_STORE);
    for (const item of pendingTransactions) {
      writeStore.delete(item.id);
    }

    // Broadcast to all open window tabs
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({
        type: 'BACKGROUND_SYNC_SUCCESS',
        syncedCount: pendingTransactions.length,
        syncedIds: pendingTransactions.map((t) => t.id),
        serverTime: result.serverTime || new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[SW] Background sync attempt encountered error:', err);
    throw err; // Re-throw to allow browser retry if desired
  }
}

// 5. Message Event: Handle manual requests from frontend
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'TRIGGER_SYNC') {
    event.waitUntil(syncPendingTransactionsFromSW());
  }
});
