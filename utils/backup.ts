import { format } from 'date-fns';
import { Medication, MedicationLog, GlobalActionLog, DailyCondition, ReminderSettings, VitalRecord, MedicalRecord, MedicalContacts } from '../types';

export const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  medications: Medication[];
  logs: MedicationLog[];
  globalLogs: GlobalActionLog[];
  conditions: DailyCondition[];
  reminderSettings: ReminderSettings;
  vitals: VitalRecord[];
  medicalRecords: MedicalRecord[];
  medicalContacts: MedicalContacts;
}

export const buildBackup = (data: Omit<BackupData, 'version' | 'exportedAt'>): BackupData => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  ...data,
});

export const downloadBackup = (backup: BackupData): void => {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medimate-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

export const parseBackupFile = (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          !parsed ||
          !isArray(parsed.medications) ||
          !isArray(parsed.logs) ||
          !isArray(parsed.globalLogs) ||
          !isArray(parsed.conditions) ||
          typeof parsed.reminderSettings !== 'object'
        ) {
          reject(new Error('バックアップファイルの形式が正しくありません'));
          return;
        }
        // vitals/medicalRecords/medicalContacts were added after BACKUP_VERSION 1
        // shipped, so older backup files won't have them — default instead of
        // rejecting, so existing backups remain importable.
        resolve({
          ...parsed,
          vitals: isArray(parsed.vitals) ? parsed.vitals : [],
          medicalRecords: isArray(parsed.medicalRecords) ? parsed.medicalRecords : [],
          medicalContacts: typeof parsed.medicalContacts === 'object' && parsed.medicalContacts ? parsed.medicalContacts : {},
        } as BackupData);
      } catch (e) {
        reject(new Error('バックアップファイルの読み込みに失敗しました(JSON形式ではありません)'));
      }
    };
    reader.readAsText(file);
  });
};
