import { test, expect } from '@playwright/test';

test.describe('AI scan review flow (Gemini call stubbed)', () => {
  test('lets the user edit and remove extracted medications before adding them', async ({ page }) => {
    // Stub every call to Gemini's REST API so this test never depends on a real
    // API key or external network access, and always returns a deterministic result.
    await page.route('**generativelanguage.googleapis.com/**', async route => {
      const payload = [
        { title: 'スキャン薬A', dosage: 1, unit: '錠', label: '朝食後', memo: '', stock: 10 },
        { title: 'スキャン薬B', dosage: 2, unit: '包', label: '夕食後', memo: '', stock: 5 },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手帳スキャン').click();

    await page.locator('input[type="file"][multiple]').setInputFiles({
      name: 'page1.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });
    await page.getByText('1枚をまとめて解析する').click();

    // Review screen shows both extracted medications, not yet saved to the list.
    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).toBeVisible();
    await expect(page.getByLabel('お薬1の名前')).toHaveValue('スキャン薬A');
    await expect(page.getByLabel('お薬2の名前')).toHaveValue('スキャン薬B');

    // Edit the first item's name and remove the second before confirming.
    await page.getByLabel('お薬1の名前').fill('編集済みスキャン薬');
    await page.getByLabel('スキャン薬Bをリストから削除').click();
    await expect(page.getByLabel('お薬1の名前')).toHaveCount(1);
    await page.getByText('1件を追加').click();

    await expect(page.getByRole('heading', { name: '編集済みスキャン薬' })).toBeVisible();
    await expect(page.getByText('スキャン薬B')).not.toBeVisible();
  });

  test('cancelling the review screen adds nothing', async ({ page }) => {
    await page.route('**generativelanguage.googleapis.com/**', async route => {
      const payload = [{ title: 'キャンセル対象薬', dosage: 1, unit: '錠', label: '朝食後', memo: '', stock: 10 }];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手帳スキャン').click();
    await page.locator('input[type="file"][multiple]').setInputFiles({
      name: 'page1.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });
    await page.getByText('1枚をまとめて解析する').click();

    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).toBeVisible();
    await page.getByLabel('戻る').click();

    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).not.toBeVisible();
    await expect(page.getByText('キャンセル対象薬')).not.toBeVisible();
  });
});
