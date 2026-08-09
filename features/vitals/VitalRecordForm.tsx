import React, { useState } from 'react';
import { X, Activity, Weight, Thermometer, Droplet } from 'lucide-react';
import { VitalRecord, VitalType } from '../../types';
import { format } from 'date-fns';

interface VitalRecordFormProps {
  onSave: (record: VitalRecord) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { type: VitalType; label: string; icon: React.ReactNode; className: string }[] = [
  { type: 'bloodPressure', label: '血圧', icon: <Activity size={20} />, className: 'bg-red-50 dark:bg-red-500/10 text-red-600' },
  { type: 'weight', label: '体重', icon: <Weight size={20} />, className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
  { type: 'temperature', label: '体温', icon: <Thermometer size={20} />, className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700' },
  { type: 'bloodSugar', label: '血糖値', icon: <Droplet size={20} />, className: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' },
];

const SELECTED_CLASSES: Record<VitalType, string> = {
  bloodPressure: 'bg-red-600 text-white',
  weight: 'bg-blue-600 text-white',
  temperature: 'bg-amber-600 text-white',
  bloodSugar: 'bg-purple-600 text-white',
};

export const VitalRecordForm: React.FC<VitalRecordFormProps> = ({ onSave, onCancel }) => {
  const [type, setType] = useState<VitalType>('bloodPressure');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [value, setValue] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [memo, setMemo] = useState('');

  const isValid = type === 'bloodPressure'
    ? systolic.trim() !== '' && diastolic.trim() !== ''
    : value.trim() !== '';

  const handleSave = () => {
    if (!isValid) return;
    const timestamp = Date.now();
    const base = { id: crypto.randomUUID(), timestamp, dateStr, memo: memo.trim() || undefined };
    let record: VitalRecord;
    if (type === 'bloodPressure') {
      record = {
        ...base,
        type: 'bloodPressure',
        systolic: parseFloat(systolic),
        diastolic: parseFloat(diastolic),
        pulse: pulse.trim() ? parseFloat(pulse) : undefined,
      };
    } else {
      record = { ...base, type, value: parseFloat(value) } as VitalRecord;
    }
    onSave(record);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="vital-form-title" className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-[32px] p-6 pb-8 safe-bottom max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 id="vital-form-title" className="text-lg font-black text-slate-800 dark:text-slate-100">バイタルを記録</h2>
          <button onClick={onCancel} aria-label="閉じる" className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.type}
              type="button"
              onClick={() => setType(opt.type)}
              aria-pressed={type === opt.type}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl font-bold text-[11px] transition-all ${type === opt.type ? SELECTED_CLASSES[opt.type] : opt.className}`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {type === 'bloodPressure' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="vital-systolic" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">最高(上)</label>
                <input id="vital-systolic" type="number" value={systolic} onChange={e => setSystolic(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
              </div>
              <div>
                <label htmlFor="vital-diastolic" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">最低(下)</label>
                <input id="vital-diastolic" type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
              </div>
              <div>
                <label htmlFor="vital-pulse" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">脈拍</label>
                <input id="vital-pulse" type="number" value={pulse} onChange={e => setPulse(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="vital-value" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">
                {type === 'weight' ? '体重(kg)' : type === 'temperature' ? '体温(℃)' : '血糖値(mg/dL)'}
              </label>
              <input id="vital-value" type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
          )}

          <div>
            <label htmlFor="vital-date" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">記録日</label>
            <input id="vital-date" type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
          </div>

          <div>
            <label htmlFor="vital-memo" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">メモ</label>
            <input id="vital-memo" type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="特記事項があれば..." className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 outline-none" />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-[20px] font-black text-base shadow-xl active:scale-95 transition-transform disabled:opacity-40"
        >
          記録する
        </button>
      </div>
    </div>
  );
};
