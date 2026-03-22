
import { UnitType, LabelType } from './types';

export const UNITS: UnitType[] = [
  '錠', 'カプセル', '包', '個', '枚', '漢方', 'mg', 'ml', '吸入', '注射', '塗り薬', '貼り薬', 'スプレー', '点眼薬'
];

export const LABELS: LabelType[] = [
  '朝食前', '朝食後', '昼食前', '昼食後', '夕食前', '夕食後', '毎食前', '毎食後', '寝る前', '頓服', 'カスタム'
];

export const LABEL_COLORS: Record<string, string> = {
  '朝食前': 'bg-orange-100 text-orange-700 border-orange-200',
  '朝食後': 'bg-orange-200 text-orange-800 border-orange-300',
  '昼食前': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '昼食後': 'bg-yellow-200 text-yellow-800 border-yellow-300',
  '夕食前': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '夕食後': 'bg-indigo-200 text-indigo-800 border-indigo-300',
  '毎食前': 'bg-green-100 text-green-700 border-green-200',
  '毎食後': 'bg-green-200 text-green-800 border-green-300',
  '寝る前': 'bg-purple-100 text-purple-700 border-purple-200',
  '頓服': 'bg-gray-100 text-gray-700 border-gray-200',
  'カスタム': 'bg-blue-100 text-blue-700 border-blue-200', // Default for custom if needed
};

// Helper to get color safely
export const getLabelColor = (label: string) => {
  return LABEL_COLORS[label] || 'bg-blue-100 text-blue-700 border-blue-200';
};

export const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
