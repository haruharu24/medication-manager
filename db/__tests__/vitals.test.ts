import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import { getAllVitals, saveVital, deleteVital } from '../vitals';
import type { VitalRecord } from '../../types';

const makeVital = (overrides: Partial<VitalRecord> = {}): VitalRecord => ({
  id: crypto.randomUUID(),
  type: 'weight',
  timestamp: Date.now(),
  dateStr: '2026-08-08',
  value: 60,
  ...overrides,
} as VitalRecord);

setupFreshDB();

describe('vitals DB', () => {
  it('最初は空のリストを返す', async () => {
    expect(await getAllVitals()).toEqual([]);
  });

  it('バイタル記録を保存して取得できる', async () => {
    const v = makeVital({ id: 'v1', type: 'weight', value: 62.5 });
    await saveVital(v);

    const all = await getAllVitals();
    expect(all).toEqual([v]);
  });

  it('同じidのレコードは上書きされる', async () => {
    await saveVital(makeVital({ id: 'v1', type: 'weight', value: 60 }));
    await saveVital(makeVital({ id: 'v1', type: 'weight', value: 61 }));

    const all = await getAllVitals();
    expect(all).toHaveLength(1);
    expect((all[0] as any).value).toBe(61);
  });

  it('同じ日に複数種類・複数件のバイタルを記録できる', async () => {
    await saveVital(makeVital({ id: 'v1', type: 'weight', value: 60, dateStr: '2026-08-08' }));
    await saveVital(makeVital({
      id: 'v2',
      type: 'bloodPressure',
      dateStr: '2026-08-08',
      systolic: 120,
      diastolic: 80,
    } as any));

    const all = await getAllVitals();
    expect(all).toHaveLength(2);
  });

  it('idを指定して削除できる', async () => {
    await saveVital(makeVital({ id: 'v1' }));
    await saveVital(makeVital({ id: 'v2' }));

    await deleteVital('v1');

    const all = await getAllVitals();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('v2');
  });
});
