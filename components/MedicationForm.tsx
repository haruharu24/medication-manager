
import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronLeft, Trash2, Pill, Clock, X, ChevronDown, History, Calendar as CalendarIcon, Package, FolderOpen } from 'lucide-react';
import { Medication, UnitType, LabelType } from '../types';
import { UNITS, LABELS } from '../constants';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MedicationFormProps {
  initialData?: Medication;
  onSave: (med: Medication) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  visibleUnits: string[];
  visibleLabels: string[];
  // Existing folders a regular (non-folder) medication can be assigned into.
  availableGroups?: Medication[];
  // True when initialData describes a not-yet-saved item (so the header shouldn't say "編集").
  isNew?: boolean;
}

// Options
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DOSAGE_OPTIONS = [0.1, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10];
const STOCK_OPTIONS = [0, 5, 7, 10, 14, 21, 28, 30, 60, 90, 100];
const LOW_STOCK_THRESHOLD_OPTIONS = [1, 2, 3, 5, 7, 10, 14];
const FOLDER_TYPE_OPTIONS: { value: 'multi-dose' | 'one-pack'; label: string }[] = [
  { value: 'multi-dose', label: '服用グループ' },
  { value: 'one-pack', label: '一包化' },
];

const ScrollWheel: React.FC<{ 
  items: number[]; 
  value: number; 
  onChange: (val: number) => void;
  format?: (val: number) => string;
}> = ({ items, value, onChange, format }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightListRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 40;
  const CONTAINER_HEIGHT = 160;
  const PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  useEffect(() => {
    if (containerRef.current) {
      const index = items.indexOf(value);
      if (index !== -1) containerRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, []);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      if (highlightListRef.current) highlightListRef.current.style.transform = `translateY(-${scrollTop}px)`;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      if (items[index] !== undefined && items[index] !== value) onChange(items[index]);
    }
  };

  return (
    <div className="relative h-[160px] w-20 overflow-hidden select-none">
      <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory" style={{ paddingTop: PADDING, paddingBottom: PADDING }}>
        {items.map((item) => <div key={item} className="h-[40px] flex items-center justify-center snap-center text-xl font-medium text-slate-500 dark:text-slate-600">{format ? format(item) : item}</div>)}
      </div>
      <div className="absolute left-0 right-0 pointer-events-none overflow-hidden" style={{ top: PADDING, height: ITEM_HEIGHT }}>
        <div ref={highlightListRef} className="w-full">
           {items.map((item) => <div key={item} className="h-[40px] flex items-center justify-center text-xl font-bold text-slate-900 dark:text-white">{format ? format(item) : item}</div>)}
        </div>
      </div>
    </div>
  );
};

export const MedicationForm: React.FC<MedicationFormProps> = ({ initialData, onSave, onCancel, onDelete, visibleUnits, visibleLabels, availableGroups = [], isNew }) => {
  const isFolder = initialData?.isFolder;
  const [title, setTitle] = useState(initialData?.title || '');
  const [dosage, setDosage] = useState(initialData?.dosage?.toString() || '1');
  const [unit, setUnit] = useState<UnitType>(initialData?.unit || '錠');
  const [label, setLabel] = useState<LabelType>(initialData?.label || '朝食後');
  const [stock, setStock] = useState(initialData?.stock?.toString() || '0');
  const [lowStockThreshold, setLowStockThreshold] = useState((initialData?.lowStockThreshold ?? 3).toString());
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [notificationTime, setNotificationTime] = useState(initialData?.notificationTime || '');
  const [startDateStr, setStartDateStr] = useState(format(initialData?.startDate || Date.now(), 'yyyy-MM-dd'));
  const [folderType, setFolderType] = useState<'multi-dose' | 'one-pack'>(initialData?.folderType || 'multi-dose');
  const [parentId, setParentId] = useState(initialData?.parentId || '');

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [hour, setHour] = useState(notificationTime ? parseInt(notificationTime.split(':')[0]) : 8);
  const [minute, setMinute] = useState(notificationTime ? parseInt(notificationTime.split(':')[1]) : 0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    // Fix: Removed 'history' property because it doesn't exist on the Medication type.
    // Global history is handled in the App.tsx component via handleSaveMed.
    onSave({
      ...initialData,
      id: initialData?.id || crypto.randomUUID(),
      title,
      dosage: parseFloat(dosage) || 0,
      unit,
      label,
      stock: parseInt(stock) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 3,
      memo,
      notificationTime: notificationTime || undefined,
      color: 'emerald',
      startDate: new Date(startDateStr).getTime(),
      isFolder: !!isFolder,
      folderType: isFolder ? folderType : undefined,
      parentId: !isFolder && parentId ? parentId : undefined
    } as Medication);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="medication-form-title" className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-200 dark:border-slate-700 safe-top">
        <button onClick={onCancel} aria-label="戻る" className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft size={24} /></button>
        <div className="flex flex-col items-center">
          <h2 id="medication-form-title" className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">{isFolder ? (isNew ? 'グループを作成' : 'グループの編集') : (isNew ? 'お薬を追加' : 'お薬の編集')}</h2>
          {isFolder && <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase">{initialData?.folderType === 'one-pack' ? '一包化' : '服用グループ'}</span>}
        </div>
        <div className="w-10"></div> 
      </div>

      {/* pb-48 needs to win over .safe-bottom's own padding-bottom (both set that
          property; .safe-bottom's CSS happens to cascade after utilities), so the
          two clearances are combined into one declaration instead of two classes. */}
      <div className="flex-1 overflow-y-auto p-4 pb-[calc(12rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto space-y-4">
          
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label htmlFor="med-title" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">名前</label>
            <div className="flex items-center gap-3">
              {isFolder ? (
                initialData?.folderType === 'one-pack' ? <Package className="text-emerald-500" size={24}/> : <FolderOpen className="text-emerald-500" size={24}/>
              ) : <Pill className="text-emerald-500" size={24}/>}
              <input id="med-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="名称を入力..." className="flex-1 bg-transparent text-xl font-black text-slate-800 dark:text-slate-100 outline-none" />
            </div>
          </div>

          {isFolder && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-3">グループの種類</label>
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                {FOLDER_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFolderType(opt.value)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${folderType === opt.value ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-500'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isFolder && (
            <>
              {availableGroups.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                  <label htmlFor="med-parent-group" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">グループ</label>
                  <select id="med-parent-group" value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none">
                    <option value="">なし</option>
                    {availableGroups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
                </div>
              )}

              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                <label htmlFor="med-start-date" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">開始日（処方日）</label>
                <div className="flex items-center gap-3">
                  <CalendarIcon size={18} className="text-slate-500 dark:text-slate-500" />
                  <input id="med-start-date" type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} className="bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none flex-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                  <label htmlFor="med-dosage" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">1回の量</label>
                  <select id="med-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none">
                    {DOSAGE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                  <label htmlFor="med-unit" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">単位</label>
                  <select id="med-unit" value={unit} onChange={(e) => setUnit(e.target.value as any)} className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                <label htmlFor="med-label" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">タイミング</label>
                <select id="med-label" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none">
                  {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                  <label htmlFor="med-stock" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">在庫</label>
                  <select id="med-stock" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none">
                    {STOCK_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                  <label id="med-notification-label" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">通知</label>
                  <button type="button" onClick={() => setIsTimePickerOpen(true)} aria-labelledby="med-notification-label" className="w-full text-left text-lg font-bold text-slate-800 dark:text-slate-100">{notificationTime || '--:--'}</button>
                  <Clock size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
                <label htmlFor="med-low-stock-threshold" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">在庫アラート(残り何回で警告)</label>
                <select id="med-low-stock-threshold" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-slate-100 outline-none appearance-none">
                  {LOW_STOCK_THRESHOLD_OPTIONS.map(t => <option key={t} value={t}>残り{t}回分</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 bottom-6 text-slate-500 dark:text-slate-500" />
              </div>
            </>
          )}

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label htmlFor="med-memo" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">メモ</label>
            <textarea id="med-memo" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="特記事項があれば..." className="w-full bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none resize-none" />
          </div>

          {onDelete && (
            <button type="button" onClick={() => setShowDeleteModal(true)} className="w-full py-5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-3xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2">
              <Trash2 size={20} /> この情報を削除
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-6 pb-safe safe-bottom z-50">
        <button onClick={handleSubmit} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
          <Check size={24} strokeWidth={3} /> 変更を保存
        </button>
      </div>

      {isTimePickerOpen && (
        <div role="dialog" aria-modal="true" aria-label="通知時刻を選択" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTimePickerOpen(false)}></div>
          <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-[320px] relative z-10 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 flex justify-center items-center gap-4 relative">
              <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl -z-10"></div>
              <ScrollWheel items={HOURS} value={hour} onChange={setHour} format={(val) => val.toString().padStart(2, '0')} />
              <span className="text-2xl font-black text-slate-500 dark:text-slate-600 pb-1">:</span>
              <ScrollWheel items={MINUTES} value={minute} onChange={setMinute} format={(val) => val.toString().padStart(2, '0')} />
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex gap-3">
              <button onClick={() => { setNotificationTime(''); setIsTimePickerOpen(false); }} className="flex-1 py-4 text-red-600 font-bold text-sm">解除</button>
              <button onClick={() => { setNotificationTime(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`); setIsTimePickerOpen(false); }} className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold">設定</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title" className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 w-full max-w-sm relative z-10 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-500/15 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trash2 size={40}/></div>
            <h3 id="delete-confirm-title" className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">削除しますか？</h3>
            <p className="text-sm text-slate-500 dark:text-slate-500 font-medium mb-8 leading-relaxed">この操作は取り消せません。{isFolder && "グループ内のお薬もすべて削除されます。"}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl font-bold">戻る</button>
              <button onClick={() => { onDelete?.(initialData!.id); setShowDeleteModal(false); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
