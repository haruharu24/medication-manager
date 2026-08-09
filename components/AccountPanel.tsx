import React, { useState } from 'react';
import { LogIn, UserPlus, LogOut, Users, Copy, Check, Loader2, RefreshCw, AlertTriangle, Eye, ShieldAlert, Trash2 } from 'lucide-react';
import { StoredAuth } from '../utils/auth';
import { Household, HouseholdMember } from '../utils/household';
import { DeleteAccountModal } from './DeleteAccountModal';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AccountPanelProps {
  auth: StoredAuth | null;
  households: Household[];
  activeHouseholdId: string | null;
  members: HouseholdMember[];
  syncStatus: SyncStatus;
  syncError: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
  onCreateHousehold: (name: string) => Promise<void>;
  onJoinHousehold: (code: string) => Promise<void>;
  onSelectHousehold: (id: string) => void;
  onLeaveHousehold: () => Promise<void>;
  onUpdateMemberRole: (userId: string, role: 'editor' | 'viewer') => Promise<void>;
  onTransferOwnership: (userId: string) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: '',
  syncing: '同期中...',
  synced: '同期済み',
  error: '同期エラー',
};

export const AccountPanel: React.FC<AccountPanelProps> = ({
  auth,
  households,
  activeHouseholdId,
  members,
  syncStatus,
  syncError,
  onLogin,
  onRegister,
  onLogout,
  onCreateHousehold,
  onJoinHousehold,
  onSelectHousehold,
  onLeaveHousehold,
  onUpdateMemberRole,
  onTransferOwnership,
  onDeleteAccount,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const activeHousehold = households.find(h => h.id === activeHouseholdId) || null;

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  if (!auth) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-slate-100">家族と共有</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-500 font-bold">ログインして世帯を作成・参加</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-500'}`}>ログイン</button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-500'}`}>新規登録</button>
        </div>

        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 ring-blue-100 dark:ring-blue-500/20"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="パスワード(8文字以上)"
            className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 ring-blue-100 dark:ring-blue-500/20"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <button
          disabled={busy || !email || !password}
          onClick={() => withBusy(() => (mode === 'login' ? onLogin(email, password) : onRegister(email, password)))}
          aria-label={mode === 'login' ? 'ログインする' : 'アカウントを作成する'}
          className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === 'login' ? 'ログイン' : 'アカウント作成'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{auth.user.email}</p>
            {syncStatus !== 'idle' && (
              <p className={`text-[10px] font-bold flex items-center gap-1 ${syncStatus === 'error' ? 'text-red-600' : 'text-slate-600 dark:text-slate-500'}`}>
                {syncStatus === 'syncing' && <RefreshCw size={10} className="animate-spin" />}
                {SYNC_LABEL[syncStatus]}
              </p>
            )}
          </div>
        </div>
        <button onClick={onLogout} aria-label="ログアウト" className="p-2 text-slate-600 dark:text-slate-500 active:scale-90 transition-transform">
          <LogOut size={18} />
        </button>
      </div>

      {syncError && (
        <div className="flex items-start gap-2 text-red-600">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs font-bold">{syncError}</p>
        </div>
      )}

      {activeHousehold ? (
        <div className="space-y-3 pt-2 border-t border-slate-50 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="font-black text-slate-800 dark:text-slate-100">{activeHousehold.name}</p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(activeHousehold.inviteCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full text-[10px] font-black text-slate-600 dark:text-slate-300"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              招待コード: {activeHousehold.inviteCode}
            </button>
          </div>

          {members.find(m => m.userId === auth.user.id)?.role === 'viewer' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-xl">
              <Eye size={14} className="shrink-0" />
              <p className="text-[10px] font-bold leading-tight">閲覧のみのメンバーです。お薬の追加・編集はできません。</p>
            </div>
          )}

          <div className="space-y-1.5">
            {members.map(m => {
              const isOwner = m.userId === activeHousehold.ownerId;
              const canManage = auth.user.id === activeHousehold.ownerId && !isOwner;
              return (
                <div key={m.userId} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{m.email}</span>
                  {isOwner ? (
                    <span className="text-[9px] font-black text-blue-500 uppercase">オーナー</span>
                  ) : canManage ? (
                    <div className="flex bg-white dark:bg-slate-800 rounded-full p-0.5 border border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => withBusy(() => onUpdateMemberRole(m.userId, 'editor'))}
                        aria-pressed={m.role === 'editor'}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black transition-colors ${m.role === 'editor' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-500'}`}
                      >
                        編集者
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => withBusy(() => onUpdateMemberRole(m.userId, 'viewer'))}
                        aria-pressed={m.role === 'viewer'}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black transition-colors ${m.role === 'viewer' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-500'}`}
                      >
                        閲覧のみ
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[9px] font-black uppercase ${m.role === 'viewer' ? 'text-amber-500' : 'text-slate-600 dark:text-slate-500'}`}>
                      {m.role === 'viewer' ? '閲覧のみ' : '編集者'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {auth.user.id === activeHousehold.ownerId && members.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={12} /> オーナー権限を移譲
              </p>
              <div className="flex gap-2">
                <select
                  aria-label="移譲先のメンバー"
                  value={transferTargetId}
                  onChange={e => setTransferTargetId(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">メンバーを選択...</option>
                  {members.filter(m => m.userId !== activeHousehold.ownerId).map(m => (
                    <option key={m.userId} value={m.userId}>{m.email}</option>
                  ))}
                </select>
                <button
                  disabled={busy || !transferTargetId}
                  onClick={() => {
                    if (!window.confirm('オーナー権限を移譲しますか？あなたは編集者になります。')) return;
                    withBusy(async () => { await onTransferOwnership(transferTargetId); setTransferTargetId(''); });
                  }}
                  className="px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs disabled:opacity-50"
                >
                  移譲
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <button
            disabled={busy}
            onClick={() => withBusy(onLeaveHousehold)}
            className="w-full py-3 text-red-600 font-bold text-xs disabled:opacity-50"
          >
            この世帯から退出する
          </button>
        </div>
      ) : (
        <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-slate-800">
          {households.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">参加中の世帯</p>
              {households.map(h => (
                <button
                  key={h.id}
                  onClick={() => onSelectHousehold(h.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-left"
                >
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{h.name}</span>
                  <span className="text-[10px] font-black text-blue-500">選択する</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">新しい世帯を作る</p>
            <div className="flex gap-2">
              <input
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
                placeholder="例: 田中家"
                className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none"
              />
              <button
                disabled={busy || !householdName}
                onClick={() => withBusy(async () => { await onCreateHousehold(householdName); setHouseholdName(''); })}
                className="px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs disabled:opacity-50"
              >
                作成
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">招待コードで参加</p>
            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="招待コード"
                className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none uppercase"
              />
              <button
                disabled={busy || !inviteCode}
                onClick={() => withBusy(async () => { await onJoinHousehold(inviteCode); setInviteCode(''); })}
                className="px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs disabled:opacity-50"
              >
                参加
              </button>
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>
      )}

      <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
        <button
          onClick={() => setShowDeleteAccount(true)}
          className="w-full py-3 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5"
        >
          <Trash2 size={14} /> アカウントを削除
        </button>
      </div>

      {showDeleteAccount && (
        <DeleteAccountModal
          onConfirm={onDeleteAccount}
          onClose={() => setShowDeleteAccount(false)}
        />
      )}
    </div>
  );
};
