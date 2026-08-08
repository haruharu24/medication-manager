import { getDB } from './database';
import type { ReminderSettings } from '../types';

const REMINDER_KEY = 'reminderSettings';

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '08:00',
  lastCheckedDate: '',
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const db = await getDB();
  const row = await db.get('settings', REMINDER_KEY);
  return row ? (row.value as ReminderSettings) : DEFAULT_REMINDER;
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: REMINDER_KEY, value: settings });
}
