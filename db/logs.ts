import { getDB } from './database';
import type { MedicationLog } from '../types';

export async function getAllLogs(): Promise<MedicationLog[]> {
  const db = await getDB();
  return db.getAll('logs');
}

export async function getLogsByDate(dateStr: string): Promise<MedicationLog[]> {
  const db = await getDB();
  return db.getAllFromIndex('logs', 'by-date', dateStr);
}

export async function getLogsByMedication(medicationId: string): Promise<MedicationLog[]> {
  const db = await getDB();
  return db.getAllFromIndex('logs', 'by-medication', medicationId);
}

export async function saveLog(log: MedicationLog): Promise<void> {
  const db = await getDB();
  await db.put('logs', log);
}

export async function deleteLog(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('logs', id);
}

export async function deleteAllLogs(): Promise<void> {
  const db = await getDB();
  await db.clear('logs');
}
