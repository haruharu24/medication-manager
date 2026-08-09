import { getDB } from './database';
import type { VitalRecord } from '../types';

export async function getAllVitals(): Promise<VitalRecord[]> {
  const db = await getDB();
  return db.getAll('vitals');
}

export async function saveVital(record: VitalRecord): Promise<void> {
  const db = await getDB();
  await db.put('vitals', record);
}

export async function deleteVital(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vitals', id);
}
