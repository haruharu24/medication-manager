import React, { useState } from 'react';
import { ChevronLeft, Check, Store, Hospital } from 'lucide-react';
import { MedicalContacts } from '../../types';

interface MedicalContactsViewProps {
  contacts: MedicalContacts;
  onSave: (contacts: MedicalContacts) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export const MedicalContactsView: React.FC<MedicalContactsViewProps> = ({ contacts, onSave, onClose, readOnly }) => {
  const [form, setForm] = useState<MedicalContacts>(contacts);

  const update = (patch: Partial<MedicalContacts>) => setForm(prev => ({ ...prev, ...patch }));

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="medical-contacts-title" className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-200 dark:border-slate-700 safe-top">
        <button onClick={onClose} aria-label="戻る" className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft size={24} /></button>
        <h2 id="medical-contacts-title" className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">薬局・病院の連絡先</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-md mx-auto space-y-4">
          <fieldset disabled={readOnly} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <legend className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><Store size={18} /></span>
              かかりつけ薬局
            </legend>
            <div>
              <label htmlFor="contact-pharmacy-name" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">薬局名</label>
              <input id="contact-pharmacy-name" type="text" value={form.pharmacyName ?? ''} onChange={e => update({ pharmacyName: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
            <div>
              <label htmlFor="contact-pharmacy-phone" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">電話番号</label>
              <input id="contact-pharmacy-phone" type="tel" value={form.pharmacyPhone ?? ''} onChange={e => update({ pharmacyPhone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
          </fieldset>

          <fieldset disabled={readOnly} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <legend className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600"><Hospital size={18} /></span>
              かかりつけ病院
            </legend>
            <div>
              <label htmlFor="contact-hospital-name" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">病院名</label>
              <input id="contact-hospital-name" type="text" value={form.hospitalName ?? ''} onChange={e => update({ hospitalName: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
            <div>
              <label htmlFor="contact-hospital-phone" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">電話番号</label>
              <input id="contact-hospital-phone" type="tel" value={form.hospitalPhone ?? ''} onChange={e => update({ hospitalPhone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
            <div>
              <label htmlFor="contact-doctor-name" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">担当医</label>
              <input id="contact-doctor-name" type="text" value={form.doctorName ?? ''} onChange={e => update({ doctorName: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
            <div>
              <label htmlFor="contact-next-appointment" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">次回受診予定日</label>
              <input id="contact-next-appointment" type="date" value={form.nextAppointment ?? ''} onChange={e => update({ nextAppointment: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none" />
            </div>
          </fieldset>

          <fieldset disabled={readOnly} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
            <legend className="text-sm font-black text-slate-800 dark:text-slate-100 mb-3">メモ</legend>
            <textarea
              aria-label="メモ"
              value={form.memo ?? ''}
              onChange={e => update({ memo: e.target.value })}
              placeholder="診察券番号、注意事項など..."
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 outline-none resize-none min-h-[80px]"
            />
          </fieldset>
        </div>
      </div>

      {!readOnly && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-6 pb-safe safe-bottom z-50">
          <button
            onClick={handleSave}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Check size={24} strokeWidth={3} /> 保存する
          </button>
        </div>
      )}
    </div>
  );
};
