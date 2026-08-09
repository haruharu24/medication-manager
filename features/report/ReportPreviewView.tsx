
import React from 'react';
import { format, parse, eachDayOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, Share, Printer, Smile, Pill, History, TrendingUp, AlertTriangle, Activity, Syringe, Phone } from 'lucide-react';
import { ReportConfig, Medication, MedicationLog, DailyCondition, GlobalActionLog, VitalRecord, MedicalRecord, MedicalContacts } from '../../types';
import { getAdherenceSummary } from '../../utils/adherence';
import { TrendChart } from '../../components/TrendChart';
import { VITAL_TYPES, VITAL_TYPE_LABELS, VITAL_TYPE_UNITS, groupVitalsByType, buildVitalSeries, formatVitalValue } from '../../utils/vitalsChart';

interface ReportPreviewViewProps {
  config: ReportConfig;
  medications: Medication[];
  logs: MedicationLog[];
  conditions: DailyCondition[];
  globalLogs: GlobalActionLog[];
  vitals: VitalRecord[];
  medicalRecords: MedicalRecord[];
  medicalContacts: MedicalContacts;
  onBack: () => void;
}

const GLOBAL_LOG_TYPE_LABEL: Record<GlobalActionLog['type'], string> = {
  add: '追加',
  update: '更新',
  delete: '削除',
  scan: 'スキャン',
};

export const ReportPreviewView: React.FC<ReportPreviewViewProps> = ({ config, medications, logs, conditions, globalLogs, vitals, medicalRecords, medicalContacts, onBack }) => {
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

  // Time-series like vitals stay scoped to the report's date range; allergy/
  // history and contacts are current-state snapshots, so they're shown in full
  // regardless of the selected period.
  const vitalsInRange = vitals.filter(v => v.dateStr >= config.start && v.dateStr <= config.end);
  const vitalsByType = groupVitalsByType(vitalsInRange);
  const allergies = medicalRecords.filter(r => r.type === 'allergy');
  const medicalHistory = medicalRecords.filter(r => r.type === 'history');
  const hasContacts = Object.values(medicalContacts).some(v => v && String(v).trim().length > 0);
  const globalLogsInRange = globalLogs
    .filter(l => {
      const dStr = format(new Date(l.timestamp), 'yyyy-MM-dd');
      return dStr >= config.start && dStr <= config.end;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

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
        <button onClick={onBack} aria-label="戻る" className="p-2 text-slate-600 dark:text-slate-300"><ChevronLeft size={24}/></button>
        <div className="flex gap-2">
          <button onClick={handleShare} aria-label="共有" className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full active:scale-90 transition-transform"><Share size={20}/></button>
          <button onClick={() => window.print()} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-full font-black text-sm flex items-center gap-2 shadow-lg"><Printer size={16}/> PDF出力 / 印刷</button>
        </div>
      </div>

      <div className="p-10 space-y-12 max-w-2xl mx-auto w-full print:p-0 print:max-w-none">
        <div className="text-center space-y-2 border-b-8 border-slate-900 dark:border-white pb-10">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Report</h1>
          <p className="text-sm font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">{config.start.replace(/-/g, '/')} — {config.end.replace(/-/g, '/')}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <StatBox label="平均スコア" value={avgScore} color="blue-600" />
          <StatBox label="記録日数" value={`${chartData.length}日`} color="slate-900" />
        </div>

        {config.includeMeds && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <Pill size={28} className="text-emerald-600" /> 服薬達成記録
            </h2>

            {adherence.totalScheduled === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 font-bold text-center py-6">この期間に判定できる記録はありません</p>
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
                        <h3 className="font-black text-slate-800 dark:text-slate-100">{med.title}</h3>
                        <span className={`text-sm font-black ${med.adherenceRate < 80 ? 'text-red-600' : 'text-emerald-600'}`}>
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
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <TrendingUp size={28} className="text-blue-600" /> 体調スコアの推移
            </h2>
            <TrendChart
              series={[{ label: 'スコア', color: '#2563eb', points: chartData.map(d => ({ x: d.date.split('-').slice(1).join('/'), y: d.score })) }]}
              yMin={0}
              yMax={10}
              emptyMessage="推移を表示するには2日以上の記録が必要です"
            />

            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4 mt-12">
              <Smile size={28} className="text-blue-600" /> 日別の詳細
            </h2>
            <div className="space-y-4">
              {dateRange.slice().reverse().map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const cond = conditions.find(c => c.dateStr === dateStr);
                if (!cond || (cond.score === 0 && !cond.memo)) return null;
                return (
                  <div key={dateStr} className="flex gap-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-700">
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{format(date, 'MM/dd')}</p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500">{format(date, '(EE)', { locale: ja })}</p>
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

        {config.includeVitals && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <Activity size={28} className="text-red-600" /> バイタル記録
            </h2>
            {VITAL_TYPES.every(t => vitalsByType[t].length === 0) ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 font-bold text-center py-6">この期間の記録はありません</p>
            ) : (
              VITAL_TYPES.filter(t => vitalsByType[t].length > 0).map(type => {
                const records = vitalsByType[type];
                const latest = records[records.length - 1];
                return (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-800 dark:text-slate-100">{VITAL_TYPE_LABELS[type]}</h3>
                      <span className="text-sm font-black text-slate-600 dark:text-slate-300">最新: {formatVitalValue(latest)} {VITAL_TYPE_UNITS[type]}</span>
                    </div>
                    <TrendChart series={buildVitalSeries(type, records)} />
                  </div>
                );
              })
            )}
          </section>
        )}

        {config.includeAllergies && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <Syringe size={28} className="text-orange-600" /> アレルギー・既往歴
            </h2>
            {allergies.length === 0 && medicalHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 font-bold text-center py-6">記録はありません</p>
            ) : (
              <div className="space-y-6">
                {allergies.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-black text-slate-800 dark:text-slate-100">アレルギー</h3>
                    {allergies.map(r => (
                      <div key={r.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700">
                        <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{r.title}{r.severity && ` (${r.severity === 'severe' ? '重度' : r.severity === 'moderate' ? '中等度' : '軽度'})`}</p>
                        {r.detail && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {medicalHistory.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-black text-slate-800 dark:text-slate-100">既往歴</h3>
                    {medicalHistory.map(r => (
                      <div key={r.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700">
                        <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{r.title}{r.diagnosedDate && ` (${r.diagnosedDate})`}</p>
                        {r.detail && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {config.includeContacts && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <Phone size={28} className="text-teal-600" /> 薬局・病院の連絡先
            </h2>
            {!hasContacts ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 font-bold text-center py-6">連絡先の登録はありません</p>
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-700 space-y-2 text-sm text-slate-700 dark:text-slate-300 font-bold">
                {medicalContacts.pharmacyName && <p>薬局: {medicalContacts.pharmacyName} {medicalContacts.pharmacyPhone}</p>}
                {medicalContacts.hospitalName && <p>病院: {medicalContacts.hospitalName} {medicalContacts.hospitalPhone}</p>}
                {medicalContacts.doctorName && <p>担当医: {medicalContacts.doctorName}</p>}
                {medicalContacts.nextAppointment && <p>次回受診予定日: {medicalContacts.nextAppointment}</p>}
                {medicalContacts.memo && <p className="font-medium text-slate-600 dark:text-slate-400">{medicalContacts.memo}</p>}
              </div>
            )}
          </section>
        )}

        {config.includeHistory && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-700 pb-4">
              <History size={28} className="text-purple-600" /> 登録・更新履歴
            </h2>
            {globalLogsInRange.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 font-bold text-center py-6">この期間の履歴はありません</p>
            ) : (
              <div className="space-y-3">
                {globalLogsInRange.map(log => (
                  <div key={log.id} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700">
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{format(new Date(log.timestamp), 'MM/dd')}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{GLOBAL_LOG_TYPE_LABEL[log.type]}</span>
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-bold mt-1">{log.title}</p>
                      {log.details && <p className="text-xs text-slate-500 dark:text-slate-400">{log.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="text-[10px] text-slate-500 dark:text-slate-600 text-center font-bold uppercase tracking-widest pt-20">
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

// Full literal class names on purpose — see the same note in ReportSetupView's
// OptionRow. Tailwind's build-time scanner can't resolve `text-${color}`.
const STAT_BOX_TEXT_CLASSES: Record<string, string> = {
  'blue-600': 'text-blue-600',
  'slate-900': 'text-slate-900 dark:text-white',
  'emerald-600': 'text-emerald-600',
  'red-500': 'text-red-600',
};

const StatBox = ({ label, value, color }: any) => (
  <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[40px] text-center border-2 border-slate-100 dark:border-slate-700">
    <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2 block">{label}</span>
    <div className={`text-4xl font-black ${STAT_BOX_TEXT_CLASSES[color] || STAT_BOX_TEXT_CLASSES['slate-900']}`}>{value}</div>
  </div>
);
