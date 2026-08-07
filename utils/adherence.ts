import { eachDayOfInterval, format, parse } from 'date-fns';
import { Medication, MedicationLog } from '../types';

export interface MedicationAdherence {
  medicationId: string;
  title: string;
  scheduledDays: number;
  takenDays: number;
  missedDates: string[];
  adherenceRate: number; // 0-100; 100 when there were no scheduled days to judge
}

export interface AdherenceSummary {
  perMedication: MedicationAdherence[];
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  overallRate: number;
}

// A "missed" dose only counts once the day is fully over — today is never judged.
// Days before a medication's registered start date are not counted as scheduled either.
export const getAdherenceSummary = (
  medications: Medication[],
  logs: MedicationLog[],
  rangeStartStr: string,
  rangeEndStr: string
): AdherenceSummary => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const rangeStart = parse(rangeStartStr, 'yyyy-MM-dd', new Date());
  const rangeEndRaw = parse(rangeEndStr, 'yyyy-MM-dd', new Date());
  const rangeEnd = rangeEndRaw > new Date() ? new Date() : rangeEndRaw;

  const dayStrs = rangeStart <= rangeEnd
    ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => d < todayStr)
    : [];

  const perMedication: MedicationAdherence[] = medications
    .filter(m => !m.isFolder)
    .map(med => {
      const medStartStr = format(med.startDate, 'yyyy-MM-dd');
      const scheduledDates = dayStrs.filter(d => d >= medStartStr);
      const takenDates = new Set(logs.filter(l => l.medicationId === med.id).map(l => l.dateStr));
      const missedDates = scheduledDates.filter(d => !takenDates.has(d));
      const takenDays = scheduledDates.length - missedDates.length;
      return {
        medicationId: med.id,
        title: med.title,
        scheduledDays: scheduledDates.length,
        takenDays,
        missedDates,
        adherenceRate: scheduledDates.length > 0 ? Math.round((takenDays / scheduledDates.length) * 100) : 100,
      };
    });

  const totalScheduled = perMedication.reduce((sum, m) => sum + m.scheduledDays, 0);
  const totalTaken = perMedication.reduce((sum, m) => sum + m.takenDays, 0);
  const totalMissed = totalScheduled - totalTaken;

  return {
    perMedication,
    totalScheduled,
    totalTaken,
    totalMissed,
    overallRate: totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100,
  };
};
