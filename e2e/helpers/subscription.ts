import type { APIRequestContext } from '@playwright/test';
import { SERVER_PORT, REVENUECAT_WEBHOOK_SECRET } from '../testConfig';

// Household create/join/write now require an active subscription (see
// server/subscription.js), which real e2e tests can't obtain through the
// actual Apple IAP flow. This calls the RevenueCat webhook endpoint directly —
// the same server-side entry point a real RevenueCat purchase notification
// would hit — to flip a just-registered test user into an entitled state.
export const activateSubscription = async (request: APIRequestContext, email: string, password: string): Promise<void> => {
  const loginRes = await request.post(`http://localhost:${SERVER_PORT}/api/auth/login`, {
    data: { email, password },
  });
  const { user } = await loginRes.json();

  await request.post(`http://localhost:${SERVER_PORT}/api/webhooks/revenuecat`, {
    headers: { Authorization: `Bearer ${REVENUECAT_WEBHOOK_SECRET}` },
    data: { event: { type: 'INITIAL_PURCHASE', app_user_id: user.id, product_id: 'family_sharing_monthly' } },
  });
};
