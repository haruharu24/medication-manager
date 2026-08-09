import { format } from 'date-fns';
import { VitalRecord, VitalType } from '../types';
import { TrendChartSeries } from '../components/TrendChart';

export const VITAL_TYPES: VitalType[] = ['bloodPressure', 'weight', 'temperature', 'bloodSugar'];

export const VITAL_TYPE_LABELS: Record<VitalType, string> = {
  bloodPressure: '血圧',
  weight: '体重',
  temperature: '体温',
  bloodSugar: '血糖値',
};

export const VITAL_TYPE_UNITS: Record<VitalType, string> = {
  bloodPressure: 'mmHg',
  weight: 'kg',
  temperature: '℃',
  bloodSugar: 'mg/dL',
};

export const VITAL_TYPE_COLORS: Record<VitalType, string> = {
  bloodPressure: '#dc2626',
  weight: '#2563eb',
  temperature: '#d97706',
  bloodSugar: '#9333ea',
};

export const groupVitalsByType = (vitals: VitalRecord[]): Record<VitalType, VitalRecord[]> => {
  const grouped: Record<VitalType, VitalRecord[]> = { bloodPressure: [], weight: [], temperature: [], bloodSugar: [] };
  vitals.forEach(v => grouped[v.type].push(v));
  VITAL_TYPES.forEach(t => grouped[t].sort((a, b) => a.timestamp - b.timestamp));
  return grouped;
};

// Blood pressure plots as two series sharing one y-scale (systolic/diastolic);
// every other type is a single series.
export const buildVitalSeries = (type: VitalType, records: VitalRecord[]): TrendChartSeries[] => {
  const label = (r: VitalRecord) => format(new Date(r.timestamp), 'MM/dd');
  if (type === 'bloodPressure') {
    return [
      { label: '最高', color: '#dc2626', points: records.map(r => ({ x: label(r), y: (r as any).systolic })) },
      { label: '最低', color: '#f97316', points: records.map(r => ({ x: label(r), y: (r as any).diastolic })) },
    ];
  }
  return [{ label: VITAL_TYPE_LABELS[type], color: VITAL_TYPE_COLORS[type], points: records.map(r => ({ x: label(r), y: (r as any).value })) }];
};

export const formatVitalValue = (record: VitalRecord): string => {
  if (record.type === 'bloodPressure') {
    return `${record.systolic}/${record.diastolic}${record.pulse ? ` (脈${record.pulse})` : ''}`;
  }
  return `${record.value}`;
};
