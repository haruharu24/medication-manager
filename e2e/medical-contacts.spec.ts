import { test, expect } from '@playwright/test';

test.describe('pharmacy & hospital contacts', () => {
  test('fills in and saves pharmacy/hospital contact info, then shows it on reopen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    await page.getByText('薬局・病院の連絡先').click();

    await expect(page.getByRole('heading', { name: '薬局・病院の連絡先' })).toBeVisible();

    await page.getByLabel('薬局名').fill('さくら薬局');
    await page.locator('#contact-pharmacy-phone').fill('03-1234-5678');
    await page.getByLabel('病院名').fill('さくら病院');
    await page.getByLabel('担当医').fill('佐藤先生');
    await page.getByRole('button', { name: '保存する' }).click();

    await expect(page.getByRole('heading', { name: '薬局・病院の連絡先' })).not.toBeVisible();

    // Reopen and confirm it persisted in app state.
    await page.getByText('薬局・病院の連絡先').click();
    await expect(page.getByLabel('薬局名')).toHaveValue('さくら薬局');
    await expect(page.getByLabel('病院名')).toHaveValue('さくら病院');
    await expect(page.getByLabel('担当医')).toHaveValue('佐藤先生');
  });
});
