
import React from 'react';
import { ChevronLeft, FileDown, CheckSquare, Square, Pill, Smile, History } from 'lucide-react';
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
        <button onClick={onBack} className="p-2 text-slate-600 dark:text-slate-300"><ChevronLeft size={24}/></button>
        <h1 className="flex-1 text-center font-black text-slate-800 dark:text-slate-100">レポート設定</h1>
        <div className="w-10"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">出力期間を選択</h3>
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2">開始日</label>
              <input type="date" value={config.start} onChange={(e) => setConfig({...config, start: e.target.value})} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl font-black text-slate-800 dark:text-slate-100 outline-none w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2">終了日</label>
              <input type="date" value={config.end} onChange={(e) => setConfig({...config, end: e.target.value})} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl font-black text-slate-800 dark:text-slate-100 outline-none w-full" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">含める項目</h3>
          <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
            <OptionRow label="服薬達成記録" active={config.includeMeds} onClick={() => setConfig({...config, includeMeds: !config.includeMeds})} icon={<Pill size={20}/>} color="emerald" />
            <OptionRow label="体調ログとメモ" active={config.includeCondition} onClick={() => setConfig({...config, includeCondition: !config.includeCondition})} icon={<Smile size={20}/>} color="blue" />
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

const OptionRow = ({ label, active, onClick, icon, color }: any) => (
  <button onClick={onClick} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${color}-50 text-${color}-600`}>{icon}</div>
      <span className="font-black text-slate-700 dark:text-slate-200">{label}</span>
    </div>
    {active ? <CheckSquare className="text-slate-900 dark:text-white" size={24} /> : <Square className="text-slate-200 dark:text-slate-700" size={24} />}
  </button>
);
