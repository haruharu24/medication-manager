
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Pill, History, Plus, Camera, FileText, Edit2, ChevronDown, Package, FolderOpen, AlertTriangle, FolderPlus } from 'lucide-react';
import { Medication, GlobalActionLog } from '../../types';
import { getStockLevel } from '../../utils/stock';

const StockBadge: React.FC<{ med: Medication }> = ({ med }) => {
  const level = getStockLevel(med);
  if (level === 'ok') {
    return <p className="text-[10px] text-slate-600 dark:text-slate-500 font-bold uppercase">{med.dosage}{med.unit} / 在庫: {med.stock}</p>;
  }
  return (
    <p className={`text-[10px] font-black uppercase flex items-center gap-1 ${level === 'empty' ? 'text-red-600' : 'text-amber-500'}`}>
      <AlertTriangle size={11} />
      {med.dosage}{med.unit} / 在庫: {med.stock} {level === 'empty' ? '(在庫切れ)' : '(残りわずか)'}
    </p>
  );
};

interface MedicationListViewProps {
  medications: Medication[];
  globalLogs: GlobalActionLog[];
  onEditMed: (med: Medication) => void;
  onOpenForm: () => void;
  onOpenScan: () => void;
  onOpenGroupForm: () => void;
}

export const MedicationListView: React.FC<MedicationListViewProps> = ({
  medications,
  globalLogs,
  onEditMed,
  onOpenForm,
  onOpenScan,
  onOpenGroupForm
}) => {
  const [tab, setTab] = useState<'list' | 'history'>('list');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const folders = medications.filter(m => m.isFolder);
  const orphanMeds = medications.filter(m => !m.isFolder && !m.parentId);

  const toggleFolder = (id: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedFolders(newSet);
  };

  const renderMedItem = (med: Medication) => (
    <div 
      key={med.id} 
      onClick={(e) => { e.stopPropagation(); onEditMed(med); }} 
      className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center mb-2 last:mb-0 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
          <Pill size={16} className="text-slate-600 dark:text-slate-500" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{med.title}</h3>
          <StockBadge med={med} />
        </div>
      </div>
      <Edit2 size={14} className="text-slate-300 dark:text-slate-600" />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="bg-slate-50 dark:bg-slate-900 py-3 safe-top border-b border-slate-200 dark:border-slate-700 relative">
        <h1 className="text-center font-bold text-slate-800 dark:text-slate-100">お薬ボックス</h1>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <button onClick={() => setShowAddMenu(!showAddMenu)} className="bg-emerald-700 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-1">
            <Plus size={14} /> 追加
          </button>
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-[100] animate-in fade-in slide-in-from-top-2">
              <button onClick={() => { onOpenForm(); setShowAddMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                <FileText size={18} className="text-emerald-500" /> 手動入力
              </button>
              <button onClick={() => { onOpenScan(); setShowAddMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                <Camera size={18} className="text-blue-500" /> 手帳スキャン
              </button>
              <button onClick={() => { onOpenGroupForm(); setShowAddMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-sm font-bold text-slate-700 dark:text-slate-200">
                <FolderPlus size={18} className="text-amber-500" /> グループを作成
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-center">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-full max-w-xs">
          <button 
            onClick={() => setTab('list')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${tab === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-700' : 'text-slate-600 dark:text-slate-500'}`}
          >
            <Pill size={16}/> リスト
          </button>
          <button 
            onClick={() => setTab('history')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${tab === 'history' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-700' : 'text-slate-600 dark:text-slate-500'}`}
          >
            <History size={16}/> 履歴
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {tab === 'list' ? (
          <div className="p-4 space-y-6">
            {folders.map(folder => {
              const isExpanded = expandedFolders.has(folder.id);
              const children = medications.filter(m => m.parentId === folder.id);
              return (
                <div key={folder.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-700"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        {folder.folderType === 'one-pack' ? <Package size={20} /> : <FolderOpen size={20} />}
                      </div>
                      <div>
                        <h2 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">{folder.title}</h2>
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">{children.length} 項目</p>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-slate-300 dark:text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-50 dark:border-slate-800 pt-2 bg-slate-50/30 dark:bg-slate-900/30">
                      {children.map(renderMedItem)}
                    </div>
                  )}
                </div>
              );
            })}
            
            {orphanMeds.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest px-2">個別のお薬</h3>
                {orphanMeds.map(med => (
                  <div 
                    key={med.id} 
                    onClick={() => onEditMed(med)} 
                    className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm active:scale-98 transition-transform"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                        <Pill size={20} className="text-slate-600 dark:text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">{med.title}</h3>
                        <StockBadge med={med} />
                      </div>
                    </div>
                    <Edit2 size={16} className="text-slate-300 dark:text-slate-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {globalLogs.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <History size={40} className="mx-auto text-slate-200 dark:text-slate-700" />
                <p className="text-slate-600 dark:text-slate-500 font-bold text-sm">履歴はありません</p>
              </div>
            ) : (
              globalLogs.map(log => (
                <div key={log.id} className="bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    log.type === 'add' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 
                    log.type === 'update' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' : 
                    'bg-red-50 dark:bg-red-500/10 text-red-600'
                  }`}>
                    {log.type === 'add' ? <Plus size={20}/> : <Edit2 size={18}/>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{log.title}</h4>
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {format(log.timestamp, 'MM/dd HH:mm', { locale: ja })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{log.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
