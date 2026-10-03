// Ulilmart POS Service Worker - Self-cleaning & Auto-Unregister
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    })
    .then(() => self.registration.unregister())
    .then(() => self.clients.claim())
    .then(() => {
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url).catch(() => {});
          }
        }
      });
    })
  );
});

// Do not intercept any fetch requests to ensure Vite/browser always fetches live files
self.addEventListener('fetch', () => {
  // Pass-through to network
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
