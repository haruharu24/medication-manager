import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Trash2, Activity, Weight, Thermometer, Droplet } from 'lucide-react';
import { format } from 'date-fns';
import { VitalRecord, VitalType } from '../../types';
import { TrendChart } from '../../components/TrendChart';
import { VitalRecordForm } from './VitalRecordForm';
import { VITAL_TYPES, VITAL_TYPE_LABELS, VITAL_TYPE_UNITS, groupVitalsByType, buildVitalSeries, formatVitalValue } from '../../utils/vitalsChart';

interface VitalsViewProps {
  vitals: VitalRecord[];
  onSave: (record: VitalRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const TYPE_ICON_CLASSES: Record<VitalType, { icon: React.ReactNode; iconClassName: string }> = {
  bloodPressure: { icon: <Activity size={18} />, iconClassName: 'bg-red-50 dark:bg-red-500/10 text-red-600' },
  weight: { icon: <Weight size={18} />, iconClassName: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
  temperature: { icon: <Thermometer size={18} />, iconClassName: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' },
  bloodSugar: { icon: <Droplet size={18} />, iconClassName: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' },
};

export const VitalsView: React.FC<VitalsViewProps> = ({ vitals, onSave, onDelete, onClose, readOnly }) => {
  const [showForm, setShowForm] = useState(false);

  const byType = useMemo(() => groupVitalsByType(vitals), [vitals]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="vitals-view-title" className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-200 dark:border-slate-700 safe-top">
        <button onClick={onClose} aria-label="戻る" className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft size={24} /></button>
        <h2 id="vitals-view-title" className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">バイタル記録</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-md mx-auto space-y-6">
          {vitals.length === 0 && (
            <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-500 py-20">まだ記録がありません</p>
          )}

          {VITAL_TYPES.filter(t => byType[t].length > 0).map(type => (
            <section key={type} className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${TYPE_ICON_CLASSES[type].iconClassName}`}>{TYPE_ICON_CLASSES[type].icon}</span>
                {VITAL_TYPE_LABELS[type]}
              </h3>
              <TrendChart series={buildVitalSeries(type, byType[type])} />
              <div className="space-y-2">
                {byType[type].slice().reverse().map(record => (
                  <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{formatVitalValue(record)} <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500">{VITAL_TYPE_UNITS[type]}</span></p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">{format(new Date(record.timestamp), 'yyyy/MM/dd')}{record.memo ? ` ・ ${record.memo}` : ''}</p>
                    </div>
                    {!readOnly && (
                      <button onClick={() => onDelete(record.id)} aria-label="この記録を削除" className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-6 pb-safe safe-bottom z-50">
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Plus size={24} strokeWidth={3} /> 記録を追加
          </button>
        </div>
      )}

      {showForm && (
        <VitalRecordForm
          onSave={(record) => { onSave(record); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
