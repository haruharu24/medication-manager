import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBInstance } from '../database';
import { migrateFromLocalStorage } from '../migration';
import { getAllMedications } from '../medications';
import { getAllLogs } from '../logs';
import { getAllConditions } from '../conditions';
import { getAllGlobalLogs } from '../globalLogs';
import { getReminderSettings } from '../settings';

const localStorageData: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageData[key] ?? null,
  setItem: (key: string, value: string) => { localStorageData[key] = value; },
  removeItem: (key: string) => { delete localStorageData[key]; },
  clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); },
};

beforeEach(() => {
  Object.keys(localStorageData).forEach(k => delete localStorageData[k]);
  vi.stubGlobal('localStorage', localStorageMock);
  globalThis.indexedDB = new IDBFactory();
  resetDBInstance();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('migration', () => {
  it('localStorageが空の場合、マイグレーションフラグのみ設定される', async () => {
    await migrateFromLocalStorage();

    expect(localStorageData['idb-migration-done']).toBe('true');
    expect(await getAllMedications()).toHaveLength(0);
    expect(await getAllLogs()).toHaveLength(0);
  });

  it('localStorageのデータをIndexedDBに移行できる', async () => {
    localStorageData['medications'] = JSON.stringify([
      { id: 'med-1', title: 'アムロジピン', unit: '錠', dosage: 1, label: '朝食後', stock: 28, memo: '', color: 'emerald', startDate: Date.now(), isFolder: false },
    ]);
    localStorageData['logs'] = JSON.stringify([
      { id: 'log-1', medicationId: 'med-1', timestamp: Date.now(), dateStr: '2026-05-31' },
    ]);
    localStorageData['conditions'] = JSON.stringify([
      { dateStr: '2026-05-31', score: 8, memo: '良好' },
    ]);
    localStorageData['globalLogs'] = JSON.stringify([
      { id: 'gl-1', timestamp: Date.now(), type: 'add', title: 'アムロジピン', details: '新規登録' },
    ]);
    localStorageData['reminderSettings'] = JSON.stringify({ enabled: true, time: '08:00', lastCheckedDate: '' });

    await migrateFromLocalStorage();

    expect(await getAllMedications()).toHaveLength(1);
    expect((await getAllMedications())[0].title).toBe('アムロジピン');
    expect(await getAllLogs()).toHaveLength(1);
    expect(await getAllConditions()).toHaveLength(1);
    expect(await getAllGlobalLogs()).toHaveLength(1);
    const settings = await getReminderSettings();
    expect(settings.enabled).toBe(true);
    expect(localStorageData['idb-migration-done']).toBe('true');
  });

  it('マイグレーション済みフラグがある場合、再実行されない', async () => {
    localStorageData['idb-migration-done'] = 'true';
    localStorageData['medications'] = JSON.stringify([
      { id: 'med-1', title: 'スキップされるはず', unit: '錠', dosage: 1, label: '朝食後', stock: 28, memo: '', color: 'emerald', startDate: Date.now(), isFolder: false },
    ]);

    await migrateFromLocalStorage();

    expect(await getAllMedications()).toHaveLength(0);
  });

  it('壊れたJSONがあってもクラッシュしない', async () => {
    localStorageData['medications'] = 'invalid-json';

    await expect(migrateFromLocalStorage()).resolves.not.toThrow();
    expect(await getAllMedications()).toHaveLength(0);
  });
});
