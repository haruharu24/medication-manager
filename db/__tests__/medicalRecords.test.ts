import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import { getAllMedicalRecords, saveMedicalRecord, deleteMedicalRecord } from '../medicalRecords';
import type { MedicalRecord } from '../../types';

const makeRecord = (overrides: Partial<MedicalRecord> = {}): MedicalRecord => ({
  id: crypto.randomUUID(),
  type: 'allergy',
  title: 'ペニシリン',
  createdAt: Date.now(),
  ...overrides,
});

setupFreshDB();

describe('medicalRecords DB', () => {
  it('最初は空のリストを返す', async () => {
    expect(await getAllMedicalRecords()).toEqual([]);
  });

  it('アレルギー記録を保存して取得できる', async () => {
    const r = makeRecord({ id: 'r1', type: 'allergy', title: 'ペニシリン', severity: 'severe' });
    await saveMedicalRecord(r);

    expect(await getAllMedicalRecords()).toEqual([r]);
  });

  it('既往歴記録を保存できる', async () => {
    const r = makeRecord({ id: 'r2', type: 'history', title: '高血圧', diagnosedDate: '2020-01-01' });
    await saveMedicalRecord(r);

    const all = await getAllMedicalRecords();
    expect(all).toEqual([r]);
  });

  it('同じidのレコードは上書きされる', async () => {
    await saveMedicalRecord(makeRecord({ id: 'r1', title: '古い名称' }));
    await saveMedicalRecord(makeRecord({ id: 'r1', title: '新しい名称' }));

    const all = await getAllMedicalRecords();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('新しい名称');
  });

  it('アレルギーと既往歴を両方保存して全件取得できる', async () => {
    await saveMedicalRecord(makeRecord({ id: 'r1', type: 'allergy' }));
    await saveMedicalRecord(makeRecord({ id: 'r2', type: 'history' }));

    expect(await getAllMedicalRecords()).toHaveLength(2);
  });

  it('idを指定して削除できる', async () => {
    await saveMedicalRecord(makeRecord({ id: 'r1' }));
    await saveMedicalRecord(makeRecord({ id: 'r2' }));

    await deleteMedicalRecord('r1');

    const all = await getAllMedicalRecords();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('r2');
  });
});
