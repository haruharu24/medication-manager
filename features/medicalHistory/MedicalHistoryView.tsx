import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Trash2, Pencil, Syringe, History as HistoryIcon } from 'lucide-react';
import { MedicalRecord } from '../../types';
import { MedicalRecordForm } from './MedicalRecordForm';

interface MedicalHistoryViewProps {
  records: MedicalRecord[];
  onSave: (record: MedicalRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const SEVERITY_LABEL: Record<string, string> = { mild: '軽度', moderate: '中等度', severe: '重度' };

export const MedicalHistoryView: React.FC<MedicalHistoryViewProps> = ({ records, onSave, onDelete, onClose, readOnly }) => {
  const [formState, setFormState] = useState<{ mode: 'closed' } | { mode: 'add'; type: 'allergy' | 'history' } | { mode: 'edit'; record: MedicalRecord }>({ mode: 'closed' });

  const allergies = useMemo(() => records.filter(r => r.type === 'allergy').sort((a, b) => b.createdAt - a.createdAt), [records]);
  const history = useMemo(() => records.filter(r => r.type === 'history').sort((a, b) => b.createdAt - a.createdAt), [records]);

  const renderList = (list: MedicalRecord[], emptyText: string) => (
    list.length === 0 ? (
      <p className="text-sm font-bold text-slate-500 dark:text-slate-500 py-6 text-center">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {list.map(record => (
          <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{record.title}</p>
                  {record.severity && (
                    <span className="text-[10px] font-black text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded-full uppercase tracking-widest">{SEVERITY_LABEL[record.severity]}</span>
                  )}
                </div>
                {record.diagnosedDate && <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold mt-0.5">{record.diagnosedDate}</p>}
                {record.detail && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{record.detail}</p>}
              </div>
              {!readOnly && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setFormState({ mode: 'edit', record })} aria-label={`${record.title}を編集`} className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => onDelete(record.id)} aria-label={`${record.title}を削除`} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="medical-history-title" className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-200 dark:border-slate-700 safe-top">
        <button onClick={onClose} aria-label="戻る" className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft size={24} /></button>
        <h2 id="medical-history-title" className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">アレルギー・既往歴</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-md mx-auto space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-500/10 text-red-600"><Syringe size={18} /></span>
                アレルギー
              </h3>
              {!readOnly && (
                <button onClick={() => setFormState({ mode: 'add', type: 'allergy' })} aria-label="アレルギーを追加" className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors">
                  <Plus size={18} />
                </button>
              )}
            </div>
            {renderList(allergies, 'アレルギーの記録はありません')}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600"><HistoryIcon size={18} /></span>
                既往歴
              </h3>
              {!readOnly && (
                <button onClick={() => setFormState({ mode: 'add', type: 'history' })} aria-label="既往歴を追加" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-colors">
                  <Plus size={18} />
                </button>
              )}
            </div>
            {renderList(history, '既往歴の記録はありません')}
          </section>
        </div>
      </div>

      {formState.mode !== 'closed' && (
        <MedicalRecordForm
          initialData={formState.mode === 'edit' ? formState.record : undefined}
          defaultType={formState.mode === 'add' ? formState.type : 'allergy'}
          onSave={(record) => { onSave(record); setFormState({ mode: 'closed' }); }}
          onCancel={() => setFormState({ mode: 'closed' })}
        />
      )}
    </div>
  );
};
