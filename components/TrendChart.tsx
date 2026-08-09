import React from 'react';

export interface TrendChartSeries {
  label: string;
  color: string; // CSS color value, e.g. '#2563eb'
  points: { x: string; y: number }[]; // x is a short label (e.g. MM/dd), points assumed pre-sorted
}

interface TrendChartProps {
  series: TrendChartSeries[];
  yMin?: number;
  yMax?: number;
  emptyMessage?: string;
}

// Generalized from the report screen's original single-series 0-10 score chart:
// supports multiple series sharing one y-scale (e.g. blood pressure's systolic/
// diastolic) and an auto y-domain (± padding) for series without a fixed clinical
// range (weight/temperature/blood sugar).
export const TrendChart: React.FC<TrendChartProps> = ({ series, yMin, yMax, emptyMessage }) => {
  const chartHeight = 150;
  const chartWidth = 500;
  const padding = 30;
  const contentWidth = chartWidth - padding * 2;
  const contentHeight = chartHeight - padding * 2;

  const longestSeries = series.reduce((max, s) => Math.max(max, s.points.length), 0);

  if (series.length === 0 || longestSeries < 2) {
    return (
      <div className="h-[150px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">{emptyMessage || '推移を表示するには2件以上の記録が必要です'}</p>
      </div>
    );
  }

  const allValues = series.flatMap(s => s.points.map(p => p.y));
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const autoPadding = (dataMax - dataMin) * 0.1 || 1;
  const domainMin = yMin ?? dataMin - autoPadding;
  const domainMax = yMax ?? dataMax + autoPadding;
  const domainRange = domainMax - domainMin || 1;

  const toXY = (points: TrendChartSeries['points']) =>
    points.map((p, i) => ({
      x: padding + (points.length > 1 ? (i / (points.length - 1)) * contentWidth : contentWidth / 2),
      y: padding + contentHeight - ((p.y - domainMin) / domainRange) * contentHeight,
      label: p.x,
    }));

  const seriesPoints = series.map(s => ({ ...s, plotted: toXY(s.points) }));
  const longest = seriesPoints.reduce((a, b) => (a.plotted.length >= b.plotted.length ? a : b));

  const yTicks = [domainMin, (domainMin + domainMax) / 2, domainMax];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
      {series.length > 1 && (
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          {series.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[400px]">
        {yTicks.map((val, i) => {
          const y = padding + contentHeight - ((val - domainMin) / domainRange) * contentHeight;
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4" />
              <text x={padding - 10} y={y + 4} fontSize="10" fontWeight="bold" fill="#94a3b8" textAnchor="end">{Math.round(val * 10) / 10}</text>
            </g>
          );
        })}

        {seriesPoints.map(s => {
          const pathD = s.plotted.length > 0
            ? `M ${s.plotted[0].x} ${s.plotted[0].y} ` + s.plotted.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
            : '';
          return (
            <g key={s.label}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {s.plotted.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill="white" stroke={s.color} strokeWidth="3" />
              ))}
            </g>
          );
        })}

        {[0, Math.floor(longest.plotted.length / 2), longest.plotted.length - 1].map(i => {
          const p = longest.plotted[i];
          if (!p) return null;
          return (
            <text key={i} x={p.x} y={chartHeight - 5} fontSize="9" fontWeight="black" fill="#94a3b8" textAnchor="middle">
              {p.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
