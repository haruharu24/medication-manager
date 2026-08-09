import { describe, it, expect } from 'vitest';
import { groupVitalsByType, buildVitalSeries, formatVitalValue } from './vitalsChart';
import type { VitalRecord } from '../types';

const bp = (overrides: Partial<VitalRecord> = {}): VitalRecord => ({
  id: 'bp1',
  type: 'bloodPressure',
  systolic: 120,
  diastolic: 80,
  timestamp: new Date('2026-08-01').getTime(),
  dateStr: '2026-08-01',
  ...overrides,
} as VitalRecord);

const weight = (overrides: Partial<VitalRecord> = {}): VitalRecord => ({
  id: 'w1',
  type: 'weight',
  value: 60,
  timestamp: new Date('2026-08-01').getTime(),
  dateStr: '2026-08-01',
  ...overrides,
} as VitalRecord);

describe('groupVitalsByType', () => {
  it('groups records into the 4 known types, sorted by timestamp', () => {
    const older = weight({ id: 'w1', value: 61, timestamp: 1 });
    const newer = weight({ id: 'w2', value: 60, timestamp: 2 });
    const grouped = groupVitalsByType([newer, older, bp()]);

    expect(grouped.weight).toEqual([older, newer]);
    expect(grouped.bloodPressure).toHaveLength(1);
    expect(grouped.temperature).toEqual([]);
    expect(grouped.bloodSugar).toEqual([]);
  });
});

describe('buildVitalSeries', () => {
  it('builds two series (systolic/diastolic) for blood pressure', () => {
    const records = [bp({ systolic: 120, diastolic: 80 }), bp({ id: 'bp2', systolic: 118, diastolic: 76 })];
    const series = buildVitalSeries('bloodPressure', records);

    expect(series).toHaveLength(2);
    expect(series[0].label).toBe('最高');
    expect(series[0].points.map(p => p.y)).toEqual([120, 118]);
    expect(series[1].label).toBe('最低');
    expect(series[1].points.map(p => p.y)).toEqual([80, 76]);
  });

  it('builds a single series for weight', () => {
    const series = buildVitalSeries('weight', [weight({ value: 60 }), weight({ id: 'w2', value: 61 })]);
    expect(series).toHaveLength(1);
    expect(series[0].points.map(p => p.y)).toEqual([60, 61]);
  });
});

describe('formatVitalValue', () => {
  it('formats blood pressure as systolic/diastolic with an optional pulse', () => {
    expect(formatVitalValue(bp({ systolic: 120, diastolic: 80 }))).toBe('120/80');
    expect(formatVitalValue(bp({ systolic: 120, diastolic: 80, pulse: 70 }))).toBe('120/80 (脈70)');
  });

  it('formats single-value types as the bare value', () => {
    expect(formatVitalValue(weight({ value: 62.5 }))).toBe('62.5');
  });
});
