import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import { getMedicalContacts, saveMedicalContacts } from '../contacts';
import type { MedicalContacts } from '../../types';

setupFreshDB();

describe('contacts DB', () => {
  it('デフォルト値(空オブジェクト)を返す（未保存時）', async () => {
    expect(await getMedicalContacts()).toEqual({});
  });

  it('薬局・病院連絡先を保存して取得できる', async () => {
    const c: MedicalContacts = {
      pharmacyName: 'さくら薬局',
      pharmacyPhone: '03-1234-5678',
      hospitalName: 'さくら病院',
      hospitalPhone: '03-8765-4321',
      doctorName: '佐藤先生',
      nextAppointment: '2026-09-01',
      memo: '毎月第1月曜',
    };
    await saveMedicalContacts(c);

    expect(await getMedicalContacts()).toEqual(c);
  });

  it('上書き保存できる', async () => {
    await saveMedicalContacts({ pharmacyName: 'A薬局' });
    await saveMedicalContacts({ pharmacyName: 'B薬局' });

    const result = await getMedicalContacts();
    expect(result.pharmacyName).toBe('B薬局');
  });
});
