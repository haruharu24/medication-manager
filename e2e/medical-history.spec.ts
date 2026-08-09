import { test, expect } from '@playwright/test';

test.describe('allergy & medical history tracking', () => {
  test('adds, edits, and deletes an allergy record from settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('アレルギー・既往歴').click();

    await expect(page.getByRole('heading', { name: 'アレルギー・既往歴' })).toBeVisible();
    await expect(page.getByText('アレルギーの記録はありません')).toBeVisible();

    await page.getByRole('button', { name: 'アレルギーを追加' }).click();
    await expect(page.getByRole('dialog', { name: '記録を追加' })).toBeVisible();
    await page.getByLabel('アレルギーの原因').fill('ペニシリン');
    await page.getByRole('button', { name: '重度' }).click();
    await page.getByRole('button', { name: '保存する' }).click();

    await expect(page.getByText('ペニシリン')).toBeVisible();
    await expect(page.getByText('重度')).toBeVisible();

    // Edit it.
    await page.getByRole('button', { name: 'ペニシリンを編集' }).click();
    await page.getByLabel('アレルギーの原因').fill('セフェム系');
    await page.getByRole('button', { name: '保存する' }).click();
    await expect(page.getByText('セフェム系')).toBeVisible();

    // Delete it.
    await page.getByRole('button', { name: 'セフェム系を削除' }).click();
    await expect(page.getByText('アレルギーの記録はありません')).toBeVisible();
  });

  test('adds a medical history record independently from allergies', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('アレルギー・既往歴').click();

    await page.getByRole('button', { name: '既往歴を追加' }).click();
    await expect(page.getByRole('button', { name: '既往歴', pressed: true })).toBeVisible();
    await page.getByLabel('病名・症状').fill('高血圧');
    await page.getByRole('button', { name: '保存する' }).click();

    await expect(page.getByText('高血圧')).toBeVisible();
    await expect(page.getByText('アレルギーの記録はありません')).toBeVisible();
  });
});
