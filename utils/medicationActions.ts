import { Medication, MedicationLog } from '../types';

export interface MedicationActionResult {
  logs: MedicationLog[];
  medications: Medication[];
  changed: boolean;
  taken: boolean;
}

export const isMedicationTaken = (logs: MedicationLog[], medId: string, dateStr: string): boolean =>
  logs.some(l => l.medicationId === medId && l.dateStr === dateStr);

// Used by the calendar edit UI, where the user explicitly toggles a day on/off.
export const toggleMedicationTaken = (
  logs: MedicationLog[],
  medications: Medication[],
  medId: string,
  dateStr: string
): MedicationActionResult => {
  const med = medications.find(m => m.id === medId);
  if (!med) return { logs, medications, changed: false, taken: false };

  const existing = logs.find(l => l.medicationId === medId && l.dateStr === dateStr);

  if (existing) {
    return {
      logs: logs.filter(l => l.id !== existing.id),
      medications: medications.map(m => m.id === medId ? { ...m, stock: m.stock + m.dosage } : m),
      changed: true,
      taken: false,
    };
  }

  return {
    logs: [...logs, { id: crypto.randomUUID(), medicationId: medId, timestamp: Date.now(), dateStr }],
    medications: medications.map(m => m.id === medId ? { ...m, stock: Math.max(0, m.stock - m.dosage) } : m),
    changed: true,
    taken: true,
  };
};

// Used by notification/shortcut quick-record flows: idempotent, only ever marks as taken
// so a duplicate notification click never double-decrements stock.
export const markMedicationTaken = (
  logs: MedicationLog[],
  medications: Medication[],
  medId: string,
  dateStr: string
): MedicationActionResult => {
  const med = medications.find(m => m.id === medId);
  if (!med) return { logs, medications, changed: false, taken: false };

  if (isMedicationTaken(logs, medId, dateStr)) {
    return { logs, medications, changed: false, taken: true };
  }

  return {
    logs: [...logs, { id: crypto.randomUUID(), medicationId: medId, timestamp: Date.now(), dateStr }],
    medications: medications.map(m => m.id === medId ? { ...m, stock: Math.max(0, m.stock - m.dosage) } : m),
    changed: true,
    taken: true,
  };
};
