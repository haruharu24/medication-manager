import { test, expect } from '@playwright/test';

test.describe('quick-record shortcut', () => {
  test('?quickAction=log opens the quick-log sheet and records a dose', async ({ page }) => {
    // Register a medication first via the normal flow.
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('クイック記録テスト薬');
    await page.locator('#med-stock').selectOption('10');
    await page.getByText('変更を保存').click();
    await expect(page.getByRole('heading', { name: 'クイック記録テスト薬' })).toBeVisible();

    // Simulate opening via the manifest "今すぐ服薬を記録" shortcut.
    await page.goto('/?quickAction=log');

    await expect(page.getByText('今すぐ服薬を記録')).toBeVisible();
    await expect(page.getByRole('button', { name: /クイック記録テスト薬/ })).toBeVisible();

    await page.getByText('全部飲んだ').click();
    await expect(page.getByText('今すぐ服薬を記録')).not.toBeVisible();

    // The URL's quickAction param should be cleared so a reload doesn't reopen the sheet.
    expect(page.url()).not.toContain('quickAction');
  });
});
