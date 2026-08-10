import { test, expect } from '@playwright/test';
import { activateSubscription } from './helpers/subscription';

test.describe('family sharing: view-only (viewer) role', () => {
  test('a member demoted to viewer loses the add/edit UI but keeps seeing synced data', async ({ browser, request }) => {
    const suffix = Date.now();
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    // browser.newContext() doesn't inherit the project's default storageState.
    await ctxA.addInitScript(() => window.localStorage.setItem('onboardingCompleted', 'true'));
    await ctxB.addInitScript(() => window.localStorage.setItem('onboardingCompleted', 'true'));
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/');
    await pageB.goto('/');
    await pageA.getByRole('button', { name: '設定', exact: true }).click();
    await pageB.getByRole('button', { name: '設定', exact: true }).click();

    // Device A: owner registers and creates a household.
    await pageA.getByRole('button', { name: '新規登録' }).click();
    await pageA.getByPlaceholder('メールアドレス').fill(`owner-${suffix}@example.com`);
    await pageA.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageA.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(pageA.getByText(`owner-${suffix}@example.com`)).toBeVisible();
    await activateSubscription(request, `owner-${suffix}@example.com`, 'password123');
    await pageA.reload();
    await pageA.getByRole('button', { name: '設定', exact: true }).click();

    await pageA.getByPlaceholder('例: 田中家').fill('権限テスト家族');
    await pageA.getByRole('button', { name: '作成', exact: true }).click();

    const inviteText = await pageA.getByText(/招待コード:/).innerText();
    const inviteCode = inviteText.match(/[0-9A-F]{8}/)?.[0];
    expect(inviteCode).toBeTruthy();

    // Device B: member registers and joins.
    await pageB.getByRole('button', { name: '新規登録' }).click();
    await pageB.getByPlaceholder('メールアドレス').fill(`viewer-${suffix}@example.com`);
    await pageB.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageB.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(pageB.getByText(`viewer-${suffix}@example.com`)).toBeVisible();
    await activateSubscription(request, `viewer-${suffix}@example.com`, 'password123');
    await pageB.reload();
    await pageB.getByRole('button', { name: '設定', exact: true }).click();

    await pageB.getByPlaceholder('招待コード').fill(inviteCode!);
    await pageB.getByRole('button', { name: '参加', exact: true }).click();
    await expect(pageB.getByText('権限テスト家族')).toBeVisible();

    // Before any role change, the member is a full editor: the add menu is visible.
    await pageB.getByRole('button', { name: 'ホーム', exact: true }).click();
    await expect(pageB.getByRole('button', { name: '追加' })).toBeVisible();
    await pageB.getByRole('button', { name: '設定', exact: true }).click();

    // Owner demotes the member to viewer. The member list isn't live-updated when
    // someone else joins, so reload to pick up the new member first.
    await pageA.reload();
    await pageA.getByRole('button', { name: '設定', exact: true }).click();
    // Appears both in the member row and in the owner-transfer select's options.
    await expect(pageA.getByText(`viewer-${suffix}@example.com`).first()).toBeVisible();
    await pageA.getByRole('button', { name: '閲覧のみ' }).click();

    // The member sees the read-only notice and loses the add-menu entry point.
    await expect(pageB.getByText('閲覧のみのメンバーです。お薬の追加・編集はできません。')).toBeVisible({ timeout: 10_000 });
    await pageB.getByRole('button', { name: 'ホーム', exact: true }).click();
    await expect(pageB.getByRole('button', { name: '追加' })).not.toBeVisible();

    // The owner adds a medication; the (now read-only) member still sees it sync in.
    await pageA.getByRole('button', { name: 'ホーム', exact: true }).click();
    await pageA.getByRole('button', { name: '追加' }).click();
    await pageA.getByText('手動入力').click();
    await pageA.locator('#med-title').fill('閲覧のみ確認薬');
    await pageA.locator('#med-stock').selectOption('10');
    await pageA.getByText('変更を保存').click();

    await pageB.getByRole('button', { name: 'お薬', exact: true }).click();
    await expect(pageB.getByText('閲覧のみ確認薬')).toBeVisible({ timeout: 10_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
