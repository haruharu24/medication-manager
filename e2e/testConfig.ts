// Shared between playwright.config.ts (which starts the e2e server with these
// values) and any spec that needs to talk to that server directly (e.g. to
// activate a test user's subscription via a synthetic RevenueCat webhook call,
// bypassing the real Apple IAP flow that's obviously unavailable in e2e).
export const APP_PORT = 5183;
export const SERVER_PORT = 8788;
export const REVENUECAT_WEBHOOK_SECRET = 'e2e-test-revenuecat-secret-do-not-use-in-prod';
