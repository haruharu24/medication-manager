import { Medication } from '../types';

// When a medication has no explicit lowStockThreshold set, warn once fewer than
// this many doses remain.
export const DEFAULT_LOW_STOCK_DOSES = 3;

export type StockLevel = 'ok' | 'low' | 'empty';

export const getRemainingDoses = (med: Medication): number => {
  if (!med.dosage) return Infinity;
  return med.stock / med.dosage;
};

export const getStockLevel = (med: Medication): StockLevel => {
  if (med.isFolder) return 'ok';
  if (med.stock <= 0) return 'empty';
  const threshold = med.lowStockThreshold ?? DEFAULT_LOW_STOCK_DOSES;
  return getRemainingDoses(med) <= threshold ? 'low' : 'ok';
};

export const isLowOrEmptyStock = (med: Medication): boolean => getStockLevel(med) !== 'ok';
