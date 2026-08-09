import { openDB, type IDBPDatabase } from 'idb';
import type { Medication, MedicationLog, DailyCondition, ReminderSettings, GlobalActionLog, VitalRecord, MedicalRecord } from '../types';

export interface AppDB {
  medications: {
    key: string;
    value: Medication;
  };
  logs: {
    key: string;
    value: MedicationLog;
    indexes: {
      'by-date': string;
      'by-medication': string;
    };
  };
  conditions: {
    key: string;
    value: DailyCondition;
  };
  globalLogs: {
    key: string;
    value: GlobalActionLog;
    indexes: {
      'by-timestamp': number;
    };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  vitals: {
    key: string;
    value: VitalRecord;
    indexes: {
      'by-date': string;
      'by-type': string;
    };
  };
  medicalRecords: {
    key: string;
    value: MedicalRecord;
    indexes: {
      'by-type': string;
    };
  };
}

const DB_NAME = 'medication-manager';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<AppDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AppDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('medications')) {
        db.createObjectStore('medications', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('logs')) {
        const logsStore = db.createObjectStore('logs', { keyPath: 'id' });
        logsStore.createIndex('by-date', 'dateStr');
        logsStore.createIndex('by-medication', 'medicationId');
      }

      if (!db.objectStoreNames.contains('conditions')) {
        db.createObjectStore('conditions', { keyPath: 'dateStr' });
      }

      if (!db.objectStoreNames.contains('globalLogs')) {
        const globalLogsStore = db.createObjectStore('globalLogs', { keyPath: 'id' });
        globalLogsStore.createIndex('by-timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('vitals')) {
        const vitalsStore = db.createObjectStore('vitals', { keyPath: 'id' });
        vitalsStore.createIndex('by-date', 'dateStr');
        vitalsStore.createIndex('by-type', 'type');
      }

      if (!db.objectStoreNames.contains('medicalRecords')) {
        const medicalRecordsStore = db.createObjectStore('medicalRecords', { keyPath: 'id' });
        medicalRecordsStore.createIndex('by-type', 'type');
      }
    },
  });

  return dbInstance;
}

export function resetDBInstance(): void {
  dbInstance = null;
}
