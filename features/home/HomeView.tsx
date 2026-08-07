
import React, { useState } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isToday, addMonths, addWeeks, addDays, subMonths, subWeeks, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Plus, Camera, FileText, Check, Edit3, Save, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { HealthCard } from '../../components/HealthCard';
import { Medication, MedicationLog, DailyCondition, CalendarMode } from '../../types';
import { WEEK_DAYS } from '../../constants';
import { isMedicationTaken, toggleMedicationTaken } from '../../utils/medicationActions';
import { getStockLevel } from '../../utils/stock';
import { getAdherenceSummary } from '../../utils/adherence';

interface HomeViewProps {
  medications: Medication[];
  logs: MedicationLog[];
  setLogs: React.Dispatch<React.SetStateAction<MedicationLog[]>>;
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  conditions: DailyCondition[];
  setConditions: React.Dispatch<React.SetStateAction<DailyCondition[]>>;
  onEditMed: (med: Medication) => void;
  onOpenForm: () => void;
  onOpenScan: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ medications, logs, setLogs, setMedications, conditions, setConditions, onEditMed, onOpenForm, onOpenScan }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  // 初期表示を「月」表示に変更
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const currentCondition = conditions.find(c => c.dateStr === dateStr) || { dateStr, score: 0, memo: '' };
  const lowStockMeds = medications.filter(m => !m.isFolder && getStockLevel(m) !== 'ok');
  const weeklyAdherence = getAdherenceSummary(medications, logs, format(subDays(new Date(), 7), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd'));

  const updateCondition = (updates: Partial<DailyCondition>) => {
    if (!isEditMode) return;
    setConditions(prev => {
      const existing = prev.find(c => c.dateStr === dateStr);
      if (existing) return prev.map(c => c.dateStr === dateStr ? { ...c, ...updates } : c);
      return [...prev, { dateStr, score: 0, memo: '', ...updates }];
    });
  };

  const isCompleted = (medId: string, date: Date) => {
    const dStr = format(date, 'yyyy-MM-dd');
    return isMedicationTaken(logs, medId, dStr);
  };

  const toggleComplete = (medId: string) => {
    if (!isEditMode) return;

    const dStr = format(selectedDate, 'yyyy-MM-dd');
    const result = toggleMedicationTaken(logs, medications, medId, dStr);
    if (!result.changed) return;
    setLogs(result.logs);
    setMedications(result.medications);
  };

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    setDisplayDate(day);
    setIsEditMode(false);
  };

  const navigateCalendar = (direction: 'next' | 'prev') => {
    if (calendarMode === 'month') {
      setDisplayDate(direction === 'next' ? addMonths(displayDate, 1) : subMonths(displayDate, 1));
    } else if (calendarMode === 'week') {
      const nextDate = direction === 'next' ? addWeeks(displayDate, 1) : subWeeks(displayDate, 1);
      setDisplayDate(nextDate);
      setSelectedDate(nextDate);
    } else {
      const nextDate = direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1);
      setSelectedDate(nextDate);
      setDisplayDate(nextDate);
    }
  };

  const renderCalendarContent = () => {
    if (calendarMode === 'day') {
      return (
        <div className="flex justify-center items-center py-5 bg-white">
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900 tracking-tighter">
              {format(selectedDate, 'M月d日(EEE)', { locale: ja })}
            </div>
          </div>
        </div>
      );
    }

    const start = calendarMode === 'week' ? startOfWeek(displayDate) : startOfWeek(startOfMonth(displayDate));
    const end = calendarMode === 'week' ? endOfWeek(displayDate) : endOfWeek(endOfMonth(displayDate));
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-7 text-center gap-y-1 bg-white pb-2">
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className={`text-[10px] font-bold pb-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const currentIsToday = isToday(day);
          const dailyLogs = logs.filter(l => l.dateStr === format(day, 'yyyy-MM-dd'));
          const hasCondition = conditions.some(c => c.dateStr === format(day, 'yyyy-MM-dd') && c.score > 0);
          
          return (
            <button 
              key={idx} 
              onClick={() => handleDateSelect(day)} 
              className={`flex flex-col items-center py-1.5 rounded-xl transition-all relative
                ${currentIsToday ? 'bg-blue-600 shadow-sm' : 'hover:bg-slate-50'}
                ${isSelected ? 'ring-2 ring-slate-800 ring-offset-1 z-10 scale-105' : ''}
              `}
            >
              <span className={`text-xs font-black 
                ${currentIsToday ? 'text-white' : 'text-slate-700'}
              `}>
                {format(day, 'd')}
              </span>
              <div className="flex gap-0.5 mt-0.5 h-1">
                {dailyLogs.length > 0 && <div className={`w-1 h-1 rounded-full ${currentIsToday ? 'bg-white' : 'bg-blue-400'}`}></div>}
                {hasCondition && <div className={`w-1 h-1 rounded-full ${currentIsToday ? 'bg-white' : 'bg-orange-400'}`}></div>}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 最小化されたヘッダー */}
      <div className="bg-slate-50 py-1.5 safe-top border-b border-slate-200 relative shrink-0">
        <h1 className="text-center font-bold text-slate-800 text-[10px]">MediMate</h1>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <button onClick={() => setShowAddMenu(!showAddMenu)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-full font-bold text-[10px] shadow-lg flex items-center gap-1 active:scale-95 transition-transform">
            <Plus size={10} /> 追加
          </button>
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2">
              <button onClick={() => { onOpenForm(); setShowAddMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left text-sm font-bold text-slate-700">
                <FileText size={18} className="text-emerald-500" /> 手動入力
              </button>
              <button onClick={() => { onOpenScan(); setShowAddMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left text-sm font-bold text-slate-700">
                <Camera size={18} className="text-blue-500" /> 手帳スキャン
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ナビゲーションとカレンダー */}
      <div className="bg-white px-4 pt-2 border-b border-slate-100 shrink-0 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <button onClick={() => navigateCalendar('prev')} className="p-1 text-slate-400 active:text-slate-800 active:scale-90 transition-all"><ChevronLeft size={20} /></button>
            <h2 className="text-sm font-black text-slate-800 w-24 text-center">{format(displayDate, 'yyyy年 M月', { locale: ja })}</h2>
            <button onClick={() => navigateCalendar('next')} className="p-1 text-slate-400 active:text-slate-800 active:scale-90 transition-all"><ChevronRight size={20} /></button>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['month', 'week', 'day'] as CalendarMode[]).map((m) => (
              <button 
                key={m} 
                onClick={() => setCalendarMode(m)} 
                className={`px-3 py-0.5 text-[9px] font-bold rounded-md transition-all ${calendarMode === m ? 'bg-white shadow-sm text-blue-700' : 'text-slate-400'}`}
              >
                {m === 'month' ? '月' : m === 'week' ? '週' : '日'}
              </button>
            ))}
          </div>
        </div>
        {renderCalendarContent()}
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3 no-scrollbar">
        {/* 在庫アラート */}
        {lowStockMeds.length > 0 && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle size={14} />
              <h3 className="text-[11px] font-black">在庫が少ないお薬があります</h3>
            </div>
            <div className="space-y-1">
              {lowStockMeds.map(med => (
                <button
                  key={med.id}
                  onClick={() => onEditMed(med)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg active:bg-amber-100 transition-colors ${getStockLevel(med) === 'empty' ? 'text-red-600' : 'text-amber-700'}`}
                >
                  <span className="text-xs font-bold">{med.title}</span>
                  <span className="text-[10px] font-black">{getStockLevel(med) === 'empty' ? '在庫切れ' : `残り${med.stock}${med.unit}`}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 操作ボタンエリア */}
        <div className="flex justify-end mb-3 px-1">
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-[10px] transition-all active:scale-95 shadow-sm ${
              isEditMode 
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-blue-600 border border-blue-100'
            }`}
          >
            {isEditMode ? (
              <><Save size={12} strokeWidth={3} /> 保存</>
            ) : (
              <><Edit3 size={12} strokeWidth={3} /> この日を編集</>
            )}
          </button>
        </div>

        {/* 1. 服薬タスク（最優先） */}
        <div className="mb-2 px-1 border-l-4 border-emerald-500 pl-2 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800">今日の服薬</h3>
          {weeklyAdherence.totalScheduled > 0 && (
            <span className={`text-[10px] font-black ${weeklyAdherence.overallRate < 80 ? 'text-red-500' : 'text-slate-400'}`}>
              直近7日の達成率 {weeklyAdherence.overallRate}%
              {weeklyAdherence.totalMissed > 0 && `(飲み忘れ${weeklyAdherence.totalMissed}回)`}
            </span>
          )}
        </div>

        <div className="space-y-1.5 mb-5">
          {medications.filter(m => !m.isFolder).length === 0 ? (
            <div className="py-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400">お薬未登録</p>
            </div>
          ) : (
            medications.filter(m => !m.isFolder).map(med => (
              <div 
                key={med.id} 
                className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all duration-300 ${
                  isEditMode ? 'bg-white border-blue-50 shadow-md ring-1 ring-blue-50' : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <button 
                  onClick={() => toggleComplete(med.id)} 
                  disabled={!isEditMode}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isCompleted(med.id, selectedDate) 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : isEditMode 
                        ? 'bg-slate-50 text-slate-200 border border-slate-100' 
                        : 'bg-slate-50 text-slate-100 border border-slate-50'
                  }`}
                >
                  <Check size={20} strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0" onClick={() => !isEditMode && onEditMed(med)}>
                  <h4 className={`font-black text-sm tracking-tight truncate ${isCompleted(med.id, selectedDate) ? 'text-slate-300 line-through' : 'text-slate-800'}`}>
                    {med.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1 py-0.5 rounded leading-none">
                      {med.label}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 leading-none">
                      {med.dosage}{med.unit}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. 体調の記録 */}
        <div className="mb-2 px-1 border-l-4 border-blue-500 pl-2">
          <h3 className="text-xs font-black text-slate-800">体調の記録</h3>
        </div>
        
        <HealthCard 
          condition={currentCondition} 
          onUpdate={updateCondition} 
          selectedDate={selectedDate} 
          isEditMode={isEditMode}
        />
      </div>
    </div>
  );
};
