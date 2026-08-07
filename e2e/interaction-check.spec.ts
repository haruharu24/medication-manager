import { test, expect } from '@playwright/test';

test.describe('AI interaction check (Gemini call stubbed)', () => {
  test('shows the AI-reported interaction risk between two registered medications', async ({ page }) => {
    // Stub every call to Gemini's REST API so this test never depends on a real
    // API key or external network access, and always returns a deterministic result.
    await page.route('**generativelanguage.googleapis.com/**', async route => {
      const payload = {
        summary: 'テスト用の一般的な注意事項です。',
        pairs: [
          { medA: '薬A', medB: '薬B', severity: 'medium', description: 'テスト用の説明文です。' },
        ],
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
      });
    });

    await page.goto('/');

    for (const title of ['薬A', '薬B']) {
      await page.getByRole('button', { name: '追加' }).click();
      await page.getByText('手動入力').click();
      await page.locator('#med-title').fill(title);
      await page.locator('#med-stock').selectOption('10');
      await page.getByText('変更を保存').click();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }

    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('飲み合わせチェック(AI)').click();

    await expect(page.getByText('薬A × 薬B')).toBeVisible();
    await expect(page.getByText('テスト用の説明文です。')).toBeVisible();
    await expect(page.getByText('テスト用の一般的な注意事項です。')).toBeVisible();
  });
});
