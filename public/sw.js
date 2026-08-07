/*
 * Service worker for MediMate: shows push reminders and lets the user record a dose
 * with one tap directly from the notification, without opening the app.
 *
 * Plain JS (this file is served as-is from public/, not bundled) — keep DB_NAME /
 * DB_VERSION / STORE_NAME in sync with utils/pendingActionsDb.ts.
 */

const DB_NAME = 'medimate-db';
const DB_VERSION = 1;
const STORE_NAME = 'pendingActions';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
          body: JSON.stringify({ endpoint: data.endpoint, minutes: 15 }),
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
