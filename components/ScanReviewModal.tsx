
import React, { useState } from 'react';
import { ChevronLeft, Trash2, Pill, ChevronDown, Check } from 'lucide-react';
import { Medication, UnitType, LabelType } from '../types';
import { UNITS, LABELS } from '../constants';

interface ScanReviewModalProps {
  drafts: Medication[];
  onConfirm: (meds: Medication[]) => void;
  onCancel: () => void;
}

export const ScanReviewModal: React.FC<ScanReviewModalProps> = ({ drafts, onConfirm, onCancel }) => {
  const [items, setItems] = useState<Medication[]>(drafts);

  const updateItem = (id: string, patch: Partial<Medication>) => {
    setItems(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(m => m.id !== id));
  };

  const handleConfirm = () => {
    const valid = items.filter(m => m.title.trim().length > 0);
    onConfirm(valid);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="scan-review-title" className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-200 dark:border-slate-700 safe-top">
        <button onClick={onCancel} aria-label="戻る" className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft size={24} /></button>
        <div className="flex flex-col items-center">
          <h2 id="scan-review-title" className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">スキャン結果を確認</h2>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase">{items.length}件</span>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto space-y-4">
          {items.length === 0 && (
            <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-500 py-20">追加するお薬がありません</p>
          )}
          {items.map((med, idx) => (
            <div key={med.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Pill className="text-emerald-500 shrink-0" size={20} />
                  <input
                    aria-label={`お薬${idx + 1}の名前`}
                    type="text"
                    value={med.title}
                    onChange={(e) => updateItem(med.id, { title: e.target.value })}
                    placeholder="名称を入力..."
                    className="flex-1 bg-transparent text-lg font-black text-slate-800 dark:text-slate-100 outline-none min-w-0"
                  />
                </div>
                <button type="button" onClick={() => removeItem(med.id)} aria-label={`${med.title || 'お薬'}をリストから削除`} className="p-2 -mr-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors shrink-0">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label htmlFor={`scan-dosage-${med.id}`} className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">1回の量</label>
                  <input
                    id={`scan-dosage-${med.id}`}
                    type="number"
                    step="0.1"
                    value={med.dosage}
                    onChange={(e) => updateItem(med.id, { dosage: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
                <div className="relative">
                  <label htmlFor={`scan-unit-${med.id}`} className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">単位</label>
                  <select
                    id={`scan-unit-${med.id}`}
                    value={med.unit}
                    onChange={(e) => updateItem(med.id, { unit: e.target.value as UnitType })}
                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-500 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label htmlFor={`scan-label-${med.id}`} className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">タイミング</label>
                  <select
                    id={`scan-label-${med.id}`}
                    value={med.label}
                    onChange={(e) => updateItem(med.id, { label: e.target.value as LabelType })}
                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none"
                  >
                    {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-slate-500 dark:text-slate-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <label htmlFor={`scan-stock-${med.id}`} className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">在庫</label>
                  <input
                    id={`scan-stock-${med.id}`}
                    type="number"
                    value={med.stock}
                    onChange={(e) => updateItem(med.id, { stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`scan-memo-${med.id}`} className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">メモ</label>
                <input
                  id={`scan-memo-${med.id}`}
                  type="text"
                  value={med.memo}
                  onChange={(e) => updateItem(med.id, { memo: e.target.value })}
                  placeholder="特記事項があれば..."
                  className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-6 pb-safe safe-bottom z-50">
        <button
          onClick={handleConfirm}
          disabled={items.length === 0}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Check size={24} strokeWidth={3} /> {items.length}件を追加
        </button>
      </div>
    </div>
  );
};
