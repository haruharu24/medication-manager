import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import { replaceAllMedications, replaceAllLogs, replaceAllConditions, replaceAllGlobalLogs, resetAllData } from '../bulk';
import { getAllMedications, saveMedication } from '../medications';
import { getAllLogs, saveLog } from '../logs';
import { getAllConditions, saveCondition } from '../conditions';
import { getAllGlobalLogs, saveGlobalLog } from '../globalLogs';
import { getReminderSettings, saveReminderSettings } from '../settings';
import type { Medication, MedicationLog, DailyCondition, GlobalActionLog } from '../../types';

const makeMed = (overrides: Partial<Medication> = {}): Medication => ({
  id: crypto.randomUUID(),
  title: 'テスト薬',
  unit: '錠',
  dosage: 1,
  label: '朝食後',
  stock: 28,
  memo: '',
  color: 'emerald',
  startDate: Date.now(),
  isFolder: false,
  ...overrides,
});

setupFreshDB();

describe('replaceAllX', () => {
  it('replaceAllMedicationsはストア全体を渡した配列で置き換える', async () => {
    await saveMedication(makeMed({ id: 'stale', title: '古い薬' }));

    await replaceAllMedications([makeMed({ id: 'new-1', title: '新しい薬' })]);

    const all = await getAllMedications();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('新しい薬');
  });

  it('空配列を渡すとストアが空になる', async () => {
    await saveMedication(makeMed());
    await replaceAllMedications([]);
    expect(await getAllMedications()).toHaveLength(0);
  });

  it('replaceAllLogsはログストアを置き換える', async () => {
    const log: MedicationLog = { id: 'log-1', medicationId: 'med-1', timestamp: Date.now(), dateStr: '2026-08-08' };
    await saveLog({ id: 'stale-log', medicationId: 'med-x', timestamp: 1, dateStr: '2020-01-01' });

    await replaceAllLogs([log]);

    const all = await getAllLogs();
    expect(all).toEqual([log]);
  });

  it('replaceAllConditionsは体調記録ストアを置き換える', async () => {
    const cond: DailyCondition = { dateStr: '2026-08-08', score: 5, memo: '普通' };
    await saveCondition({ dateStr: '2020-01-01', score: 1, memo: '古い' });

    await replaceAllConditions([cond]);

    expect(await getAllConditions()).toEqual([cond]);
  });

  it('replaceAllGlobalLogsは履歴ストアを置き換える', async () => {
    const log: GlobalActionLog = { id: 'gl-1', timestamp: Date.now(), type: 'add', title: '新規' };
    await saveGlobalLog({ id: 'stale', timestamp: 1, type: 'delete', title: '古い' });

    await replaceAllGlobalLogs([log]);

    expect(await getAllGlobalLogs()).toEqual([log]);
  });
});

describe('resetAllData', () => {
  it('全5ストアを空にする', async () => {
    await saveMedication(makeMed());
    await saveLog({ id: 'log-1', medicationId: 'med-1', timestamp: Date.now(), dateStr: '2026-08-08' });
    await saveCondition({ dateStr: '2026-08-08', score: 5, memo: '' });
    await saveGlobalLog({ id: 'gl-1', timestamp: Date.now(), type: 'add', title: '薬' });
    await saveReminderSettings({ enabled: true, time: '09:00', lastCheckedDate: '2026-08-08' });

    await resetAllData();

    expect(await getAllMedications()).toHaveLength(0);
    expect(await getAllLogs()).toHaveLength(0);
    expect(await getAllConditions()).toHaveLength(0);
    expect(await getAllGlobalLogs()).toHaveLength(0);
    expect(await getReminderSettings()).toEqual({ enabled: false, time: '08:00', lastCheckedDate: '' });
  });
});
