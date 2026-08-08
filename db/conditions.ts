import { getDB } from './database';
import type { DailyCondition } from '../types';

export async function getAllConditions(): Promise<DailyCondition[]> {
  const db = await getDB();
  return db.getAll('conditions');
}

export async function getCondition(dateStr: string): Promise<DailyCondition | undefined> {
  const db = await getDB();
  return db.get('conditions', dateStr);
}

export async function saveCondition(condition: DailyCondition): Promise<void> {
  const db = await getDB();
  await db.put('conditions', condition);
}

export async function deleteAllConditions(): Promise<void> {
  const db = await getDB();
  await db.clear('conditions');
}
