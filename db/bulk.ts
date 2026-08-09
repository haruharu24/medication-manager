// Whole-store replace helpers, layered on top of the per-item CRUD in the
// sibling db/*.ts files. App.tsx keeps its 5 core data domains as React state
// and persists the full current array on every change (mirroring the localStorage
// version this replaced) rather than tracking individual add/update/delete calls,
// so each of these clears the store and bulk-writes the given snapshot in one
// transaction instead of composing the single-item put/delete functions.
import { getDB } from './database';
import type { Medication, MedicationLog, DailyCondition, GlobalActionLog, VitalRecord, MedicalRecord } from '../types';

async function replaceStore<Name extends 'medications' | 'logs' | 'conditions' | 'globalLogs' | 'vitals' | 'medicalRecords'>(
  storeName: Name,
  items: unknown[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  await Promise.all(items.map((item) => tx.store.put(item as any)));
  await tx.done;
}

export const replaceAllMedications = (medications: Medication[]) => replaceStore('medications', medications);
export const replaceAllLogs = (logs: MedicationLog[]) => replaceStore('logs', logs);
export const replaceAllConditions = (conditions: DailyCondition[]) => replaceStore('conditions', conditions);
export const replaceAllGlobalLogs = (globalLogs: GlobalActionLog[]) => replaceStore('globalLogs', globalLogs);
export const replaceAllVitals = (vitals: VitalRecord[]) => replaceStore('vitals', vitals);
export const replaceAllMedicalRecords = (medicalRecords: MedicalRecord[]) => replaceStore('medicalRecords', medicalRecords);

export async function resetAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('medications'),
    db.clear('logs'),
    db.clear('conditions'),
    db.clear('globalLogs'),
    db.clear('settings'),
    db.clear('vitals'),
    db.clear('medicalRecords'),
  ]);
}
