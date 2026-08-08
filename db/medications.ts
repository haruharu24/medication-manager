import { getDB } from './database';
import type { Medication } from '../types';

export async function getAllMedications(): Promise<Medication[]> {
  const db = await getDB();
  return db.getAll('medications');
}

export async function getMedication(id: string): Promise<Medication | undefined> {
  const db = await getDB();
  return db.get('medications', id);
}

export async function saveMedication(medication: Medication): Promise<void> {
  const db = await getDB();
  await db.put('medications', medication);
}

export async function deleteMedication(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('medications', id);
}

export async function deleteAllMedications(): Promise<void> {
  const db = await getDB();
  await db.clear('medications');
}
