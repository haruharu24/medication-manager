import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { activateSubscription } from './helpers/subscription';

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

  test('the settings screen with the owner-transfer control (multi-member household) has no detectable a11y violations', async ({ browser, request }) => {
    const suffix = Date.now();
    const ctxOwner = await browser.newContext();
    const ctxMember = await browser.newContext();
    await ctxOwner.addInitScript(() => window.localStorage.setItem('onboardingCompleted', 'true'));
    await ctxMember.addInitScript(() => window.localStorage.setItem('onboardingCompleted', 'true'));
    const pageOwner = await ctxOwner.newPage();
    const pageMember = await ctxMember.newPage();

    await pageOwner.goto('/');
    await pageMember.goto('/');
    await pageOwner.getByRole('button', { name: '設定', exact: true }).click();
    await pageMember.getByRole('button', { name: '設定', exact: true }).click();

    await pageOwner.getByRole('button', { name: '新規登録' }).click();
    await pageOwner.getByPlaceholder('メールアドレス').fill(`a11y-owner-${suffix}@example.com`);
    await pageOwner.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageOwner.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(pageOwner.getByText(`a11y-owner-${suffix}@example.com`)).toBeVisible();
    await activateSubscription(request, `a11y-owner-${suffix}@example.com`, 'password123');
    await pageOwner.reload();
    await pageOwner.getByRole('button', { name: '設定', exact: true }).click();
    await pageOwner.getByPlaceholder('例: 田中家').fill('a11yテスト家族');
    await pageOwner.getByRole('button', { name: '作成', exact: true }).click();
    const inviteText = await pageOwner.getByText(/招待コード:/).innerText();
    const inviteCode = inviteText.match(/[0-9A-F]{8}/)?.[0];

    await pageMember.getByRole('button', { name: '新規登録' }).click();
    await pageMember.getByPlaceholder('メールアドレス').fill(`a11y-member-${suffix}@example.com`);
    await pageMember.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageMember.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(pageMember.getByText(`a11y-member-${suffix}@example.com`)).toBeVisible();
    await activateSubscription(request, `a11y-member-${suffix}@example.com`, 'password123');
    await pageMember.reload();
    await pageMember.getByRole('button', { name: '設定', exact: true }).click();
    await pageMember.getByPlaceholder('招待コード').fill(inviteCode!);
    await pageMember.getByRole('button', { name: '参加', exact: true }).click();
    await expect(pageMember.getByText('a11yテスト家族')).toBeVisible();

    await pageOwner.reload();
    await pageOwner.getByRole('button', { name: '設定', exact: true }).click();
    await expect(pageOwner.getByLabel('移譲先のメンバー')).toBeVisible();

    const violations = await scan(pageOwner);
    expect(violations, formatViolations(violations)).toEqual([]);

    await ctxOwner.close();
    await ctxMember.close();
  });

  test('the family-sharing paywall card has no detectable a11y violations', async ({ page }) => {
    const suffix = Date.now();
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByRole('button', { name: '新規登録' }).click();
    await page.getByPlaceholder('メールアドレス').fill(`a11y-paywall-${suffix}@example.com`);
    await page.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await page.getByRole('button', { name: 'アカウントを作成する' }).click();

    // A freshly registered account has no subscription, so the settings screen
    // shows the paywall card instead of the household create/join forms.
    await expect(page.getByText('家族共有は月額プラン')).toBeVisible();

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

  test('the vitals tracking screen with a recorded reading (chart + list row) has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('バイタル記録').click();
    await page.getByRole('button', { name: /記録を追加/ }).click();
    await page.getByRole('button', { name: '体重', exact: true }).click();
    await page.getByLabel('体重(kg)').fill('62.5');
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByRole('button', { name: 'この記録を削除' })).toBeVisible();

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

  test('the allergy/medical history screen with a recorded entry (severity badge + edit/delete buttons) has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('アレルギー・既往歴').click();
    await page.getByRole('button', { name: 'アレルギーを追加' }).click();
    await page.getByLabel('アレルギーの原因').fill('ペニシリン');
    await page.getByRole('button', { name: '重度' }).click();
    await page.getByRole('button', { name: '保存する' }).click();
    await expect(page.getByText('ペニシリン')).toBeVisible();

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

  test('the report preview screen has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('レポート作成').click();
    await page.getByText('レポートを生成する').click();
    await expect(page.getByRole('heading', { name: 'Report' })).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the report preview screen with vitals/allergy/contacts data (charts + populated sections) has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
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

    await page.getByText('レポート作成').click();
    await page.getByText('レポートを生成する').click();
    await expect(page.getByRole('heading', { name: 'Report' })).toBeVisible();
    await expect(page.getByText(/最新: 62\.5 kg/)).toBeVisible();

    const violations = await scan(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('the delete-account confirmation modal has no detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByRole('button', { name: '新規登録' }).click();
    await page.getByPlaceholder('メールアドレス').fill(`a11y-delete-${Date.now()}@example.com`);
    await page.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await page.getByRole('button', { name: 'アカウントを作成する' }).click();
    await page.getByRole('button', { name: /アカウントを削除/ }).click();
    await expect(page.getByRole('dialog', { name: 'アカウントを削除' })).toBeVisible();

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
