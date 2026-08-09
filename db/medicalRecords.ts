import { getDB } from './database';
import type { MedicalRecord } from '../types';

export async function getAllMedicalRecords(): Promise<MedicalRecord[]> {
  const db = await getDB();
  return db.getAll('medicalRecords');
}

export async function saveMedicalRecord(record: MedicalRecord): Promise<void> {
  const db = await getDB();
  await db.put('medicalRecords', record);
}

export async function deleteMedicalRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('medicalRecords', id);
}
