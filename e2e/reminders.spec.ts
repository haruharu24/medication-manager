import { test, expect } from '@playwright/test';

test.describe('reminder settings', () => {
  test('enabling the global reminder shows the time picker and the per-medication hint', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();

    await expect(page.getByText('開始時間:')).not.toBeVisible();
    await page.getByRole('switch', { name: '強制リマインド' }).click();

    await expect(page.getByText('開始時間:')).toBeVisible();
    await expect(page.getByText('お薬ごとに「通知」時刻を設定すると、その時刻にも個別に通知が届きます。')).toBeVisible();
  });

  test('a per-medication notification time set in the form is kept when re-opening it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    await page.locator('#med-title').fill('通知テスト薬');

    await page.getByRole('button', { name: '通知', exact: true }).click();
    await page.getByRole('dialog', { name: '通知時刻を選択' }).getByText('設定', { exact: true }).click();
    await page.getByText('変更を保存').click();

    await expect(page.getByRole('heading', { name: '通知テスト薬' })).toBeVisible();

    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    await page.getByText('通知テスト薬').click();
    await expect(page.getByText('--:--')).not.toBeVisible();
  });
});
