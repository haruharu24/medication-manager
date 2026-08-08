import { beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDBInstance } from '../database';

export function setupFreshDB() {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    resetDBInstance();
  });
}
