import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAdherenceSummary } from './adherence';
import { Medication, MedicationLog } from '../types';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  title: 'Test Med',
  unit: '錠',
  dosage: 1,
  label: '朝食後',
  stock: 10,
  memo: '',
  color: 'emerald',
  startDate: new Date('2026-08-01').getTime(),
  isFolder: false,
  ...overrides,
});

const log = (medicationId: string, dateStr: string): MedicationLog => ({
  id: `${medicationId}-${dateStr}`,
  medicationId,
  timestamp: new Date(dateStr).getTime(),
  dateStr,
});

describe('getAdherenceSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts scheduled days from the range but excludes today', () => {
    const summary = getAdherenceSummary([med()], [], '2026-08-05', '2026-08-10');
    // 08-05..08-09 = 5 days; 08-10 (today) is excluded
    expect(summary.perMedication[0].scheduledDays).toBe(5);
  });

  it('marks days without a matching log as missed', () => {
    const logs = [log('m1', '2026-08-05'), log('m1', '2026-08-07')];
    const summary = getAdherenceSummary([med()], logs, '2026-08-05', '2026-08-10');
    const stat = summary.perMedication[0];
    expect(stat.takenDays).toBe(2);
    expect(stat.missedDates).toEqual(['2026-08-06', '2026-08-08', '2026-08-09']);
    expect(stat.adherenceRate).toBe(40); // 2/5
  });

  it('excludes days before the medication start date from the schedule', () => {
    const summary = getAdherenceSummary(
      [med({ startDate: new Date('2026-08-08').getTime() })],
      [],
      '2026-08-05',
      '2026-08-10'
    );
    // Only 08-08 and 08-09 are on/after the start date and before today
    expect(summary.perMedication[0].scheduledDays).toBe(2);
  });

  it('excludes folders from per-medication stats', () => {
    const summary = getAdherenceSummary([med({ isFolder: true })], [], '2026-08-05', '2026-08-10');
    expect(summary.perMedication).toHaveLength(0);
  });

  it('reports 100% adherence when there is nothing to schedule yet', () => {
    const summary = getAdherenceSummary(
      [med({ startDate: new Date('2026-08-20').getTime() })],
      [],
      '2026-08-05',
      '2026-08-10'
    );
    expect(summary.perMedication[0].scheduledDays).toBe(0);
    expect(summary.perMedication[0].adherenceRate).toBe(100);
    expect(summary.overallRate).toBe(100);
  });

  it('aggregates totals across multiple medications', () => {
    const medA = med({ id: 'a' });
    const medB = med({ id: 'b' });
    const logs = [log('a', '2026-08-05'), log('a', '2026-08-06'), log('a', '2026-08-07'), log('a', '2026-08-08'), log('a', '2026-08-09')];
    const summary = getAdherenceSummary([medA, medB], logs, '2026-08-05', '2026-08-10');
    expect(summary.totalScheduled).toBe(10); // 5 days x 2 meds
    expect(summary.totalTaken).toBe(5); // only medA fully taken
    expect(summary.totalMissed).toBe(5);
    expect(summary.overallRate).toBe(50);
  });
});
