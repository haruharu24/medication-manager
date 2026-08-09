
import React from 'react';
import { ChevronLeft, FileDown, CheckSquare, Square, Pill, Smile, History, Activity, Syringe, Phone } from 'lucide-react';
import { ReportConfig } from '../../types';

interface ReportSetupViewProps {
  config: ReportConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReportConfig>>;
  onBack: () => void;
  onGenerate: () => void;
}

export const ReportSetupView: React.FC<ReportSetupViewProps> = ({ config, setConfig, onBack, onGenerate }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 animate-in slide-in-from-right duration-300">
      <div className="bg-white dark:bg-slate-800 py-4 safe-top border-b flex items-center px-4">
        <button onClick={onBack} aria-label="戻る" className="p-2 text-slate-600 dark:text-slate-300"><ChevronLeft size={24}/></button>
        <h1 className="flex-1 text-center font-black text-slate-800 dark:text-slate-100">レポート設定</h1>
        <div className="w-10"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">出力期間を選択</h2>
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="report-start-date" className="text-[10px] font-bold text-slate-500 dark:text-slate-500 px-2">開始日</label>
              <input id="report-start-date" type="date" value={config.start} onChange={(e) => setConfig({...config, start: e.target.value})} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl font-black text-slate-800 dark:text-slate-100 outline-none w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="report-end-date" className="text-[10px] font-bold text-slate-500 dark:text-slate-500 px-2">終了日</label>
              <input id="report-end-date" type="date" value={config.end} onChange={(e) => setConfig({...config, end: e.target.value})} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl font-black text-slate-800 dark:text-slate-100 outline-none w-full" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">含める項目</h2>
          <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
            <OptionRow label="服薬達成記録" active={config.includeMeds} onClick={() => setConfig({...config, includeMeds: !config.includeMeds})} icon={<Pill size={20}/>} color="emerald" />
            <OptionRow label="体調ログとメモ" active={config.includeCondition} onClick={() => setConfig({...config, includeCondition: !config.includeCondition})} icon={<Smile size={20}/>} color="blue" />
            <OptionRow label="バイタル記録" active={config.includeVitals} onClick={() => setConfig({...config, includeVitals: !config.includeVitals})} icon={<Activity size={20}/>} color="red" />
            <OptionRow label="アレルギー・既往歴" active={config.includeAllergies} onClick={() => setConfig({...config, includeAllergies: !config.includeAllergies})} icon={<Syringe size={20}/>} color="orange" />
            <OptionRow label="薬局・病院の連絡先" active={config.includeContacts} onClick={() => setConfig({...config, includeContacts: !config.includeContacts})} icon={<Phone size={20}/>} color="teal" />
            <OptionRow label="登録・更新履歴" active={config.includeHistory} onClick={() => setConfig({...config, includeHistory: !config.includeHistory})} icon={<History size={20}/>} color="purple" />
          </div>
        </section>
      </div>

      <div className="p-6 pb-32 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <button onClick={onGenerate} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
          <FileDown size={24} strokeWidth={3} /> レポートを生成する
        </button>
      </div>
    </div>
  );
};

// Full literal class names on purpose: Tailwind's build-time scanner only picks up
// complete tokens it can find as-is in the source, not ones assembled from
// interpolated fragments like `bg-${color}-50` (that only worked under the old
// Play CDN, which scans the live DOM at runtime instead).
const OPTION_ROW_COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600',
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
  purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600',
  red: 'bg-red-50 dark:bg-red-500/10 text-red-600',
  orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700',
  teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600',
};

const OptionRow = ({ label, active, onClick, icon, color }: any) => (
  <button onClick={onClick} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${OPTION_ROW_COLOR_CLASSES[color] || OPTION_ROW_COLOR_CLASSES.emerald}`}>{icon}</div>
      <span className="font-black text-slate-700 dark:text-slate-200">{label}</span>
    </div>
    {active ? <CheckSquare className="text-slate-900 dark:text-white" size={24} /> : <Square className="text-slate-200 dark:text-slate-700" size={24} />}
  </button>
);
