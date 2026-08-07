
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { BottomNav } from './components/BottomNav';
import { MedicationForm } from './components/MedicationForm';
import { CameraModal } from './components/CameraModal';
import { QuickLogSheet } from './components/QuickLogSheet';
import { InteractionCheckModal } from './components/InteractionCheckModal';
import { AccountPanel } from './components/AccountPanel';
import { Medication, MedicationLog, ViewMode, DailyCondition, GlobalActionLog, ReportConfig, ReminderSettings } from './types';
import { UNITS, LABELS } from './constants';
import { HomeView } from './features/home/HomeView';
import { MedicationListView } from './features/meds/MedicationListView';
import { ReportSetupView } from './features/report/ReportSetupView';
import { ReportPreviewView } from './features/report/ReportPreviewView';
import { ReminderOverlay } from './components/ReminderOverlay';
import { Loader2, RotateCcw, ChevronRight, FileDown, Bell, Clock, AlertTriangle, Download, Upload, ShieldAlert, Moon, Sun } from 'lucide-react';
// Fix: Import GoogleGenAI and Type for AI-powered scanning
import { GoogleGenAI, Type } from "@google/genai";
import { markMedicationTaken } from './utils/medicationActions';
import { drainPendingActions, PendingAction } from './utils/pendingActionsDb';
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush } from './utils/push';
import { buildBackup, downloadBackup, parseBackupFile } from './utils/backup';
import { Theme, getStoredTheme, applyTheme } from './utils/theme';
import { StoredAuth, getStoredAuth, clearStoredAuth, login as apiLogin, register as apiRegister } from './utils/auth';
import {
  Household,
  HouseholdMember,
  fetchMe,
  createHousehold as apiCreateHousehold,
  joinHousehold as apiJoinHousehold,
  leaveHousehold as apiLeaveHousehold,
  fetchMembers,
  fetchHouseholdData,
  pushHouseholdData,
  connectHouseholdSocket,
} from './utils/household';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('home');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [globalLogs, setGlobalLogs] = useState<GlobalActionLog[]>([]);
  const [conditions, setConditions] = useState<DailyCondition[]>([]);
  
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: false,
    time: '08:00',
    lastCheckedDate: ''
  });

  const [showReminderOverlay, setShowReminderOverlay] = useState(false);

  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
    includeMeds: true,
    includeCondition: true,
    includeHistory: true
  });

  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showInteractionCheck, setShowInteractionCheck] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  // --- Account / household (family) sync ---
  const [auth, setAuth] = useState<StoredAuth | null>(() => getStoredAuth());
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(() => localStorage.getItem('activeHouseholdId'));
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const setActiveHouseholdId = (id: string | null) => {
    setActiveHouseholdIdState(id);
    if (id) localStorage.setItem('activeHouseholdId', id);
    else localStorage.removeItem('activeHouseholdId');
  };

  // Set right before applying data pulled from the server so the debounced-push
  // effect below doesn't immediately echo it straight back.
  const suppressNextPushRef = useRef(false);
  const initialSyncDoneRef = useRef(false);

  const applyRemoteData = (data: { medications: Medication[]; logs: MedicationLog[]; globalLogs: GlobalActionLog[]; conditions: DailyCondition[] }) => {
    suppressNextPushRef.current = true;
    setMedications(data.medications || []);
    setLogs(data.logs || []);
    setGlobalLogs(data.globalLogs || []);
    setConditions(data.conditions || []);
  };

  const refreshHouseholds = useCallback(async (currentAuth: StoredAuth) => {
    const { households: list } = await fetchMe(currentAuth.token);
    setHouseholds(list);
    return list;
  }, []);

  useEffect(() => {
    if (!auth) {
      setHouseholds([]);
      setHouseholdMembers([]);
      return;
    }
    refreshHouseholds(auth).catch(() => {});
  }, [auth, refreshHouseholds]);

  useEffect(() => {
    if (!auth || !activeHouseholdId) {
      setHouseholdMembers([]);
      return;
    }
    fetchMembers(auth.token, activeHouseholdId).then(res => setHouseholdMembers(res.members)).catch(() => {});
  }, [auth, activeHouseholdId]);

  // Initial sync (pull existing shared data, or bootstrap the household with this
  // device's current data) + live updates over WebSocket while a household is active.
  useEffect(() => {
    if (!settingsLoaded || !auth || !activeHouseholdId) return;
    let cancelled = false;
    initialSyncDoneRef.current = false;
    setSyncStatus('syncing');

    (async () => {
      try {
        const { data, updatedAt } = await fetchHouseholdData(auth.token, activeHouseholdId);
        if (cancelled) return;
        if (updatedAt && data) {
          applyRemoteData(data);
        } else {
          await pushHouseholdData(auth.token, activeHouseholdId, { medications, logs, globalLogs, conditions });
        }
        if (!cancelled) { setSyncStatus('synced'); setSyncError(null); }
      } catch (e) {
        if (!cancelled) { setSyncStatus('error'); setSyncError(e instanceof Error ? e.message : '同期に失敗しました'); }
      } finally {
        if (!cancelled) initialSyncDoneRef.current = true;
      }
    })();

    const disconnect = connectHouseholdSocket(auth.token, activeHouseholdId, () => {
      fetchHouseholdData(auth.token, activeHouseholdId)
        .then(({ data, updatedAt }) => { if (updatedAt && data) applyRemoteData(data); })
        .catch(() => {});
    });

    return () => { cancelled = true; disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, auth, activeHouseholdId]);

  // Push local changes to the shared household data after a short quiet period.
  useEffect(() => {
    if (!settingsLoaded || !auth || !activeHouseholdId || !initialSyncDoneRef.current) return;
    if (suppressNextPushRef.current) { suppressNextPushRef.current = false; return; }

    const timer = setTimeout(() => {
      setSyncStatus('syncing');
      pushHouseholdData(auth.token, activeHouseholdId, { medications, logs, globalLogs, conditions })
        .then(() => { setSyncStatus('synced'); setSyncError(null); })
        .catch(e => { setSyncStatus('error'); setSyncError(e instanceof Error ? e.message : '同期に失敗しました'); });
    }, 1200);

    return () => clearTimeout(timer);
  }, [medications, logs, globalLogs, conditions, settingsLoaded, auth, activeHouseholdId]);

  const handleLogin = async (email: string, password: string) => { setAuth(await apiLogin(email, password)); };
  const handleRegister = async (email: string, password: string) => { setAuth(await apiRegister(email, password)); };
  const handleLogout = () => {
    clearStoredAuth();
    setAuth(null);
    setActiveHouseholdId(null);
  };

  const handleCreateHousehold = async (name: string) => {
    if (!auth) return;
    const { household } = await apiCreateHousehold(auth.token, name);
    await refreshHouseholds(auth);
    setActiveHouseholdId(household.id);
  };

  const handleJoinHousehold = async (code: string) => {
    if (!auth) return;
    const { household } = await apiJoinHousehold(auth.token, code);
    await refreshHouseholds(auth);
    setActiveHouseholdId(household.id);
  };

  const handleLeaveHousehold = async () => {
    if (!auth || !activeHouseholdId) return;
    await apiLeaveHousehold(auth.token, activeHouseholdId);
    await refreshHouseholds(auth);
    setActiveHouseholdId(null);
    setSyncStatus('idle');
  };

  // Keeps the pending-action drain logic (which can fire from a service worker
  // "message" event at any time) reading fresh state instead of a stale closure.
  const stateRef = useRef({ logs, medications });
  useEffect(() => { stateRef.current = { logs, medications }; }, [logs, medications]);

  useEffect(() => {
    try {
      const load = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
      setMedications(load('medications'));
      setLogs(load('logs'));
      setGlobalLogs(load('globalLogs'));
      setConditions(load('conditions'));

      const savedReminder = localStorage.getItem('reminderSettings');
      if (savedReminder) {
        const settings: ReminderSettings = JSON.parse(savedReminder);
        setReminderSettings(settings);

        // Check if we should show the reminder overlay
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = format(new Date(), 'HH:mm');

        if (settings.enabled && settings.lastCheckedDate !== today && now >= settings.time) {
          setShowReminderOverlay(true);
        }
      }
    } catch (e) {
      console.error("Failed to load local storage", e);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Guard against writing back the pre-load default state (empty arrays) over
    // real data still sitting in localStorage: this effect's dependencies are
    // all "new" on the very first render too, so without this check it can fire
    // before the load effect above has applied what it read.
    if (!settingsLoaded) return;
    localStorage.setItem('medications', JSON.stringify(medications));
    localStorage.setItem('logs', JSON.stringify(logs));
    localStorage.setItem('globalLogs', JSON.stringify(globalLogs));
    localStorage.setItem('conditions', JSON.stringify(conditions));
    localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));
  }, [medications, logs, globalLogs, conditions, reminderSettings, settingsLoaded]);

  const addGlobalLog = (type: GlobalActionLog['type'], title: string, details?: string) => {
    const newLog: GlobalActionLog = { id: crypto.randomUUID(), timestamp: Date.now(), type, title, details };
    setGlobalLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  // Applies "take" actions recorded outside the app (notification tap, quick-record
  // shortcut) to the normal logs/medications state. 'ALL' marks every non-folder
  // medication for that day, used by the notification's bulk "飲んだ" action.
  const applyPendingActions = useCallback((actions: PendingAction[]) => {
    if (actions.length === 0) return;
    let { logs: logsAcc, medications: medsAcc } = stateRef.current;

    actions
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(action => {
        const targets = action.medicationId === 'ALL'
          ? medsAcc.filter(m => !m.isFolder).map(m => m.id)
          : [action.medicationId];
        targets.forEach(medId => {
          const result = markMedicationTaken(logsAcc, medsAcc, medId, action.dateStr);
          logsAcc = result.logs;
          medsAcc = result.medications;
        });
      });

    setLogs(logsAcc);
    setMedications(medsAcc);
    stateRef.current = { logs: logsAcc, medications: medsAcc };
    addGlobalLog('update', '通知・ショートカットからの記録', `${actions.length}件を反映しました`);
  }, []);

  const drainAndApply = useCallback(async () => {
    const actions = await drainPendingActions();
    applyPendingActions(actions);
  }, [applyPendingActions]);

  // Register the service worker once, and apply any dose already recorded from a
  // notification tap while the app itself was closed.
  useEffect(() => {
    registerServiceWorker();

    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'pending-actions-updated') {
        drainAndApply();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [drainAndApply]);

  useEffect(() => {
    if (settingsLoaded) {
      drainAndApply();
    }
  }, [settingsLoaded, drainAndApply]);

  // Keep the backend's push subscription in sync with the reminder toggle/time.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (reminderSettings.enabled) {
      subscribeToPush(reminderSettings.time).then(result => {
        setPushStatus(result.ok ? null : (result.reason || '通知の登録に失敗しました'));
      });
    } else {
      unsubscribeFromPush();
      setPushStatus(null);
    }
  }, [reminderSettings.enabled, reminderSettings.time, settingsLoaded]);

  // "今すぐ服薬を記録" manifest shortcut (/?quickAction=log) opens straight into the
  // quick-record sheet for people who don't want to go through the calendar edit flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quickAction') === 'log') {
      setShowQuickLog(true);
      params.delete('quickAction');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    }
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleQuickTake = (medId: string) => {
    const result = markMedicationTaken(logs, medications, medId, todayStr);
    if (result.changed) {
      setLogs(result.logs);
      setMedications(result.medications);
    }
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    const backup = buildBackup({ medications, logs, globalLogs, conditions, reminderSettings });
    downloadBackup(backup);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = await parseBackupFile(file);
      const exportedAtLabel = backup.exportedAt ? format(new Date(backup.exportedAt), 'yyyy/MM/dd HH:mm') : '不明';
      if (!window.confirm(`バックアップ(${exportedAtLabel}時点)を読み込みます。現在のデータは上書きされます。よろしいですか？`)) return;
      setMedications(backup.medications);
      setLogs(backup.logs);
      setGlobalLogs(backup.globalLogs);
      setConditions(backup.conditions);
      setReminderSettings(backup.reminderSettings);
      alert('データを復元しました');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'インポートに失敗しました');
    }
  };

  const handleQuickTakeAll = () => {
    let logsAcc = logs;
    let medsAcc = medications;
    medications.filter(m => !m.isFolder).forEach(m => {
      const result = markMedicationTaken(logsAcc, medsAcc, m.id, todayStr);
      logsAcc = result.logs;
      medsAcc = result.medications;
    });
    setLogs(logsAcc);
    setMedications(medsAcc);
    setShowQuickLog(false);
  };

  const handleSaveMed = (med: Medication) => {
    const isEdit = medications.some(m => m.id === med.id);
    setMedications(prev => isEdit ? prev.map(m => m.id === med.id ? med : m) : [...prev, med]);
    addGlobalLog(isEdit ? 'update' : 'add', med.title, isEdit ? '情報を更新しました' : '新規登録しました');
    setIsFormOpen(false);
    setEditingMed(null);
  };

  // Fix: Added handleScan implementation using Gemini AI to extract medication data
  // Accepts one or more photos (multi-page お薬手帳) and analyzes them together in a
  // single request so duplicate entries across pages can be reconciled by the model.
  const handleScan = async (base64Images: string[]) => {
    setIsCameraOpen(false);
    setIsScanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } })),
            { text: `お薬手帳の画像(${base64Images.length}枚)を解析して、記載されているお薬のリストを抽出し、指定されたJSON形式で返してください。複数枚にまたがる場合はすべてのページを合わせて1つのリストにまとめ、同じお薬が重複して写っている場合は1件にまとめてください。日本語で回答してください。不明な項目はデフォルト値（錠、朝食後など）を使用してください。` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "お薬の名前" },
                dosage: { type: Type.NUMBER, description: "1回の服用量（数値のみ）" },
                unit: { type: Type.STRING, description: "単位（錠、カプセル、包など）" },
                label: { type: Type.STRING, description: "服用タイミング（朝食後、夕食後など）" },
                memo: { type: Type.STRING, description: "補足情報" },
                stock: { type: Type.NUMBER, description: "処方された総数（在庫）" }
              },
              required: ["title", "dosage", "unit", "label"]
            }
          }
        }
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        const results = JSON.parse(jsonStr);
        if (Array.isArray(results)) {
          results.forEach(res => {
            const newMed: Medication = {
              id: crypto.randomUUID(),
              title: res.title || '不明なお薬',
              dosage: res.dosage || 1,
              unit: (UNITS.includes(res.unit as any) ? res.unit : '錠') as any,
              label: (LABELS.includes(res.label as any) ? res.label : '朝食後') as any,
              stock: res.stock || 0,
              memo: res.memo || '',
              color: 'emerald',
              startDate: Date.now(),
              isFolder: false,
            };
            setMedications(prev => [...prev, newMed]);
            addGlobalLog('scan', newMed.title, 'AIスキャンにより追加しました');
          });
        }
      }
    } catch (error) {
      console.error("AI scanning error:", error);
      alert("AIによる読み取りに失敗しました。手動で入力してください。");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 min-h-screen max-w-md mx-auto shadow-2xl flex flex-col relative overflow-hidden">
      <main className="flex-1 overflow-hidden relative">
        {view === 'home' && (
          <HomeView
            medications={medications} 
            logs={logs} 
            setLogs={setLogs} 
            setMedications={setMedications}
            conditions={conditions}
            setConditions={setConditions}
            onEditMed={(med) => { setEditingMed(med); setIsFormOpen(true); }}
            onOpenForm={() => { setEditingMed(null); setIsFormOpen(true); }}
            onOpenScan={() => setIsCameraOpen(true)}
          />
        )}
        {view === 'meds' && (
          <MedicationListView 
            medications={medications} 
            globalLogs={globalLogs}
            onEditMed={(med) => { setEditingMed(med); setIsFormOpen(true); }}
            onOpenForm={() => { setEditingMed(null); setIsFormOpen(true); }}
            onOpenScan={() => setIsCameraOpen(true)}
          />
        )}
        {view === 'report-setup' && (
          <ReportSetupView 
            config={reportConfig} 
            setConfig={setReportConfig} 
            onBack={() => setView('settings')}
            onGenerate={() => setView('report')}
          />
        )}
        {view === 'report' && (
          <ReportPreviewView 
            config={reportConfig} 
            medications={medications} 
            logs={logs} 
            conditions={conditions}
            globalLogs={globalLogs}
            onBack={() => setView('report-setup')}
          />
        )}
        {view === 'settings' && (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-300">
            <div className="bg-slate-50 dark:bg-slate-900 py-3 safe-top border-b border-slate-200 dark:border-slate-700"><h1 className="text-center font-bold text-slate-800 dark:text-slate-100">設定</h1></div>
            <div className="p-5 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl flex items-center justify-center">
                      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">ダークモード</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">画面の配色を切り替え</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label="ダークモード"
                    className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-slate-800 rounded-full transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                      <Bell size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">強制リマインド</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">指定時間以降の起動時に警告</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReminderSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    role="switch"
                    aria-checked={reminderSettings.enabled}
                    aria-label="強制リマインド"
                    className={`w-12 h-6 rounded-full transition-colors relative ${reminderSettings.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-slate-800 rounded-full transition-all ${reminderSettings.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {reminderSettings.enabled && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <Clock size={16} className="text-slate-500 dark:text-slate-500" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">開始時間:</span>
                    <input
                      type="time"
                      value={reminderSettings.time}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, time: e.target.value }))}
                      className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1 font-black text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                )}

                {reminderSettings.enabled && pushStatus && (
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-50 dark:border-slate-800 text-amber-600">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold leading-tight">{pushStatus}(アプリを開いている間の通知チェックのみ有効です)</p>
                  </div>
                )}
              </div>

              <AccountPanel
                auth={auth}
                households={households}
                activeHouseholdId={activeHouseholdId}
                members={householdMembers}
                syncStatus={syncStatus}
                syncError={syncError}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
                onCreateHousehold={handleCreateHousehold}
                onJoinHousehold={handleJoinHousehold}
                onSelectHousehold={setActiveHouseholdId}
                onLeaveHousehold={handleLeaveHousehold}
              />

              <button onClick={() => setView('report-setup')} className="w-full p-6 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between font-black text-slate-800 dark:text-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center"><FileDown size={24}/></div>
                  <div className="text-left"><p className="text-lg">レポート作成</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">PDF出力・印刷・共有</p></div>
                </div>
                <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
              </button>

              <button
                onClick={() => setShowInteractionCheck(true)}
                disabled={medications.filter(m => !m.isFolder).length < 2}
                className="w-full p-6 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between font-black text-slate-800 dark:text-slate-100 shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center"><ShieldAlert size={24}/></div>
                  <div className="text-left">
                    <p className="text-lg">飲み合わせチェック(AI)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-bold">
                      {medications.filter(m => !m.isFolder).length < 2 ? 'お薬を2件以上登録すると使えます' : 'AIが併用リスクを確認します'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
              </button>
              <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                <button onClick={handleExportBackup} className="w-full p-6 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-700 transition-colors">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Download size={22}/></div>
                  <div className="text-left"><p className="font-black text-slate-800 dark:text-slate-100">データをエクスポート</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">全データをJSONファイルとして保存</p></div>
                </button>
                <button onClick={() => importInputRef.current?.click()} className="w-full p-6 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-700 transition-colors">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Upload size={22}/></div>
                  <div className="text-left"><p className="font-black text-slate-800 dark:text-slate-100">データをインポート</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">バックアップファイルから復元(上書き)</p></div>
                </button>
                <input ref={importInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
              </div>

              <button onClick={() => { if(window.confirm('全データを削除しますか？')) { localStorage.clear(); location.reload(); }}} className="w-full p-4 bg-white dark:bg-slate-800 rounded-3xl border border-red-50 dark:border-red-500/20 text-red-600 font-bold flex items-center gap-3 active:scale-95 transition-transform">
                <RotateCcw size={20} /> データリセット
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav currentView={view} onChange={setView} />
      
      {showReminderOverlay && (
        <ReminderOverlay 
          reminderTime={reminderSettings.time}
          onConfirm={() => {
            setReminderSettings(prev => ({ ...prev, lastCheckedDate: format(new Date(), 'yyyy-MM-dd') }));
            setShowReminderOverlay(false);
          }}
        />
      )}

      {showInteractionCheck && (
        <InteractionCheckModal medications={medications} onClose={() => setShowInteractionCheck(false)} />
      )}

      {showQuickLog && (
        <QuickLogSheet
          medications={medications}
          logs={logs}
          dateStr={todayStr}
          onTake={handleQuickTake}
          onTakeAll={handleQuickTakeAll}
          onClose={() => setShowQuickLog(false)}
        />
      )}

      {/* Fix: Passed handleScan to the CameraModal */}
      {isCameraOpen && <CameraModal onCapture={handleScan} onCancel={() => setIsCameraOpen(false)} />}
      
      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 size={48} className="animate-spin mb-4 text-emerald-400" />
          <p className="font-bold tracking-widest uppercase text-xs">AI Scanning...</p>
        </div>
      )}

      {isFormOpen && (
        <MedicationForm 
          initialData={editingMed || undefined}
          onSave={handleSaveMed}
          onCancel={() => { setIsFormOpen(false); setEditingMed(null); }}
          onDelete={(id) => {
            setMedications(medications.filter(m => m.id !== id && m.parentId !== id));
            addGlobalLog('delete', editingMed?.title || '不明', '情報を削除しました');
            setIsFormOpen(false);
          }}
          visibleUnits={UNITS}
          visibleLabels={LABELS}
        />
      )}
    </div>
  );
};

export default App;
