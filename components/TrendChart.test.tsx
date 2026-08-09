import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendChart } from './TrendChart';

describe('TrendChart', () => {
  it('shows the empty message when there are fewer than 2 points', () => {
    render(<TrendChart series={[{ label: '体重', color: '#2563eb', points: [{ x: '08/01', y: 60 }] }]} />);
    expect(screen.getByText('推移を表示するには2件以上の記録が必要です')).toBeInTheDocument();
  });

  it('supports a custom empty message', () => {
    render(<TrendChart series={[]} emptyMessage="データがありません" />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('renders a line path for a single series with 2+ points', () => {
    const { container } = render(
      <TrendChart series={[{ label: '体重', color: '#2563eb', points: [{ x: '08/01', y: 60 }, { x: '08/02', y: 61 }] }]} />
    );
    expect(container.querySelector('path')).toBeInTheDocument();
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('shows a legend and multiple line paths when given multiple series', () => {
    const { container } = render(
      <TrendChart
        series={[
          { label: '最高', color: '#dc2626', points: [{ x: '08/01', y: 120 }, { x: '08/02', y: 118 }] },
          { label: '最低', color: '#f97316', points: [{ x: '08/01', y: 80 }, { x: '08/02', y: 78 }] },
        ]}
      />
    );
    expect(screen.getByText('最高')).toBeInTheDocument();
    expect(screen.getByText('最低')).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('respects an explicit yMin/yMax domain', () => {
    const { container } = render(
      <TrendChart
        series={[{ label: 'スコア', color: '#2563eb', points: [{ x: '08/01', y: 0 }, { x: '08/02', y: 10 }] }]}
        yMin={0}
        yMax={10}
      />
    );
    // Tick labels should reflect the fixed domain (0 / 5 / 10), not the data range.
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
