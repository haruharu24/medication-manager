import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportSetupView } from './ReportSetupView';
import type { ReportConfig } from '../../types';

const baseConfig: ReportConfig = {
  start: '2026-07-01',
  end: '2026-08-01',
  includeMeds: true,
  includeCondition: true,
  includeHistory: true,
  includeVitals: true,
  includeAllergies: true,
  includeContacts: true,
};

describe('ReportSetupView', () => {
  it('renders a toggle row for every report section, including the new ones', () => {
    render(<ReportSetupView config={baseConfig} setConfig={vi.fn()} onBack={vi.fn()} onGenerate={vi.fn()} />);
    ['服薬達成記録', '体調ログとメモ', 'バイタル記録', 'アレルギー・既往歴', '薬局・病院の連絡先', '登録・更新履歴'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('toggles includeVitals when its row is clicked', async () => {
    const user = userEvent.setup();
    const setConfig = vi.fn();
    render(<ReportSetupView config={baseConfig} setConfig={setConfig} onBack={vi.fn()} onGenerate={vi.fn()} />);

    await user.click(screen.getByText('バイタル記録'));
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ includeVitals: false }));
  });

  it('calls onGenerate from the generate button', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<ReportSetupView config={baseConfig} setConfig={vi.fn()} onBack={vi.fn()} onGenerate={onGenerate} />);

    await user.click(screen.getByText('レポートを生成する'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('calls onBack from the back button', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ReportSetupView config={baseConfig} setConfig={vi.fn()} onBack={onBack} onGenerate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '戻る' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
