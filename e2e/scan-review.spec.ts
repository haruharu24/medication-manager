import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'ocr-sample.png');

// Real, self-hosted Tesseract.js OCR runs against a deterministic printed-text
// fixture (see fixtures/generate-ocr-fixture.mjs) — no network stub needed since
// scanning no longer calls any external API. Recognition itself can take a few
// seconds (worker/wasm cold start + inference), so assertions below use a longer
// timeout than the Playwright default. Assertions on the extracted name are loose
// (non-empty rather than exact text) since real OCR has some noise even on clean
// synthetic input; unit/label assertions are exact since the fixture's "2錠"/
// "朝食後" text is reliably recognized in practice.
test.describe('OCR scan review flow', () => {
  test('lets the user edit and remove extracted medications before adding them', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手帳スキャン').click();

    await page.locator('input[type="file"][multiple]').setInputFiles([FIXTURE_PATH, FIXTURE_PATH]);
    await page.getByText('2枚をまとめて解析する').click();

    // Review screen shows both extracted medications, not yet saved to the list.
    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel('お薬1の名前')).not.toHaveValue('');
    await expect(page.getByLabel('お薬2の名前')).not.toHaveValue('');
    await expect(page.locator('select[id^="scan-unit-"]').first()).toHaveValue('錠');
    await expect(page.locator('select[id^="scan-label-"]').first()).toHaveValue('朝食後');

    // Edit the first item's name and remove the second before confirming. Both
    // items come from the same fixture image, so their OCR'd (and thus their
    // delete button's aria-label) text may be identical — target by position
    // instead of by that text to avoid an ambiguous match.
    await page.getByLabel('お薬1の名前').fill('編集済みスキャン薬');
    await page.getByRole('button', { name: /をリストから削除$/ }).nth(1).click();
    await expect(page.getByLabel('お薬1の名前')).toHaveCount(1);
    await page.getByText('1件を追加').click();

    await expect(page.getByRole('heading', { name: '編集済みスキャン薬' })).toBeVisible();
  });

  test('cancelling the review screen adds nothing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手帳スキャン').click();
    await page.locator('input[type="file"][multiple]').setInputFiles(FIXTURE_PATH);
    await page.getByText('1枚をまとめて解析する').click();

    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).toBeVisible({ timeout: 20_000 });
    const name = await page.getByLabel('お薬1の名前').inputValue();
    await page.getByLabel('戻る').click();

    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).not.toBeVisible();
    if (name) {
      await expect(page.getByText(name, { exact: true })).not.toBeVisible();
    }
  });
});
