import { getDB } from './database';
import type { MedicalContacts } from '../types';

const CONTACTS_KEY = 'medicalContacts';

const DEFAULT_CONTACTS: MedicalContacts = {};

export async function getMedicalContacts(): Promise<MedicalContacts> {
  const db = await getDB();
  const row = await db.get('settings', CONTACTS_KEY);
  return row ? (row.value as MedicalContacts) : DEFAULT_CONTACTS;
}

export async function saveMedicalContacts(contacts: MedicalContacts): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: CONTACTS_KEY, value: contacts });
}
