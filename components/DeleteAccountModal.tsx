import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

const CONFIRM_WORD = '削除';

interface DeleteAccountModalProps {
  onConfirm: (password: string) => Promise<void>;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onConfirm, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = password.length > 0 && confirmText === CONFIRM_WORD;

  const handleSubmit = async () => {
    if (!isValid) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(password);
    } catch (e) {
      // Server includes the blocking households' names on a 409 so the user
      // knows exactly what to fix (transfer ownership) before retrying.
      const households = (e as { data?: { households?: { name: string }[] } })?.data?.households;
      const base = e instanceof Error ? e.message : 'アカウントの削除に失敗しました';
      setError(households?.length ? `${base}(${households.map(h => h.name).join('、')})` : base);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-[32px] p-6 pb-8 safe-bottom max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 id="delete-account-title" className="text-lg font-black text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} /> アカウントを削除
          </h2>
          <button onClick={onClose} aria-label="閉じる" className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed mb-5">
          この操作は取り消せません。アカウントを削除すると、他のメンバーがいない世帯はその世帯のデータごと完全に削除されます(端末内のお薬データは削除されません)。
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="delete-account-password" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">パスワード</label>
            <input
              id="delete-account-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>

          <div>
            <label htmlFor="delete-account-confirm" className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">
              確認のため「{CONFIRM_WORD}」と入力してください
            </label>
            <input
              id="delete-account-confirm"
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 mt-4">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || busy}
          className="w-full mt-6 bg-red-600 text-white py-4 rounded-[20px] font-black text-base shadow-xl active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 size={18} className="animate-spin" />}
          完全に削除する
        </button>
      </div>
    </div>
  );
};
