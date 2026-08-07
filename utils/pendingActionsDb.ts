// Queue of medication actions recorded outside the running app (e.g. tapped from a
// push notification while the app/browser was fully closed). A Service Worker cannot
// touch localStorage, so it writes here instead; the app drains this queue on launch
// and folds the entries into its normal localStorage-backed state.
//
// IMPORTANT: public/sw.js re-implements the same IndexedDB access in plain JS (it is
// a raw static file, not bundled). Keep DB_NAME / DB_VERSION / STORE_NAME in sync with it.

export const DB_NAME = 'medimate-db';
export const DB_VERSION = 1;
export const STORE_NAME = 'pendingActions';

export interface PendingAction {
  id: string;
  type: 'take';
  medicationId: string;
  dateStr: string; // yyyy-MM-dd, the day the dose should be recorded against
  timestamp: number;
  source: 'notification' | 'shortcut';
}

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
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
};

export const addPendingAction = async (action: PendingAction): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const drainPendingActions = async (): Promise<PendingAction[]> => {
  if (!('indexedDB' in window)) return [];
  const db = await openDb();
  const actions = await new Promise<PendingAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      store.clear();
    };
    tx.oncomplete = () => resolve(getAllReq.result as PendingAction[]);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return actions;
};
