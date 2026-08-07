import { test, expect } from '@playwright/test';

test.describe('medication CRUD', () => {
  test('adds, edits, and deletes a medication', async ({ page }) => {
    await page.goto('/');

    // Add
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('E2Eテスト薬');
    await page.locator('#med-stock').selectOption('10');
    await page.locator('#med-memo').fill('テストメモ');
    await page.getByText('変更を保存').click();

    await expect(page.getByRole('heading', { name: 'E2Eテスト薬' })).toBeVisible();

    // Edit
    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    await page.getByText('E2Eテスト薬').click();
    await page.locator('#med-title').fill('編集後の薬名');
    await page.getByText('変更を保存').click();

    await expect(page.getByText('編集後の薬名')).toBeVisible();

    // Delete
    await page.getByText('編集後の薬名').click();
    await page.getByText('この情報を削除').click();
    await page.getByText('削除する').click();

    await expect(page.getByText('編集後の薬名')).not.toBeVisible();
  });

  test('shows a low-stock warning on the home screen once stock is low', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('残りわずか薬');
    await page.locator('#med-stock').selectOption('0');
    await page.getByText('変更を保存').click();

    await expect(page.getByText('在庫が少ないお薬があります')).toBeVisible();
    await expect(page.getByText('在庫切れ')).toBeVisible();
  });
});
