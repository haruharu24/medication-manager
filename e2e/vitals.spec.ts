import { test, expect } from '@playwright/test';

test.describe('vitals tracking', () => {
  test('records a vital reading from settings and shows it in the list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('バイタル記録').click();

    await expect(page.getByRole('heading', { name: 'バイタル記録' })).toBeVisible();
    await expect(page.getByText('まだ記録がありません')).toBeVisible();

    await page.getByRole('button', { name: /記録を追加/ }).click();
    await expect(page.getByRole('dialog', { name: 'バイタルを記録' })).toBeVisible();

    await page.getByRole('button', { name: '体重', exact: true }).click();
    await page.getByLabel('体重(kg)').fill('62.5');
    await page.getByRole('button', { name: '記録する' }).click();

    await expect(page.getByRole('dialog', { name: 'バイタルを記録' })).not.toBeVisible();
    await expect(page.getByText('体重', { exact: true })).toBeVisible();
    await expect(page.getByText(/62\.5/)).toBeVisible();

    // Delete it again and confirm the empty state comes back.
    await page.getByRole('button', { name: 'この記録を削除' }).click();
    await expect(page.getByText('まだ記録がありません')).toBeVisible();
  });
});
