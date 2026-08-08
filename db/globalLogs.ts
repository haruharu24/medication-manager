import { getDB } from './database';
import type { GlobalActionLog } from '../types';

const MAX_GLOBAL_LOGS = 100;

export async function getAllGlobalLogs(): Promise<GlobalActionLog[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('globalLogs', 'by-timestamp');
  return all.reverse();
}

export async function saveGlobalLog(log: GlobalActionLog): Promise<void> {
  const db = await getDB();
  await db.put('globalLogs', log);

  const all = await getAllGlobalLogs();
  if (all.length > MAX_GLOBAL_LOGS) {
    const oldest = all.slice(MAX_GLOBAL_LOGS);
    for (const old of oldest) {
      await db.delete('globalLogs', old.id);
    }
  }
}

export async function deleteAllGlobalLogs(): Promise<void> {
  const db = await getDB();
  await db.clear('globalLogs');
}
