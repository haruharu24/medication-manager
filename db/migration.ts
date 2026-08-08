import { saveMedication, deleteAllMedications } from './medications';
import { saveLog, deleteAllLogs } from './logs';
import { saveCondition, deleteAllConditions } from './conditions';
import { saveGlobalLog, deleteAllGlobalLogs } from './globalLogs';
import { saveReminderSettings } from './settings';
import type { Medication, MedicationLog, DailyCondition, GlobalActionLog, ReminderSettings } from '../types';

const MIGRATION_FLAG = 'idb-migration-done';

function parseJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

  const medications: Medication[] = parseJSON('medications', []);
  const logs: MedicationLog[] = parseJSON('logs', []);
  const conditions: DailyCondition[] = parseJSON('conditions', []);
  const globalLogs: GlobalActionLog[] = parseJSON('globalLogs', []);
  const reminderSettings: ReminderSettings | null = parseJSON('reminderSettings', null);

  const hasData =
    medications.length > 0 ||
    logs.length > 0 ||
    conditions.length > 0 ||
    globalLogs.length > 0 ||
    reminderSettings !== null;

  if (!hasData) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  await deleteAllMedications();
  await deleteAllLogs();
  await deleteAllConditions();
  await deleteAllGlobalLogs();

  for (const med of medications) await saveMedication(med);
  for (const log of logs) await saveLog(log);
  for (const cond of conditions) await saveCondition(cond);

  const sortedGlobalLogs = [...globalLogs].sort((a, b) => a.timestamp - b.timestamp);
  for (const log of sortedGlobalLogs) await saveGlobalLog(log);

  if (reminderSettings) await saveReminderSettings(reminderSettings);

  localStorage.setItem(MIGRATION_FLAG, 'true');
}
