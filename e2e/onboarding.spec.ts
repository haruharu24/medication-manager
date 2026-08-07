import { test, expect } from '@playwright/test';

test.describe('first-run onboarding', () => {
  // Override the project default (onboarding pre-dismissed) so these tests see
  // a genuine first launch with empty localStorage.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows automatically on first launch and does not reappear after finishing it', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).toBeVisible();

    for (const title of ['お薬を登録する', '服用を記録する', '飲み忘れを防ぐ', '家族と共有する']) {
      await page.getByText('次へ').click();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await page.getByText('はじめる').click();
    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).not.toBeVisible();

    expect(await page.evaluate(() => localStorage.getItem('onboardingCompleted'))).toBe('true');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).not.toBeVisible();
  });

  test('skipping also marks onboarding as completed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).toBeVisible();

    await page.getByText('スキップ').click();
    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).not.toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('onboardingCompleted'))).toBe('true');
  });

  test('can be reopened later from settings', async ({ page }) => {
    await page.goto('/');
    await page.getByText('スキップ').click();

    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('使い方を見る').click();

    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).toBeVisible();
    await page.getByLabel('スキップして閉じる').click();
    await expect(page.getByRole('heading', { name: 'MediMateへようこそ' })).not.toBeVisible();
  });
});
