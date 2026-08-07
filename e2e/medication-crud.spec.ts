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

  test('creates a group and assigns a medication to it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'お薬', exact: true }).click();

    // Create a one-pack group
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('グループを作成').click();
    await expect(page.getByText('グループを作成', { exact: true })).toBeVisible();
    await page.locator('#med-title').fill('朝の一包化');
    await page.getByText('一包化').click();
    await page.getByText('変更を保存').click();

    await expect(page.getByRole('heading', { name: '朝の一包化' })).toBeVisible();

    // Add a medication and assign it to the new group
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('グループ内の薬');
    await page.getByLabel('グループ').selectOption({ label: '朝の一包化' });
    await page.getByText('変更を保存').click();

    // Expand the group and confirm the medication is nested inside it
    await page.getByText('朝の一包化').click();
    await expect(page.getByText('グループ内の薬')).toBeVisible();
    await expect(page.getByText('個別のお薬')).not.toBeVisible();
  });
});
