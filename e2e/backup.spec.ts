import { test, expect } from '@playwright/test';

test.describe('backup export/import', () => {
  test('exports the current data as a downloadable JSON file', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('データをエクスポート').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^medimate-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('imports a backup file and restores its medications after confirming', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '設定', exact: true }).click();

    // The import flow shows a window.confirm() before restoring, then a window.alert()
    // once it's done — accept every dialog for the rest of this test.
    page.on('dialog', dialog => dialog.accept());

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      medications: [
        { id: 'restored-1', title: '復元された薬', unit: '錠', dosage: 1, label: '朝食後', stock: 10, memo: '', color: 'emerald', startDate: Date.now(), isFolder: false },
      ],
      logs: [],
      globalLogs: [],
      conditions: [],
      reminderSettings: { enabled: false, time: '08:00', lastCheckedDate: '' },
    };

    await page.locator('input[type="file"][accept="application/json"]').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });

    await page.getByRole('button', { name: 'お薬', exact: true }).click();
    await expect(page.getByText('復元された薬')).toBeVisible();
  });
});
