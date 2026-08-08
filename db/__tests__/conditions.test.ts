import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import {
  getAllConditions,
  getCondition,
  saveCondition,
  deleteAllConditions,
} from '../conditions';
import type { DailyCondition } from '../../types';

const makeCond = (overrides: Partial<DailyCondition> = {}): DailyCondition => ({
  dateStr: '2026-05-31',
  score: 7,
  memo: '体調良好',
  ...overrides,
});

setupFreshDB();

describe('conditions DB', () => {
  it('最初は空のリストを返す', async () => {
    expect(await getAllConditions()).toEqual([]);
  });

  it('体調記録を保存して取得できる', async () => {
    await saveCondition(makeCond({ dateStr: '2026-05-31', score: 8 }));

    const result = await getCondition('2026-05-31');
    expect(result?.score).toBe(8);
  });

  it('存在しない日付はundefinedを返す', async () => {
    const result = await getCondition('2099-01-01');
    expect(result).toBeUndefined();
  });

  it('同じ日付のレコードは上書きされる', async () => {
    await saveCondition(makeCond({ dateStr: '2026-05-31', score: 5, memo: '普通' }));
    await saveCondition(makeCond({ dateStr: '2026-05-31', score: 9, memo: '良い' }));

    const result = await getCondition('2026-05-31');
    expect(result?.score).toBe(9);
    expect(result?.memo).toBe('良い');

    const all = await getAllConditions();
    expect(all).toHaveLength(1);
  });

  it('複数日の記録を保存して全件取得できる', async () => {
    await saveCondition(makeCond({ dateStr: '2026-05-29', score: 6 }));
    await saveCondition(makeCond({ dateStr: '2026-05-30', score: 7 }));
    await saveCondition(makeCond({ dateStr: '2026-05-31', score: 8 }));

    const all = await getAllConditions();
    expect(all).toHaveLength(3);
  });

  it('全件削除できる', async () => {
    await saveCondition(makeCond({ dateStr: '2026-05-31' }));
    await saveCondition(makeCond({ dateStr: '2026-06-01' }));
    await deleteAllConditions();

    expect(await getAllConditions()).toHaveLength(0);
  });
});
