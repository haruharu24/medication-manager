import { describe, it, expect } from 'vitest';
import { isMedicationTaken, toggleMedicationTaken, markMedicationTaken } from './medicationActions';
import { Medication, MedicationLog } from '../types';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  title: 'Test Med',
  unit: '錠',
  dosage: 2,
  label: '朝食後',
  stock: 10,
  memo: '',
  color: 'emerald',
  startDate: Date.now(),
  isFolder: false,
  ...overrides,
});

describe('isMedicationTaken', () => {
  it('returns true when a log exists for the medication and date', () => {
    const logs: MedicationLog[] = [{ id: 'l1', medicationId: 'm1', timestamp: 1, dateStr: '2026-08-07' }];
    expect(isMedicationTaken(logs, 'm1', '2026-08-07')).toBe(true);
  });

  it('returns false when no matching log exists', () => {
    const logs: MedicationLog[] = [{ id: 'l1', medicationId: 'm1', timestamp: 1, dateStr: '2026-08-06' }];
    expect(isMedicationTaken(logs, 'm1', '2026-08-07')).toBe(false);
    expect(isMedicationTaken(logs, 'm2', '2026-08-06')).toBe(false);
  });
});

describe('toggleMedicationTaken', () => {
  it('adds a log and decrements stock when not yet taken', () => {
    const result = toggleMedicationTaken([], [med({ stock: 10, dosage: 2 })], 'm1', '2026-08-07');
    expect(result.changed).toBe(true);
    expect(result.taken).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]).toMatchObject({ medicationId: 'm1', dateStr: '2026-08-07' });
    expect(result.medications[0].stock).toBe(8);
  });

  it('removes the log and restores stock when already taken', () => {
    const logs: MedicationLog[] = [{ id: 'l1', medicationId: 'm1', timestamp: 1, dateStr: '2026-08-07' }];
    const result = toggleMedicationTaken(logs, [med({ stock: 8, dosage: 2 })], 'm1', '2026-08-07');
    expect(result.changed).toBe(true);
    expect(result.taken).toBe(false);
    expect(result.logs).toHaveLength(0);
    expect(result.medications[0].stock).toBe(10);
  });

  it('never drops stock below zero', () => {
    const result = toggleMedicationTaken([], [med({ stock: 1, dosage: 2 })], 'm1', '2026-08-07');
    expect(result.medications[0].stock).toBe(0);
  });

  it('is a no-op when the medication does not exist', () => {
    const result = toggleMedicationTaken([], [], 'missing', '2026-08-07');
    expect(result.changed).toBe(false);
  });
});

describe('markMedicationTaken', () => {
  it('records a dose the first time', () => {
    const result = markMedicationTaken([], [med({ stock: 10, dosage: 2 })], 'm1', '2026-08-07');
    expect(result.changed).toBe(true);
    expect(result.taken).toBe(true);
    expect(result.medications[0].stock).toBe(8);
  });

  it('is idempotent: calling it again for the same day does not double-decrement stock', () => {
    const first = markMedicationTaken([], [med({ stock: 10, dosage: 2 })], 'm1', '2026-08-07');
    const second = markMedicationTaken(first.logs, first.medications, 'm1', '2026-08-07');
    expect(second.changed).toBe(false);
    expect(second.taken).toBe(true);
    expect(second.logs).toHaveLength(1);
    expect(second.medications[0].stock).toBe(8);
  });

  it('is a no-op when the medication does not exist', () => {
    const result = markMedicationTaken([], [], 'missing', '2026-08-07');
    expect(result.changed).toBe(false);
    expect(result.taken).toBe(false);
  });
});
