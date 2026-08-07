// Client-side helpers for the Web Push based reminder: registers the service worker,
// requests notification permission, and syncs the push subscription + reminder time
// with the backend in server/ so it can send a daily push even while the app is closed.

const PUSH_SERVER_URL = (import.meta as any).env?.VITE_PUSH_SERVER_URL || 'http://localhost:8787';

export interface PushSetupResult {
  ok: boolean;
  reason?: string;
}

const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.error('Service worker registration failed', e);
    return null;
  }
};

export const subscribeToPush = async (reminderTime: string): Promise<PushSetupResult> => {
  if (!isPushSupported()) {
    return { ok: false, reason: 'このブラウザは通知に対応していません' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: '通知の許可が得られませんでした' };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, reason: 'Service Workerの登録に失敗しました' };
  }

  try {
    const keyRes = await fetch(`${PUSH_SERVER_URL}/api/vapid-public-key`);
    if (!keyRes.ok) throw new Error('failed to fetch vapid key');
    const { publicKey } = await keyRes.json();

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const res = await fetch(`${PUSH_SERVER_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        reminderTime,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    });
    if (!res.ok) throw new Error('failed to register subscription');

    return { ok: true };
  } catch (e) {
    console.error('Push subscription failed', e);
    return { ok: false, reason: 'プッシュ通知サーバーへの登録に失敗しました' };
  }
};

export const unsubscribeFromPush = async (): Promise<void> => {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await fetch(`${PUSH_SERVER_URL}/api/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {});

    await subscription.unsubscribe();
  } catch (e) {
    console.error('Push unsubscription failed', e);
  }
};
