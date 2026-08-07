import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

  test('the AI scan review screen has no detectable a11y violations', async ({ page }) => {
    await page.route('**generativelanguage.googleapis.com/**', async route => {
      const payload = [{ title: 'スキャン薬A', dosage: 1, unit: '錠', label: '朝食後', memo: '', stock: 10 }];
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

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
