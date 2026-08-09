import { test, expect } from '@playwright/test';

test.describe('report generation', () => {
  test('includes vitals, allergy/history, and contacts sections by default, and hides a section when toggled off', async ({ page }) => {
    await page.goto('/');

    // Add one record of each new data domain via their settings screens.
    await page.getByRole('button', { name: '設定', exact: true }).click();

    await page.getByText('バイタル記録').click();
    await page.getByRole('button', { name: /記録を追加/ }).click();
    await page.getByRole('button', { name: '体重', exact: true }).click();
    await page.getByLabel('体重(kg)').fill('62.5');
    await page.getByRole('button', { name: '記録する' }).click();
    await page.getByRole('button', { name: '戻る' }).click();

    await page.getByText('アレルギー・既往歴').click();
    await page.getByRole('button', { name: 'アレルギーを追加' }).click();
    await page.getByLabel('アレルギーの原因').fill('ペニシリン');
    await page.getByRole('button', { name: '保存する' }).click();
    await page.getByRole('button', { name: '戻る' }).click();

    await page.getByText('薬局・病院の連絡先').click();
    await page.getByLabel('薬局名').fill('さくら薬局');
    await page.getByRole('button', { name: '保存する' }).click();

    // Generate the report with all sections left at their default (checked) state.
    await page.getByText('レポート作成').click();
    await expect(page.getByRole('heading', { name: 'レポート設定' })).toBeVisible();
    await page.getByText('レポートを生成する').click();

    await expect(page.getByText('バイタル記録')).toBeVisible();
    await expect(page.getByText(/最新: 62\.5 kg/)).toBeVisible();
    await expect(page.getByText('アレルギー・既往歴')).toBeVisible();
    await expect(page.getByText('ペニシリン')).toBeVisible();
    await expect(page.getByText('薬局・病院の連絡先')).toBeVisible();
    await expect(page.getByText(/さくら薬局/)).toBeVisible();

    // Turn off the vitals section and confirm it disappears while the others remain.
    await page.getByRole('button', { name: '戻る' }).click();
    await page.getByText('バイタル記録').click();
    await page.getByText('レポートを生成する').click();

    await expect(page.getByText('バイタル記録')).not.toBeVisible();
    await expect(page.getByText('アレルギー・既往歴')).toBeVisible();
  });
});
