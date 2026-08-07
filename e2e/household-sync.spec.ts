import { test, expect } from '@playwright/test';

test.describe('family sharing (household sync)', () => {
  test('a medication added on one device appears on another via real-time sync', async ({ browser }) => {
    const suffix = Date.now();
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/');
    await pageB.goto('/');
    await pageA.getByRole('button', { name: '設定', exact: true }).click();
    await pageB.getByRole('button', { name: '設定', exact: true }).click();

    // Device A: register and create a household.
    await pageA.getByRole('button', { name: '新規登録' }).click();
    await pageA.getByPlaceholder('メールアドレス').fill(`alice-${suffix}@example.com`);
    await pageA.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageA.getByRole('button', { name: 'アカウントを作成する' }).click();

    await pageA.getByPlaceholder('例: 田中家').fill('E2E家族');
    await pageA.getByRole('button', { name: '作成', exact: true }).click();

    const inviteText = await pageA.getByText(/招待コード:/).innerText();
    const inviteCode = inviteText.match(/[0-9A-F]{8}/)?.[0];
    expect(inviteCode).toBeTruthy();

    // Device B: register and join with the invite code.
    await pageB.getByRole('button', { name: '新規登録' }).click();
    await pageB.getByPlaceholder('メールアドレス').fill(`bob-${suffix}@example.com`);
    await pageB.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageB.getByRole('button', { name: 'アカウントを作成する' }).click();

    await pageB.getByPlaceholder('招待コード').fill(inviteCode!);
    await pageB.getByRole('button', { name: '参加', exact: true }).click();
    await expect(pageB.getByText('E2E家族')).toBeVisible();

    // Device A adds a medication.
    await pageA.getByRole('button', { name: 'ホーム', exact: true }).click();
    await pageA.getByRole('button', { name: '追加' }).click();
    await pageA.getByText('手動入力').click();
    await pageA.locator('#med-title').fill('同期テスト薬');
    await pageA.locator('#med-stock').selectOption('10');
    await pageA.getByText('変更を保存').click();

    // Device B should see it show up via the WebSocket-driven sync, without reloading.
    await pageB.getByRole('button', { name: 'お薬', exact: true }).click();
    await expect(pageB.getByText('同期テスト薬')).toBeVisible({ timeout: 10_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
