import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import {
  getAllLogs,
  getLogsByDate,
  getLogsByMedication,
  saveLog,
  deleteLog,
  deleteAllLogs,
} from '../logs';
import type { MedicationLog } from '../../types';

const makeLog = (overrides: Partial<MedicationLog> = {}): MedicationLog => ({
  id: crypto.randomUUID(),
  medicationId: 'med-1',
  timestamp: Date.now(),
  dateStr: '2026-05-31',
  ...overrides,
});

setupFreshDB();

describe('logs DB', () => {
  it('最初は空のリストを返す', async () => {
    expect(await getAllLogs()).toEqual([]);
  });

  it('ログを保存して全件取得できる', async () => {
    await saveLog(makeLog({ id: 'log-1' }));
    await saveLog(makeLog({ id: 'log-2' }));

    const all = await getAllLogs();
    expect(all).toHaveLength(2);
  });

  it('日付でフィルタリングできる', async () => {
    await saveLog(makeLog({ id: 'l1', dateStr: '2026-05-31' }));
    await saveLog(makeLog({ id: 'l2', dateStr: '2026-05-31' }));
    await saveLog(makeLog({ id: 'l3', dateStr: '2026-06-01' }));

    const result = await getLogsByDate('2026-05-31');
    expect(result).toHaveLength(2);
    expect(result.every(l => l.dateStr === '2026-05-31')).toBe(true);
  });

  it('薬IDでフィルタリングできる', async () => {
    await saveLog(makeLog({ id: 'l1', medicationId: 'med-A' }));
    await saveLog(makeLog({ id: 'l2', medicationId: 'med-B' }));
    await saveLog(makeLog({ id: 'l3', medicationId: 'med-A' }));

    const result = await getLogsByMedication('med-A');
    expect(result).toHaveLength(2);
    expect(result.every(l => l.medicationId === 'med-A')).toBe(true);
  });

  it('ログを削除できる', async () => {
    await saveLog(makeLog({ id: 'log-1' }));
    await deleteLog('log-1');

    const all = await getAllLogs();
    expect(all).toHaveLength(0);
  });

  it('全件削除できる', async () => {
    await saveLog(makeLog());
    await saveLog(makeLog());
    await deleteAllLogs();

    expect(await getAllLogs()).toHaveLength(0);
  });

  it('存在しない日付は空配列を返す', async () => {
    await saveLog(makeLog({ dateStr: '2026-05-31' }));
    const result = await getLogsByDate('2099-01-01');
    expect(result).toEqual([]);
  });
});
