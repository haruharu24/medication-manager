import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildBackup, downloadBackup, parseBackupFile, BACKUP_VERSION } from './backup';
import { ReminderSettings } from '../types';

const emptyReminder: ReminderSettings = { enabled: false, time: '08:00', lastCheckedDate: '' };

describe('buildBackup', () => {
  it('stamps the current version and an ISO export timestamp', () => {
    const backup = buildBackup({ medications: [], logs: [], globalLogs: [], conditions: [], reminderSettings: emptyReminder });
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(() => new Date(backup.exportedAt).toISOString()).not.toThrow();
    expect(new Date(backup.exportedAt).toISOString()).toBe(backup.exportedAt);
  });

  it('carries through the provided data unchanged', () => {
    const backup = buildBackup({
      medications: [{ id: 'm1' } as any],
      logs: [],
      globalLogs: [],
      conditions: [],
      reminderSettings: emptyReminder,
    });
    expect(backup.medications).toEqual([{ id: 'm1' }]);
  });
});

describe('downloadBackup', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  });

  it('creates and clicks a download link, then revokes the object URL', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const backup = buildBackup({ medications: [], logs: [], globalLogs: [], conditions: [], reminderSettings: emptyReminder });

    downloadBackup(backup);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    clickSpy.mockRestore();
  });
});

describe('parseBackupFile', () => {
  const validBackup = {
    version: 1,
    exportedAt: '2026-08-01T00:00:00.000Z',
    medications: [],
    logs: [],
    globalLogs: [],
    conditions: [],
    reminderSettings: emptyReminder,
  };

  it('resolves with the parsed backup when the shape is valid', async () => {
    const file = new File([JSON.stringify(validBackup)], 'backup.json', { type: 'application/json' });
    await expect(parseBackupFile(file)).resolves.toEqual(validBackup);
  });

  it('rejects when the file is not valid JSON', async () => {
    const file = new File(['not json'], 'backup.json', { type: 'application/json' });
    await expect(parseBackupFile(file)).rejects.toThrow(/JSON/);
  });

  it('rejects when required arrays are missing', async () => {
    const file = new File([JSON.stringify({ medications: [] })], 'backup.json', { type: 'application/json' });
    await expect(parseBackupFile(file)).rejects.toThrow('バックアップファイルの形式が正しくありません');
  });
});
