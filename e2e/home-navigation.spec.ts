import { test, expect } from '@playwright/test';

test.describe('home navigation', () => {
  test('loads the home view and switches between bottom-nav tabs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('MediMate')).toBeVisible();
    await expect(page.getByText('お薬未登録')).toBeVisible();

    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    await expect(page.getByText('お薬ボックス')).toBeVisible();

    await page.getByRole('button', { name: '設定', exact: true }).click();
    await expect(page.getByText('ダークモード')).toBeVisible();

    await page.getByRole('button', { name: 'ホーム', exact: true }).click();
    await expect(page.getByText('今日の服薬')).toBeVisible();
  });

  test('calendar view mode switches between month/week/day', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '週', exact: true }).click();
    await page.getByRole('button', { name: '日', exact: true }).click();
    await expect(page.locator('text=/\\d+月\\d+日/')).toBeVisible();
  });
});
