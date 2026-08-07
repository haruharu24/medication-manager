
import React from 'react';
import { format, parse, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, Share, Printer, Smile, Pill, History, TrendingUp, AlertTriangle } from 'lucide-react';
import { ReportConfig, Medication, MedicationLog, DailyCondition, GlobalActionLog } from '../../types';
import { getAdherenceSummary } from '../../utils/adherence';

interface ReportPreviewViewProps {
  config: ReportConfig;
  medications: Medication[];
  logs: MedicationLog[];
  conditions: DailyCondition[];
  globalLogs: GlobalActionLog[];
  onBack: () => void;
}

const ScoreChart: React.FC<{ data: { date: string, score: number }[] }> = ({ data }) => {
  const chartHeight = 150;
  const chartWidth = 500;
  const padding = 30;
  const contentWidth = chartWidth - padding * 2;
  const contentHeight = chartHeight - padding * 2;
  
  if (data.length < 2) return (
    <div className="h-[150px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">推移を表示するには2日以上の記録が必要です</p>
    </div>
  );

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * contentWidth;
    const y = padding + contentHeight - (d.score / 10) * contentHeight;
    return { x, y };
  });

  const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[400px]">
        {/* Y-axis labels */}
        {[0, 5, 10].map(val => {
          const y = padding + contentHeight - (val / 10) * contentHeight;
          return (
            <g key={val}>
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4" />
              <text x={padding - 10} y={y + 4} fontSize="10" fontWeight="bold" fill="#94a3b8" textAnchor="end">{val}</text>
            </g>
          );
        })}
        
        {/* The line */}
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="white" stroke="#2563eb" strokeWidth="3" />
        ))}

        {/* X-axis labels (first, middle, last) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map(i => {
          const d = data[i];
          const x = points[i].x;
          return (
            <text key={i} x={x} y={chartHeight - 5} fontSize="9" fontWeight="black" fill="#94a3b8" textAnchor="middle">
              {d.date.split('-').slice(1).join('/')}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const ReportPreviewView: React.FC<ReportPreviewViewProps> = ({ config, medications, logs, conditions, globalLogs, onBack }) => {
  const startDate = parse(config.start, 'yyyy-MM-dd', new Date());
  const endDate = parse(config.end, 'yyyy-MM-dd', new Date());
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const chartData = dateRange.map(date => {
    const dStr = format(date, 'yyyy-MM-dd');
    const cond = conditions.find(c => c.dateStr === dStr);
    return { date: dStr, score: cond?.score || 0 };
  }).filter(d => d.score > 0);

  const avgScore = chartData.length > 0
    ? (chartData.reduce((acc, curr) => acc + curr.score, 0) / chartData.length).toFixed(1)
    : "0.0";

  const adherence = getAdherenceSummary(medications, logs, config.start, config.end);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'MediMate 服薬レポート',
        text: `${config.start}〜${config.end}の記録をお送りします。`,
        url: window.location.href
      }).catch(() => {});
    } else {
      alert('PDF出力後、保存または送信を行ってください。');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 overflow-y-auto pb-32 print:p-0">
      <div className="p-4 safe-top flex items-center justify-between border-b print:hidden sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl z-50">
        <button onClick={onBack} className="p-2 text-slate-600 dark:text-slate-300"><ChevronLeft size={24}/></button>
        <div className="flex gap-2">
          <button onClick={handleShare} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full active:scale-90 transition-transform"><Share size={20}/></button>
          <button onClick={() => window.print()} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-full font-black text-sm flex items-center gap-2 shadow-lg"><Printer size={16}/> PDF出力 / 印刷</button>
        </div>
      </div>

      <div className="p-10 space-y-12 max-w-2xl mx-auto w-full print:p-0 print:max-w-none">
        <div className="text-center space-y-2 border-b-8 border-slate-900 dark:border-white pb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Report</h2>
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{config.start.replace(/-/g, '/')} — {config.end.replace(/-/g, '/')}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <StatBox label="平均スコア" value={avgScore} color="blue-600" />
          <StatBox label="記録日数" value={`${chartData.length}日`} color="slate-900" />
        </div>

        {config.includeMeds && (
          <section className="space-y-8">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <Pill size={28} className="text-emerald-600" /> 服薬達成記録
            </h3>

            {adherence.totalScheduled === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 font-bold text-center py-6">この期間に判定できる記録はありません</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <StatBox label="全体達成率" value={`${adherence.overallRate}%`} color="emerald-600" />
                  <StatBox label="飲み忘れ" value={`${adherence.totalMissed}回`} color="red-500" />
                </div>

                <div className="space-y-3">
                  {adherence.perMedication.filter(m => m.scheduledDays > 0).map(med => (
                    <div key={med.medicationId} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-800 dark:text-slate-100">{med.title}</h4>
                        <span className={`text-sm font-black ${med.adherenceRate < 80 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {med.adherenceRate}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${med.adherenceRate < 80 ? 'bg-red-400' : 'bg-emerald-500'}`}
                          style={{ width: `${med.adherenceRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{med.takenDays} / {med.scheduledDays} 日 服用</p>
                      {med.missedDates.length > 0 && (
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-amber-600">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <p className="text-xs font-bold leading-relaxed">
                            飲み忘れ: {med.missedDates.slice(0, 5).map(d => d.slice(5).replace('-', '/')).join('、')}
                            {med.missedDates.length > 5 && ` 他${med.missedDates.length - 5}件`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {config.includeCondition && (
          <section className="space-y-8">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <TrendingUp size={28} className="text-blue-600" /> 体調スコアの推移
            </h3>
            <ScoreChart data={chartData} />

            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4 mt-12">
              <Smile size={28} className="text-blue-600" /> 日別の詳細
            </h3>
            <div className="space-y-4">
              {dateRange.slice().reverse().map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const cond = conditions.find(c => c.dateStr === dateStr);
                if (!cond || (cond.score === 0 && !cond.memo)) return null;
                return (
                  <div key={dateStr} className="flex gap-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-700">
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{format(date, 'MM/dd')}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{format(date, '(EE)', { locale: ja })}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">SCORE: {cond.score}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">「{cond.memo || '特記事項なし'}」</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="text-[10px] text-slate-300 dark:text-slate-600 text-center font-bold uppercase tracking-widest pt-20">
          Generated by MediMate Digital Health Platform
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .pb-32 { padding-bottom: 0 !important; }
          .p-10 { padding: 0 !important; }
          @page { margin: 2cm; }
        }
      `}} />
    </div>
  );
};

const StatBox = ({ label, value, color }: any) => (
  <div className={`bg-slate-50 dark:bg-slate-900 p-8 rounded-[40px] text-center border-2 border-slate-100 dark:border-slate-700`}>
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">{label}</span>
    <div className={`text-4xl font-black text-${color}`}>{value}</div>
  </div>
);
