import React from 'react';
import { X, Check, CheckCheck } from 'lucide-react';
import { Medication, MedicationLog } from '../types';
import { isMedicationTaken } from '../utils/medicationActions';

interface QuickLogSheetProps {
  medications: Medication[];
  logs: MedicationLog[];
  dateStr: string;
  onTake: (medId: string) => void;
  onTakeAll: () => void;
  onClose: () => void;
}

// Opened via the "今すぐ服薬を記録" home-screen shortcut (manifest.json shortcuts,
// /?quickAction=log): a minimal one-tap recording screen for people who find the
// normal edit-mode calendar flow too much friction.
export const QuickLogSheet: React.FC<QuickLogSheetProps> = ({ medications, logs, dateStr, onTake, onTakeAll, onClose }) => {
  const targets = medications.filter(m => !m.isFolder);
  const pending = targets.filter(m => !isMedicationTaken(logs, m.id, dateStr));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="quick-log-title" className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-[32px] p-6 pb-8 safe-bottom animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 id="quick-log-title" className="text-lg font-black text-slate-800 dark:text-slate-100">今すぐ服薬を記録</h2>
          <button onClick={onClose} aria-label="閉じる" className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        {targets.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-500 font-bold py-6 text-center">お薬未登録</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-emerald-600 font-bold py-6 text-center">今日の分はすべて記録済みです</p>
        ) : (
          <>
            <button
              onClick={onTakeAll}
              className="w-full mb-4 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
            >
              <CheckCheck size={18} /> 全部飲んだ
            </button>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto no-scrollbar">
              {pending.map(med => (
                <button
                  key={med.id}
                  onClick={() => onTake(med.id)}
                  className="w-full p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between active:scale-95 transition-transform"
                >
                  <div className="text-left">
                    <p className="font-black text-sm text-slate-800 dark:text-slate-100">{med.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">{med.label} ・ {med.dosage}{med.unit}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 flex items-center justify-center shrink-0">
                    <Check size={16} strokeWidth={3} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
