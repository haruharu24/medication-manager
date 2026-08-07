import { describe, it, expect } from 'vitest';
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush } from './push';

// jsdom implements neither Service Worker, PushManager nor the Notification API,
// so these exercise the graceful-degradation paths that real unsupported browsers
// (older Safari, some in-app webviews) would also hit.

describe('push helpers on an unsupported browser', () => {
  it('registerServiceWorker resolves to null', async () => {
    await expect(registerServiceWorker()).resolves.toBeNull();
  });

  it('subscribeToPush reports the feature as unsupported without throwing', async () => {
    const result = await subscribeToPush('08:00');
    expect(result).toEqual({ ok: false, reason: 'このブラウザは通知に対応していません' });
  });

  it('unsubscribeFromPush resolves without throwing', async () => {
    await expect(unsubscribeFromPush()).resolves.toBeUndefined();
  });
});
