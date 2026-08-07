import { test, expect } from '@playwright/test';

test.describe('offline app shell caching', () => {
  test('the app still opens and renders after going offline once the service worker has cached it', async ({ page }) => {
    // First load: the service worker registers but doesn't control this navigation yet
    // (a SW only controls navigations that start after it's active), so nothing is
    // cached by its fetch handler on this pass.
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));

    // Second load: now the active worker controls the page, so its fetch handler
    // observes (and caches) every same-origin request this load makes.
    await page.reload();
    await page.getByRole('button', { name: 'ホーム', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');

    await page.context().setOffline(true);
    await page.reload();

    // The shell (and whatever medications/logs were last synced to localStorage)
    // should still render from cache with no network available.
    await expect(page.getByRole('button', { name: 'ホーム', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'お薬', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '設定', exact: true })).toBeVisible();

    await page.context().setOffline(false);
  });
});
