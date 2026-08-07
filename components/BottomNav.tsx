import React from 'react';
import { Home, Pill, Settings } from 'lucide-react';
import { ViewMode } from '../types';

interface BottomNavProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
  const navItemClass = (isActive: boolean) => 
    `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-gray-500 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`;

  return (
    <nav aria-label="メインナビゲーション" className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around items-center z-50 max-w-md mx-auto pb-safe">
      <button className={navItemClass(currentView === 'home')} onClick={() => onChange('home')}>
        <Home size={24} />
        <span className="text-xs font-medium">ホーム</span>
      </button>
      <button className={navItemClass(currentView === 'meds')} onClick={() => onChange('meds')}>
        <Pill size={24} />
        <span className="text-xs font-medium">お薬</span>
      </button>
      <button className={navItemClass(currentView === 'settings')} onClick={() => onChange('settings')}>
        <Settings size={24} />
        <span className="text-xs font-medium">設定</span>
      </button>
    </nav>
  );
};