import { describe, it, expect } from 'vitest';
import { setupFreshDB } from './testUtils';
import {
  getAllMedications,
  getMedication,
  saveMedication,
  deleteMedication,
  deleteAllMedications,
} from '../medications';
import type { Medication } from '../../types';

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

describe('medications DB', () => {
  it('最初は空のリストを返す', async () => {
    const result = await getAllMedications();
    expect(result).toEqual([]);
  });

  it('薬を保存して取得できる', async () => {
    const med = makeMed({ title: 'アムロジピン' });
    await saveMedication(med);

    const all = await getAllMedications();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('アムロジピン');
  });

  it('IDで個別取得できる', async () => {
    const med = makeMed({ id: 'med-1', title: 'バイアスピリン' });
    await saveMedication(med);

    const result = await getMedication('med-1');
    expect(result?.title).toBe('バイアスピリン');
  });

  it('存在しないIDはundefinedを返す', async () => {
    const result = await getMedication('nonexistent');
    expect(result).toBeUndefined();
  });

  it('薬を更新できる（putは上書き）', async () => {
    const med = makeMed({ id: 'med-1', stock: 28 });
    await saveMedication(med);
    await saveMedication({ ...med, stock: 14 });

    const result = await getMedication('med-1');
    expect(result?.stock).toBe(14);
    const all = await getAllMedications();
    expect(all).toHaveLength(1);
  });

  it('薬を削除できる', async () => {
    const med = makeMed({ id: 'med-1' });
    await saveMedication(med);
    await deleteMedication('med-1');

    const result = await getMedication('med-1');
    expect(result).toBeUndefined();
  });

  it('全件削除できる', async () => {
    await saveMedication(makeMed());
    await saveMedication(makeMed());
    await deleteAllMedications();

    const all = await getAllMedications();
    expect(all).toHaveLength(0);
  });

  it('複数の薬を保存して全件取得できる', async () => {
    await saveMedication(makeMed({ title: '薬A' }));
    await saveMedication(makeMed({ title: '薬B' }));
    await saveMedication(makeMed({ title: '薬C' }));

    const all = await getAllMedications();
    expect(all).toHaveLength(3);
    expect(all.map(m => m.title)).toEqual(expect.arrayContaining(['薬A', '薬B', '薬C']));
  });
});
