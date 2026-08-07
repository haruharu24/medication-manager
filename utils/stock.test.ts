import { describe, it, expect } from 'vitest';
import { getRemainingDoses, getStockLevel, isLowOrEmptyStock, DEFAULT_LOW_STOCK_DOSES } from './stock';
import { Medication } from '../types';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  title: 'Test Med',
  unit: '錠',
  dosage: 1,
  label: '朝食後',
  stock: 10,
  memo: '',
  color: 'emerald',
  startDate: Date.now(),
  isFolder: false,
  ...overrides,
});

describe('getRemainingDoses', () => {
  it('divides stock by dosage', () => {
    expect(getRemainingDoses(med({ stock: 10, dosage: 2 }))).toBe(5);
  });

  it('returns Infinity when dosage is zero to avoid a NaN/divide-by-zero result', () => {
    expect(getRemainingDoses(med({ dosage: 0 }))).toBe(Infinity);
  });
});

describe('getStockLevel', () => {
  it('is "ok" for folders regardless of stock', () => {
    expect(getStockLevel(med({ isFolder: true, stock: 0 }))).toBe('ok');
  });

  it('is "empty" once stock reaches zero', () => {
    expect(getStockLevel(med({ stock: 0 }))).toBe('empty');
  });

  it('is "low" at or below the default threshold of remaining doses', () => {
    expect(getStockLevel(med({ stock: DEFAULT_LOW_STOCK_DOSES, dosage: 1 }))).toBe('low');
  });

  it('is "ok" above the threshold', () => {
    expect(getStockLevel(med({ stock: DEFAULT_LOW_STOCK_DOSES + 1, dosage: 1 }))).toBe('ok');
  });

  it('respects a custom lowStockThreshold', () => {
    expect(getStockLevel(med({ stock: 5, dosage: 1, lowStockThreshold: 10 }))).toBe('low');
    expect(getStockLevel(med({ stock: 5, dosage: 1, lowStockThreshold: 2 }))).toBe('ok');
  });
});

describe('isLowOrEmptyStock', () => {
  it('is false when stock level is ok', () => {
    expect(isLowOrEmptyStock(med({ stock: 100, dosage: 1 }))).toBe(false);
  });

  it('is true for low or empty stock', () => {
    expect(isLowOrEmptyStock(med({ stock: 0, dosage: 1 }))).toBe(true);
    expect(isLowOrEmptyStock(med({ stock: 1, dosage: 1 }))).toBe(true);
  });
});
