import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import { getAllGlobalLogs, saveGlobalLog, deleteAllGlobalLogs } from '../globalLogs';
import type { GlobalActionLog } from '../../types';

const makeGlobalLog = (overrides: Partial<GlobalActionLog> = {}): GlobalActionLog => ({
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  type: 'add',
  title: 'テスト薬',
  details: '新規登録しました',
  ...overrides,
});

setupFreshDB();

describe('globalLogs DB', () => {
  it('最初は空のリストを返す', async () => {
    expect(await getAllGlobalLogs()).toEqual([]);
  });

  it('ログを保存して取得できる', async () => {
    await saveGlobalLog(makeGlobalLog({ title: '薬A', type: 'add' }));

    const all = await getAllGlobalLogs();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('薬A');
  });

  it('新しい順（降順）で取得できる', async () => {
    const t = Date.now();
    await saveGlobalLog(makeGlobalLog({ id: 'g1', timestamp: t, title: '古い' }));
    await saveGlobalLog(makeGlobalLog({ id: 'g2', timestamp: t + 1000, title: '新しい' }));

    const all = await getAllGlobalLogs();
    expect(all[0].title).toBe('新しい');
    expect(all[1].title).toBe('古い');
  });

  it('全件削除できる', async () => {
    await saveGlobalLog(makeGlobalLog());
    await saveGlobalLog(makeGlobalLog());
    await deleteAllGlobalLogs();

    expect(await getAllGlobalLogs()).toHaveLength(0);
  });

  it('100件を超えた場合、古いログは自動削除される', async () => {
    const t = Date.now();
    for (let i = 0; i < 101; i++) {
      await saveGlobalLog(makeGlobalLog({ id: `g-${i}`, timestamp: t + i, title: `log-${i}` }));
    }

    const all = await getAllGlobalLogs();
    expect(all.length).toBeLessThanOrEqual(100);
    expect(all[0].title).toBe('log-100');
  });
});
