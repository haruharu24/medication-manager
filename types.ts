
export type ViewMode = 'home' | 'meds' | 'settings' | 'report-setup' | 'report';
export type CalendarMode = 'month' | 'week' | 'day';

export type UnitType = 
  | '包' | '個' | '錠' | '枚' | 'カプセル' | '漢方' | '吸入' 
  | '注射' | '塗り薬' | '貼り薬' | 'スプレー' | 'mg' | 'ml' | '点眼薬';

export type LabelType = string;

export interface GlobalActionLog {
  id: string;
  timestamp: number;
  type: 'add' | 'update' | 'delete' | 'scan';
  title: string;
  details?: string;
}

export interface Medication {
  id: string;
  title: string;
  unit: UnitType;
  dosage: number;
  label: LabelType;
  stock: number;
  memo: string;
  notificationTime?: string;
  color: string;
  startDate: number;
  isFolder: boolean;
  parentId?: string;
  folderType?: 'multi-dose' | 'one-pack';
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  timestamp: number; 
  dateStr: string; 
}

export interface DailyCondition {
  dateStr: string;
  score: number;
  memo: string;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm
  lastCheckedDate: string; // YYYY-MM-DD
}

export interface ReportConfig {
  start: string;
  end: string;
  includeMeds: boolean;
  includeCondition: boolean;
  includeHistory: boolean;
}
