import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReminderOverlayProps {
  onConfirm: () => void;
  reminderTime: string;
}

export const ReminderOverlay: React.FC<ReminderOverlayProps> = ({ onConfirm, reminderTime }) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl border border-slate-100"
      >
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
            <ShieldAlert size={40} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 leading-tight">
              服薬確認が必要です
            </h2>
            <p className="text-slate-500 font-bold text-sm">
              {reminderTime} 以降のアプリ起動です。<br />
              お薬の飲み忘れはありませんか？
            </p>
          </div>

          <button 
            onClick={() => setIsChecked(!isChecked)}
            className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-center gap-3 font-black ${
              isChecked 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
            }`}>
              {isChecked && <CheckCircle2 size={16} className="text-white" />}
            </div>
            <span>お薬を飲みました</span>
          </button>

          <button
            disabled={!isChecked}
            onClick={onConfirm}
            className={`w-full py-5 rounded-3xl font-black text-lg shadow-lg transition-all active:scale-95 ${
              isChecked 
                ? 'bg-slate-800 text-white shadow-slate-200' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            アプリをはじめる
          </button>
        </div>
        
        <div className="bg-amber-50 p-4 text-center">
          <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <AlertTriangle size={12} /> 飲み忘れ防止のための強制リマインド機能です
          </p>
        </div>
      </motion.div>
    </div>
  );
};
