// Client-side helpers for the family-sharing paywall: a thin wrapper around
// the RevenueCat Capacitor SDK (purchase flow / entitlement UX) plus a thin
// api.ts wrapper for the server's view of subscription status.
//
// Server-side (server/subscription.js) is the actual gate for every
// household-sharing write — this module only drives the purchase UI and
// gives the user feedback. The RevenueCat webhook (server-side) is the only
// thing that ever flips a user's subscriptionStatus in the database.
//
// Same "safely no-op outside the supported environment" pattern as
// utils/push.ts's isPushSupported(): RevenueCat's Capacitor plugin throws if
// used outside a native (iOS/Android) shell, so every function here is
// guarded by Capacitor.isNativePlatform() and this sandbox/browser dev
// environment never calls into the native plugin.
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import type { PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';

const REVENUECAT_SDK_KEY = (import.meta as any).env?.VITE_REVENUECAT_SDK_KEY as string | undefined;

// Mirrors server/accountStore.js's users[].subscriptionStatus.
export type SubscriptionStatus = 'none' | 'active' | 'grace_period' | 'billing_issue' | 'expired' | 'cancelled';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  productId: string | null;
  currentPeriodEnd: string | null;
}

// grace_period counts as entitled client-side too, matching server/subscription.js's
// ACTIVE_STATUSES — keeps the UI from showing a paywall the server wouldn't enforce.
export const isSubscriptionActive = (status: SubscriptionStatus | undefined | null): boolean =>
  status === 'active' || status === 'grace_period';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

// Must be called once after login, before any purchase/offerings call, with the
// MediMate user id as RevenueCat's appUserID (see server/accountStore.js's
// revenueCatCustomerId comment — the webhook payload's app_user_id round-trips
// back to this same id).
export const initPurchases = async (userId: string): Promise<void> => {
  if (!isNativePlatform()) return;
  if (!REVENUECAT_SDK_KEY) {
    console.error('VITE_REVENUECAT_SDK_KEY is not set; skipping RevenueCat initialization.');
    return;
  }
  await Purchases.configure({ apiKey: REVENUECAT_SDK_KEY, appUserID: userId });
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isNativePlatform()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export interface PurchaseResult {
  ok: boolean;
  cancelled?: boolean;
  reason?: string;
}

export const purchasePackage = async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
  if (!isNativePlatform()) return { ok: false, reason: 'この操作はアプリ内でのみ利用できます' };
  try {
    await Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, reason: e?.message || '購入処理に失敗しました' };
  }
};

export const restorePurchases = async (): Promise<PurchaseResult> => {
  if (!isNativePlatform()) return { ok: false, reason: 'この操作はアプリ内でのみ利用できます' };
  try {
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || '購入の復元に失敗しました' };
  }
};
