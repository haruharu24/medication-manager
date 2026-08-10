import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom (this test environment) has neither an androidBridge nor a
// webkit.messageHandlers.bridge on window, so @capacitor/core's real
// Capacitor.isNativePlatform() already resolves to false here — the same
// "unsupported platform" path a plain browser tab would hit. Only the
// native-platform tests below need to mock it to true.
import {
  isSubscriptionActive,
  isNativePlatform,
  initPurchases,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from './subscription';

describe('isSubscriptionActive', () => {
  it('treats active and grace_period as entitled', () => {
    expect(isSubscriptionActive('active')).toBe(true);
    expect(isSubscriptionActive('grace_period')).toBe(true);
  });

  it('treats none/expired/billing_issue/cancelled/undefined/null as not entitled', () => {
    expect(isSubscriptionActive('none')).toBe(false);
    expect(isSubscriptionActive('expired')).toBe(false);
    expect(isSubscriptionActive('billing_issue')).toBe(false);
    expect(isSubscriptionActive('cancelled')).toBe(false);
    expect(isSubscriptionActive(undefined)).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});

describe('RevenueCat helpers outside a native shell', () => {
  it('isNativePlatform is false in this test environment', () => {
    expect(isNativePlatform()).toBe(false);
  });

  it('initPurchases resolves without throwing', async () => {
    await expect(initPurchases('user-1')).resolves.toBeUndefined();
  });

  it('getOfferings resolves to null', async () => {
    await expect(getOfferings()).resolves.toBeNull();
  });

  it('purchasePackage reports the feature as unavailable without throwing', async () => {
    const result = await purchasePackage({} as any);
    expect(result).toEqual({ ok: false, reason: 'この操作はアプリ内でのみ利用できます' });
  });

  it('restorePurchases reports the feature as unavailable without throwing', async () => {
    const result = await restorePurchases();
    expect(result).toEqual({ ok: false, reason: 'この操作はアプリ内でのみ利用できます' });
  });
});

describe('RevenueCat helpers inside a native shell', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => true },
    }));
  });

  // VITE_REVENUECAT_SDK_KEY isn't set in this test environment (it's a build-time
  // define baked in before any env stubbing could reach it), which mirrors a real
  // misconfigured deploy: initPurchases must fail safe rather than throw.
  it('skips configure() and does not throw when the SDK key is not configured, even in a native shell', async () => {
    const configure = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@revenuecat/purchases-capacitor', () => ({ Purchases: { configure } }));

    const mod = await import('./subscription');
    await expect(mod.initPurchases('user-42')).resolves.toBeUndefined();

    expect(configure).not.toHaveBeenCalled();
  });

  it('getOfferings returns the current offering', async () => {
    const currentOffering = { identifier: 'default', availablePackages: [{ identifier: 'monthly' }] };
    const getOfferingsMock = vi.fn().mockResolvedValue({ current: currentOffering, all: {} });
    vi.doMock('@revenuecat/purchases-capacitor', () => ({ Purchases: { getOfferings: getOfferingsMock } }));

    const mod = await import('./subscription');
    await expect(mod.getOfferings()).resolves.toBe(currentOffering);
  });

  it('purchasePackage resolves ok:true on success', async () => {
    const purchasePackageMock = vi.fn().mockResolvedValue({ customerInfo: {} });
    vi.doMock('@revenuecat/purchases-capacitor', () => ({ Purchases: { purchasePackage: purchasePackageMock } }));

    const mod = await import('./subscription');
    const result = await mod.purchasePackage({ identifier: 'monthly' } as any);

    expect(result).toEqual({ ok: true });
    expect(purchasePackageMock).toHaveBeenCalledWith({ aPackage: { identifier: 'monthly' } });
  });

  it('purchasePackage reports a user cancellation distinctly from a failure', async () => {
    const purchasePackageMock = vi.fn().mockRejectedValue({ userCancelled: true, message: 'cancelled' });
    vi.doMock('@revenuecat/purchases-capacitor', () => ({ Purchases: { purchasePackage: purchasePackageMock } }));

    const mod = await import('./subscription');
    const result = await mod.purchasePackage({ identifier: 'monthly' } as any);

    expect(result).toEqual({ ok: false, cancelled: true });
  });

  it('purchasePackage surfaces the underlying error message on failure', async () => {
    const purchasePackageMock = vi.fn().mockRejectedValue({ userCancelled: false, message: '購入に失敗しました' });
    vi.doMock('@revenuecat/purchases-capacitor', () => ({ Purchases: { purchasePackage: purchasePackageMock } }));

    const mod = await import('./subscription');
    const result = await mod.purchasePackage({ identifier: 'monthly' } as any);

    expect(result).toEqual({ ok: false, reason: '購入に失敗しました' });
  });

  it('restorePurchases resolves ok:true on success and surfaces errors on failure', async () => {
    const restorePurchasesMock = vi.fn().mockResolvedValueOnce({ customerInfo: {} }).mockRejectedValueOnce({ message: '復元に失敗しました' });
    vi.doMock('@revenuecat/purchases-capacitor', () => ({ Purchases: { restorePurchases: restorePurchasesMock } }));

    const mod = await import('./subscription');
    await expect(mod.restorePurchases()).resolves.toEqual({ ok: true });
    await expect(mod.restorePurchases()).resolves.toEqual({ ok: false, reason: '復元に失敗しました' });
  });
});
