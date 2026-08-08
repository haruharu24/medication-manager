import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import { getReminderSettings, saveReminderSettings } from '../settings';
import type { ReminderSettings } from '../../types';

setupFreshDB();

describe('settings DB', () => {
  it('デフォルト値を返す（未保存時）', async () => {
    const settings = await getReminderSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.time).toBe('08:00');
    expect(settings.lastCheckedDate).toBe('');
  });

  it('リマインダー設定を保存して取得できる', async () => {
    const s: ReminderSettings = { enabled: true, time: '09:30', lastCheckedDate: '2026-05-31' };
    await saveReminderSettings(s);

    const result = await getReminderSettings();
    expect(result.enabled).toBe(true);
    expect(result.time).toBe('09:30');
    expect(result.lastCheckedDate).toBe('2026-05-31');
  });

  it('設定を上書き保存できる', async () => {
    await saveReminderSettings({ enabled: true, time: '08:00', lastCheckedDate: '' });
    await saveReminderSettings({ enabled: false, time: '20:00', lastCheckedDate: '2026-05-31' });

    const result = await getReminderSettings();
    expect(result.enabled).toBe(false);
    expect(result.time).toBe('20:00');
  });
});
