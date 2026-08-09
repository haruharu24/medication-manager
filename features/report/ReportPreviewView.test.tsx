import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportPreviewView } from './ReportPreviewView';
import type { ReportConfig, Medication, MedicationLog, DailyCondition, GlobalActionLog, VitalRecord, MedicalRecord } from '../../types';

const baseConfig: ReportConfig = {
  start: '2026-08-01',
  end: '2026-08-08',
  includeMeds: true,
  includeCondition: true,
  includeHistory: true,
  includeVitals: true,
  includeAllergies: true,
  includeContacts: true,
};

const noop = () => {};

const render_ = (configOverrides: Partial<ReportConfig> = {}, props: Partial<{
  medications: Medication[]; logs: MedicationLog[]; conditions: DailyCondition[]; globalLogs: GlobalActionLog[];
  vitals: VitalRecord[]; medicalRecords: MedicalRecord[]; medicalContacts: any;
}> = {}) => render(
  <ReportPreviewView
    config={{ ...baseConfig, ...configOverrides }}
    medications={props.medications ?? []}
    logs={props.logs ?? []}
    conditions={props.conditions ?? []}
    globalLogs={props.globalLogs ?? []}
    vitals={props.vitals ?? []}
    medicalRecords={props.medicalRecords ?? []}
    medicalContacts={props.medicalContacts ?? {}}
    onBack={noop}
  />
);

describe('ReportPreviewView', () => {
  it('hides a section when its config flag is off', () => {
    render_({ includeVitals: false });
    expect(screen.queryByText('バイタル記録')).not.toBeInTheDocument();
  });

  it('shows an empty state for vitals within range, and the latest reading when data exists', () => {
    const vitals: VitalRecord[] = [
      { id: 'v1', type: 'weight', value: 60, timestamp: new Date('2026-08-02').getTime(), dateStr: '2026-08-02' } as VitalRecord,
      { id: 'v2', type: 'weight', value: 61, timestamp: new Date('2026-08-05').getTime(), dateStr: '2026-08-05' } as VitalRecord,
      // Outside the configured date range — should not affect the "latest" reading shown.
      { id: 'v3', type: 'weight', value: 99, timestamp: new Date('2026-09-01').getTime(), dateStr: '2026-09-01' } as VitalRecord,
    ];
    render_({}, { vitals });
    expect(screen.getByText(/最新: 61 kg/)).toBeInTheDocument();
  });

  it('shows allergy and history sections regardless of the date range (current-state snapshot)', () => {
    const medicalRecords: MedicalRecord[] = [
      { id: 'a1', type: 'allergy', title: 'ペニシリン', severity: 'severe', createdAt: 1 },
      { id: 'h1', type: 'history', title: '高血圧', createdAt: 1 },
    ];
    render_({}, { medicalRecords });
    expect(screen.getByText(/ペニシリン/)).toBeInTheDocument();
    expect(screen.getByText(/高血圧/)).toBeInTheDocument();
  });

  it('shows the contacts section only when at least one field is set', () => {
    const { rerender } = render_({}, { medicalContacts: {} });
    expect(screen.getByText('連絡先の登録はありません')).toBeInTheDocument();

    rerender(
      <ReportPreviewView
        config={baseConfig}
        medications={[]}
        logs={[]}
        conditions={[]}
        globalLogs={[]}
        vitals={[]}
        medicalRecords={[]}
        medicalContacts={{ pharmacyName: 'さくら薬局' }}
        onBack={noop}
      />
    );
    expect(screen.getByText(/さくら薬局/)).toBeInTheDocument();
  });

  it('filters the history section to the configured date range', () => {
    const globalLogs: GlobalActionLog[] = [
      { id: 'g1', timestamp: new Date('2026-08-03').getTime(), type: 'add', title: 'イン期間内の薬' },
      { id: 'g2', timestamp: new Date('2026-09-01').getTime(), type: 'add', title: '期間外の薬' },
    ];
    render_({}, { globalLogs });
    expect(screen.getByText('イン期間内の薬')).toBeInTheDocument();
    expect(screen.queryByText('期間外の薬')).not.toBeInTheDocument();
  });
});
