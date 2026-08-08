import { test, expect } from '@playwright/test';

test.describe('IndexedDB persistence', () => {
  test('a medication, a dark-mode setting, and a reminder time all survive a reload', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('永続化テスト薬');
    await page.locator('#med-stock').selectOption('10');
    await page.getByText('変更を保存').click();
    await expect(page.getByRole('heading', { name: '永続化テスト薬' })).toBeVisible();

    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByRole('switch', { name: '強制リマインド' }).click();
    await page.locator('input[type="time"]').fill('07:30');

    await page.reload();

    await page.getByRole('button', { name: '設定', exact: true }).click();
    await expect(page.getByRole('switch', { name: '強制リマインド' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('input[type="time"]')).toHaveValue('07:30');

    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    await expect(page.getByText('永続化テスト薬')).toBeVisible();
  });

  test('resetting all data clears IndexedDB and localStorage, and re-shows onboarding', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('リセット対象薬');
    await page.getByText('変更を保存').click();
    await expect(page.getByRole('heading', { name: 'リセット対象薬' })).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('データリセット').click();

    // The reset flow reloads the page itself; wait for that reload to land
    // before asserting on the fresh DOM it produces.
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).toBeVisible();

    await page.getByText('スキップ').click();
    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    await expect(page.getByText('リセット対象薬')).not.toBeVisible();
  });
});
