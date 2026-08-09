import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MedicalRecord, MedicalRecordType } from '../../types';

interface MedicalRecordFormProps {
  initialData?: MedicalRecord;
  defaultType: MedicalRecordType;
  onSave: (record: MedicalRecord) => void;
  onCancel: () => void;
}

const SEVERITY_OPTIONS: { value: MedicalRecord['severity']; label: string }[] = [
  { value: undefined, label: '未設定' },
  { value: 'mild', label: '軽度' },
  { value: 'moderate', label: '中等度' },
  { value: 'severe', label: '重度' },
];

export const MedicalRecordForm: React.FC<MedicalRecordFormProps> = ({ initialData, defaultType, onSave, onCancel }) => {
  const [type, setType] = useState<MedicalRecordType>(initialData?.type ?? defaultType);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [detail, setDetail] = useState(initialData?.detail ?? '');
  const [diagnosedDate, setDiagnosedDate] = useState(initialData?.diagnosedDate ?? '');
  const [severity, setSeverity] = useState<MedicalRecord['severity']>(initialData?.severity);

  const isValid = title.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    const record: MedicalRecord = {
      id: initialData?.id ?? crypto.randomUUID(),
      type,
      title: title.trim(),
      detail: detail.trim() || undefined,
      diagnosedDate: diagnosedDate || undefined,
      severity: type === 'allergy' ? severity : undefined,
      createdAt: initialData?.createdAt ?? Date.now(),
    };
    onSave(record);
  };

  const titleId = 'medical-record-form-title';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-[32px] p-6 pb-8 safe-bottom max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-lg font-black text-slate-800 dark:text-slate-100">{initialData ? '記録を編集' : '記録を追加'}</h2>
          <button onClick={onCancel} aria-label="閉じる" className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setType('allergy')}
            aria-pressed={type === 'allergy'}
            className={`py-3 rounded-2xl font-bold text-sm transition-all ${type === 'allergy' ? 'bg-red-600 text-white' : 'bg-red-50 dark:bg-red-500/10 text-red-700'}`}
          >
            アレルギー
          </button>
          <button
            type="button"
            onClick={() => setType('history')}
            aria-pressed={type === 'history'}
            className={`py-3 rounded-2xl font-bold text-sm transition-all ${type === 'history' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700'}`}
          >
            既往歴
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="medical-record-title" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">
              {type === 'allergy' ? 'アレルギーの原因' : '病名・症状'}
            </label>
            <input
              id="medical-record-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'allergy' ? '例: ペニシリン' : '例: 高血圧'}
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>

          {type === 'allergy' && (
            <div>
              <p className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">重症度</p>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    aria-pressed={severity === opt.value}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${severity === opt.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="medical-record-date" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">
              {type === 'allergy' ? '判明日' : '診断日'}
            </label>
            <input
              id="medical-record-date"
              type="date"
              value={diagnosedDate}
              onChange={e => setDiagnosedDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>

          <div>
            <label htmlFor="medical-record-detail" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">詳細・症状</label>
            <textarea
              id="medical-record-detail"
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="特記事項があれば..."
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 outline-none resize-none min-h-[70px]"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-[20px] font-black text-base shadow-xl active:scale-95 transition-transform disabled:opacity-40"
        >
          保存する
        </button>
      </div>
    </div>
  );
};
