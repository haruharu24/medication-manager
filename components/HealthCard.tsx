
import React from 'react';
import { Smile, MessageSquare } from 'lucide-react';
import { DailyCondition } from '../types';

interface HealthCardProps {
  condition: DailyCondition;
  onUpdate: (updates: Partial<DailyCondition>) => void;
  selectedDate: Date;
  isEditMode: boolean;
}

export const HealthCard: React.FC<HealthCardProps> = ({ condition, onUpdate, selectedDate, isEditMode }) => {
  const scores = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className={`rounded-2xl p-3 border transition-all duration-300 ${
      isEditMode ? 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-500/20 shadow-md ring-1 ring-blue-50 dark:ring-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${condition.score > 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
            <Smile size={18}/>
          </div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">スコアとメモ</span>
        </div>
        {condition.score > 0 && !isEditMode && (
          <div className="text-blue-600 font-black text-xl leading-none">
            {condition.score}<span className="text-[10px] ml-0.5 text-slate-300 dark:text-slate-600">/10</span>
          </div>
        )}
      </div>
      
      {isEditMode ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
          <div>
            <div className="grid grid-cols-5 gap-1.5">
              {scores.map((s) => (
                <button 
                  key={s} 
                  onClick={() => onUpdate({ score: s })}
                  className={`h-8 rounded-lg font-black text-xs transition-all active:scale-90 ${
                    condition.score === s 
                      ? 'bg-blue-600 text-white shadow shadow-blue-100 scale-105' 
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1 px-1 text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">
              <span>悪い</span>
              <span>良い</span>
            </div>
          </div>

          <div className="relative">
            <MessageSquare size={12} className="absolute left-2.5 top-2.5 text-slate-300 dark:text-slate-600" />
            <textarea 
              value={condition.memo}
              onChange={(e) => onUpdate({ memo: e.target.value })}
              placeholder="症状や気分のメモ..."
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 pl-8 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-1 ring-blue-100 dark:ring-blue-500/20 transition-all resize-none min-h-[50px]"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {condition.score === 0 && !condition.memo ? (
            <p className="text-xs font-medium text-slate-300 dark:text-slate-600 text-center py-2 border border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
              記録なし
            </p>
          ) : (
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {condition.memo || "メモなし"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
