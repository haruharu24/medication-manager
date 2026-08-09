import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OCR_FIXTURE_PATH = path.join(__dirname, 'fixtures', 'ocr-sample.png');

const scan = async (page: import('@playwright/test').Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations;
};

const formatViolations = (violations: Awaited<ReturnType<typeof scan>>) =>
  violations
    .map(v => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n  ${v.nodes.map(n => n.target.join(' ')).join('\n  ')}`)
    .join('\n\n');

test.describe('accessibility @a11y', () => {
  test('home view has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('meds list view has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('settings view has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('report setup view has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('レポート作成').click();
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the medication add form has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手動入力').click();
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the quick-log sheet has no detectable a11y violations', async ({ page }) => {
    await page.goto('/?quickAction=log');
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the group creation form has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('グループを作成').click();
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the OCR scan review screen has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '追加' }).click();
    await page.getByText('手帳スキャン').click();
    await page.locator('input[type="file"][multiple]').setInputFiles(OCR_FIXTURE_PATH);
    await page.getByText('1枚をまとめて解析する').click();
    // Real OCR (worker/wasm cold start + inference) can take a few seconds.
    await expect(page.getByRole('heading', { name: 'スキャン結果を確認' })).toBeVisible({ timeout: 20_000 });

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the vitals tracking screen has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('バイタル記録').click();
    await expect(page.getByRole('heading', { name: 'バイタル記録' })).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the vitals add-record form has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('バイタル記録').click();
    await page.getByRole('button', { name: /記録を追加/ }).click();
    await expect(page.getByRole('dialog', { name: 'バイタルを記録' })).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the allergy/medical history screen has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('アレルギー・既往歴').click();
    await expect(page.getByRole('heading', { name: 'アレルギー・既往歴' })).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the allergy/medical history add-record form has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('アレルギー・既往歴').click();
    await page.getByRole('button', { name: 'アレルギーを追加' }).click();
    await expect(page.getByRole('dialog', { name: '記録を追加' })).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the pharmacy/hospital contacts screen has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('薬局・病院の連絡先').click();
    await expect(page.getByRole('heading', { name: '薬局・病院の連絡先' })).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the settings screen has no detectable a11y violations in English', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('English').click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test.describe('with onboarding not yet dismissed', () => {
    // Override the project default (onboarding pre-dismissed) to actually see the overlay.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('the first-run onboarding overlay has no detectable a11y violations', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).toBeVisible();
      const violations = await scan(page);
      expect(violations, formatViolations(violations)).toEqual([]);
    });
  });
});
