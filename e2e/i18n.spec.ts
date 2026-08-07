import { test, expect } from '@playwright/test';

test.describe('language switching', () => {
  test('switching to English updates nav, home, meds, and settings screens; persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('English').click();

    // Bottom nav + settings screen itself.
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Meds', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Dark mode')).toBeVisible();
    await expect(page.getByText('Reminder notifications')).toBeVisible();

    // Home screen add menu.
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Manual entry')).toBeVisible();
    await expect(page.getByText('Scan medication notebook')).toBeVisible();
    await expect(page.getByText('Create group')).toBeVisible();

    // Meds screen.
    await page.getByRole('button', { name: 'Meds', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Medication box' })).toBeVisible();
    await expect(page.getByText('List')).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();

    // Persists across reload (the app always lands back on the home screen).
    await page.reload();
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Meds', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Medication box' })).toBeVisible();

    expect(await page.evaluate(() => localStorage.getItem('language'))).toBe('en');
  });

  test('switching back to Japanese restores the original labels', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('English').click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByText('日本語').click();
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ホーム', exact: true })).toBeVisible();
  });
});
