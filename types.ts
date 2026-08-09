
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
  // Warn when the remaining stock drops to this many doses or fewer. Defaults to
  // DEFAULT_LOW_STOCK_DOSES (utils/stock.ts) when unset.
  lowStockThreshold?: number;
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
  includeVitals: boolean;
  includeAllergies: boolean;
  includeContacts: boolean;
}

export type VitalType = 'bloodPressure' | 'weight' | 'temperature' | 'bloodSugar';

interface VitalRecordBase {
  id: string;
  timestamp: number;
  dateStr: string; // yyyy-MM-dd
  memo?: string;
}

export interface BloodPressureRecord extends VitalRecordBase {
  type: 'bloodPressure';
  systolic: number;
  diastolic: number;
  pulse?: number;
}

export interface WeightRecord extends VitalRecordBase {
  type: 'weight';
  value: number; // kg
}

export interface TemperatureRecord extends VitalRecordBase {
  type: 'temperature';
  value: number; // ℃
}

export interface BloodSugarRecord extends VitalRecordBase {
  type: 'bloodSugar';
  value: number; // mg/dL
}

export type VitalRecord = BloodPressureRecord | WeightRecord | TemperatureRecord | BloodSugarRecord;

export type MedicalRecordType = 'allergy' | 'history';

export interface MedicalRecord {
  id: string;
  type: MedicalRecordType;
  title: string;
  detail?: string;
  diagnosedDate?: string; // yyyy-MM-dd
  severity?: 'mild' | 'moderate' | 'severe';
  createdAt: number;
}

export interface MedicalContacts {
  pharmacyName?: string;
  pharmacyPhone?: string;
  hospitalName?: string;
  hospitalPhone?: string;
  doctorName?: string;
  nextAppointment?: string; // yyyy-MM-dd
  memo?: string;
}
