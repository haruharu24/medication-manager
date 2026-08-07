/*
 * Service worker for MediMate: shows push reminders, lets the user record a dose
 * with one tap directly from the notification, and caches the app shell so the
 * app still opens (with whatever was last synced to localStorage) when offline.
 *
 * Plain JS (this file is served as-is from public/, not bundled) — keep DB_NAME /
 * DB_VERSION / STORE_NAME in sync with utils/pendingActionsDb.ts.
 *
 * Bump SHELL_CACHE's version suffix whenever this file's caching behavior
 * changes, so the activate handler evicts the previous version's cache.
 */

const DB_NAME = 'medimate-db';
const DB_VERSION = 1;
const STORE_NAME = 'pendingActions';

const SHELL_CACHE = 'medimate-shell-v1';
// The app's build output is content-hashed by Vite, so its JS/CSS filenames
// aren't known ahead of time — those get cached opportunistically by the fetch
// handler below as they're requested, instead of being pre-listed here.
const SHELL_PRECACHE_URLS = ['/', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name !== SHELL_CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

// Cache-first for the app shell (HTML/JS/CSS/icons), falling back to network
// and opportunistically caching what it returns. Navigations fall back to the
// cached shell page when the network is unreachable, so the app still opens
// offline. Cross-origin requests (the push server's API calls) are left alone.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((cached) => cached || caches.match(request)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addPendingAction(action) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function makeId() {
  return (self.crypto && self.crypto.randomUUID)
    ? self.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: '服薬リマインダー', body: event.data ? event.data.text() : 'お薬の時間です' };
  }

  const title = payload.title || '服薬リマインダー';
  const options = {
    body: payload.body || 'お薬を飲む時間です。通知から記録できます。',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.tag || 'medimate-reminder',
    renotify: true,
    requireInteraction: true,
    data: {
      dateStr: payload.dateStr || new Date().toISOString().slice(0, 10),
      medicationId: payload.medicationId || 'ALL',
      reminderId: payload.reminderId || payload.medicationId || 'ALL',
      endpoint: payload.endpoint || null,
      snoozeUrl: payload.snoozeUrl || null,
    },
    actions: [
      { action: 'take', title: '飲んだ' },
      { action: 'snooze', title: 'あとで(15分後)' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data || {};
  notification.close();

  if (action === 'take') {
    event.waitUntil((async () => {
      await addPendingAction({
        id: makeId(),
        type: 'take',
        medicationId: data.medicationId || 'ALL',
        dateStr: data.dateStr || new Date().toISOString().slice(0, 10),
        timestamp: Date.now(),
        source: 'notification',
      });

      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientsList.forEach((client) => client.postMessage({ type: 'pending-actions-updated' }));

      await self.registration.showNotification('記録しました', {
        body: 'お薬の服用を記録しました。おつかれさまでした。',
        icon: '/icon.svg',
        tag: 'medimate-confirm',
      });
    })());
    return;
  }

  if (action === 'snooze') {
    event.waitUntil((async () => {
      if (!data.snoozeUrl || !data.endpoint) return;
      try {
        await fetch(data.snoozeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: data.endpoint, reminderId: data.reminderId || 'ALL', minutes: 15 }),
        });
      } catch (e) {
        // Offline or server unreachable — nothing more we can do from here.
      }
    })());
    return;
  }

  // Default: clicking the notification body (not an action button) opens/focuses the app.
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsList.find((c) => 'focus' in c);
    if (existing) {
      existing.focus();
    } else {
      self.clients.openWindow('/');
    }
  })());
});
