import { test, expect } from '@playwright/test';
import { activateSubscription } from './helpers/subscription';

test.describe('account deletion', () => {
  test('deletes an account with no household memberships and returns to the logged-out view', async ({ page }) => {
    const suffix = Date.now();
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();

    await page.getByRole('button', { name: '新規登録' }).click();
    await page.getByPlaceholder('メールアドレス').fill(`solo-${suffix}@example.com`);
    await page.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await page.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(page.getByText(`solo-${suffix}@example.com`)).toBeVisible();

    await page.getByRole('button', { name: /アカウントを削除/ }).click();
    await expect(page.getByRole('dialog', { name: 'アカウントを削除' })).toBeVisible();

    // Wrong password is rejected first.
    await page.getByLabel('パスワード').fill('wrong-password');
    await page.getByLabel('確認のため「削除」と入力してください').fill('削除');
    await page.getByRole('button', { name: '完全に削除する' }).click();
    await expect(page.getByText('パスワードが正しくありません')).toBeVisible();

    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: '完全に削除する' }).click();

    // Back to the logged-out login/register form.
    await expect(page.getByPlaceholder('メールアドレス')).toBeVisible();
    await expect(page.getByPlaceholder('パスワード(8文字以上)')).toBeVisible();
  });

  test('blocks deleting an owner of a multi-member household until ownership is transferred', async ({ browser, request }) => {
    const suffix = Date.now();
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
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
    await pageA.getByPlaceholder('メールアドレス').fill(`del-owner-${suffix}@example.com`);
    await pageA.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageA.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(pageA.getByText(`del-owner-${suffix}@example.com`)).toBeVisible();
    await activateSubscription(request, `del-owner-${suffix}@example.com`, 'password123');
    await pageA.reload();
    await pageA.getByRole('button', { name: '設定', exact: true }).click();

    await pageA.getByPlaceholder('例: 田中家').fill('削除テスト家族');
    await pageA.getByRole('button', { name: '作成', exact: true }).click();
    const inviteText = await pageA.getByText(/招待コード:/).innerText();
    const inviteCode = inviteText.match(/[0-9A-F]{8}/)?.[0];
    expect(inviteCode).toBeTruthy();

    // Device B: member registers and joins.
    await pageB.getByRole('button', { name: '新規登録' }).click();
    await pageB.getByPlaceholder('メールアドレス').fill(`del-member-${suffix}@example.com`);
    await pageB.getByPlaceholder('パスワード(8文字以上)').fill('password123');
    await pageB.getByRole('button', { name: 'アカウントを作成する' }).click();
    await expect(pageB.getByText(`del-member-${suffix}@example.com`)).toBeVisible();
    await activateSubscription(request, `del-member-${suffix}@example.com`, 'password123');
    await pageB.reload();
    await pageB.getByRole('button', { name: '設定', exact: true }).click();
    await pageB.getByPlaceholder('招待コード').fill(inviteCode!);
    await pageB.getByRole('button', { name: '参加', exact: true }).click();
    await expect(pageB.getByText('削除テスト家族')).toBeVisible();

    // Owner's member list isn't live-updated on join; reload to see the new member.
    await pageA.reload();
    await pageA.getByRole('button', { name: '設定', exact: true }).click();
    // Appears both in the member row and in the owner-transfer select's options.
    await expect(pageA.getByText(`del-member-${suffix}@example.com`).first()).toBeVisible();

    // The owner is blocked from deleting while another member remains.
    await pageA.getByRole('button', { name: /アカウントを削除/ }).click();
    await pageA.getByLabel('パスワード').fill('password123');
    await pageA.getByLabel('確認のため「削除」と入力してください').fill('削除');
    await pageA.getByRole('button', { name: '完全に削除する' }).click();
    await expect(pageA.getByText(/オーナー権限を先に移譲してください/)).toBeVisible();
    await expect(pageA.getByText('ログインする', { exact: true })).not.toBeVisible();

    // Close the modal, transfer ownership, then deletion succeeds.
    await pageA.getByRole('button', { name: '閉じる' }).click();
    await pageA.getByLabel('移譲先のメンバー').selectOption({ label: `del-member-${suffix}@example.com` });
    pageA.once('dialog', dialog => dialog.accept());
    await pageA.getByRole('button', { name: '移譲' }).click();
    await expect(pageA.getByText('編集者', { exact: true })).toBeVisible();

    await pageA.getByRole('button', { name: /アカウントを削除/ }).click();
    await pageA.getByLabel('パスワード').fill('password123');
    await pageA.getByLabel('確認のため「削除」と入力してください').fill('削除');
    await pageA.getByRole('button', { name: '完全に削除する' }).click();
    await expect(pageA.getByPlaceholder('メールアドレス')).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
