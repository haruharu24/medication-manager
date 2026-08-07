import { test, expect } from '@playwright/test';

test.describe('dark mode toggle', () => {
  test('toggling dark mode updates the html class and persists across reloads', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const toggle = page.getByRole('switch', { name: 'ダークモード' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });
});
