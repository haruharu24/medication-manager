
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { BottomNav } from './components/BottomNav';
import { MedicationForm } from './components/MedicationForm';
import { CameraModal } from './components/CameraModal';
import { ScanReviewModal } from './components/ScanReviewModal';
import { QuickLogSheet } from './components/QuickLogSheet';
import { InteractionCheckModal } from './components/InteractionCheckModal';
import { AccountPanel } from './components/AccountPanel';
import { Medication, MedicationLog, ViewMode, DailyCondition, GlobalActionLog, ReportConfig, ReminderSettings, VitalRecord, MedicalRecord, MedicalContacts } from './types';
import { UNITS, LABELS } from './constants';
import { HomeView } from './features/home/HomeView';
import { MedicationListView } from './features/meds/MedicationListView';
import { ReportSetupView } from './features/report/ReportSetupView';
import { ReportPreviewView } from './features/report/ReportPreviewView';
import { ReminderOverlay } from './components/ReminderOverlay';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { Loader2, RotateCcw, ChevronRight, FileDown, Bell, Clock, AlertTriangle, Download, Upload, ShieldAlert, Moon, Sun, HelpCircle } from 'lucide-react';
import { recognizeImages } from './utils/ocrRecognize';
import { parseOcrTextToMedication } from './utils/ocrParse';
import { markMedicationTaken } from './utils/medicationActions';
import { migrateFromLocalStorage } from './db/migration';
import { getAllMedications } from './db/medications';
import { getAllLogs } from './db/logs';
import { getAllConditions } from './db/conditions';
import { getAllGlobalLogs } from './db/globalLogs';
import { getReminderSettings, saveReminderSettings } from './db/settings';
import { getAllVitals } from './db/vitals';
import { getAllMedicalRecords } from './db/medicalRecords';
import { getMedicalContacts, saveMedicalContacts } from './db/contacts';
import { replaceAllMedications, replaceAllLogs, replaceAllConditions, replaceAllGlobalLogs, replaceAllVitals, replaceAllMedicalRecords, resetAllData } from './db/bulk';
import { drainPendingActions, PendingAction } from './utils/pendingActionsDb';
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush, PushReminder } from './utils/push';
import { useI18n } from './i18n';
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
  updateMemberRole as apiUpdateMemberRole,
  connectHouseholdSocket,
} from './utils/household';

const App: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const [view, setView] = useState<ViewMode>('home');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [globalLogs, setGlobalLogs] = useState<GlobalActionLog[]>([]);
  const [conditions, setConditions] = useState<DailyCondition[]>([]);
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [medicalContacts, setMedicalContacts] = useState<MedicalContacts>({});

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: false,
    time: '08:00',
    lastCheckedDate: ''
  });

  const [showReminderOverlay, setShowReminderOverlay] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
    includeMeds: true,
    includeCondition: true,
    includeHistory: true,
    includeVitals: true,
    includeAllergies: true,
    includeContacts: true
  });

  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [scanDrafts, setScanDrafts] = useState<Medication[] | null>(null);

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
  // 'viewer' members can read the household's shared data but not write it (the
  // server rejects the PUT too — this just avoids pointless failed requests and
  // the confusing "edit that silently reverts" UX that would follow).
  const isViewer = householdMembers.find(m => m.userId === auth?.user.id)?.role === 'viewer';

  const setActiveHouseholdId = (id: string | null) => {
    setActiveHouseholdIdState(id);
    if (id) localStorage.setItem('activeHouseholdId', id);
    else localStorage.removeItem('activeHouseholdId');
  };

  // Set right before applying data pulled from the server so the debounced-push
  // effect below doesn't immediately echo it straight back.
  const suppressNextPushRef = useRef(false);
  const initialSyncDoneRef = useRef(false);

  const applyRemoteData = (data: { medications: Medication[]; logs: MedicationLog[]; globalLogs: GlobalActionLog[]; conditions: DailyCondition[]; vitals: VitalRecord[]; medicalRecords: MedicalRecord[]; medicalContacts: MedicalContacts }) => {
    suppressNextPushRef.current = true;
    setMedications(data.medications || []);
    setLogs(data.logs || []);
    setGlobalLogs(data.globalLogs || []);
    setConditions(data.conditions || []);
    setVitals(data.vitals || []);
    setMedicalRecords(data.medicalRecords || []);
    setMedicalContacts(data.medicalContacts || {});
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
        } else if (!isViewer) {
          await pushHouseholdData(auth.token, activeHouseholdId, { medications, logs, globalLogs, conditions, vitals, medicalRecords, medicalContacts });
        }
        if (!cancelled) { setSyncStatus('synced'); setSyncError(null); }
      } catch (e) {
        if (!cancelled) { setSyncStatus('error'); setSyncError(e instanceof Error ? e.message : '同期に失敗しました'); }
      } finally {
        if (!cancelled) initialSyncDoneRef.current = true;
      }
    })();

    const disconnect = connectHouseholdSocket(auth.token, activeHouseholdId, {
      onDataUpdated: () => {
        fetchHouseholdData(auth.token, activeHouseholdId)
          .then(({ data, updatedAt }) => { if (updatedAt && data) applyRemoteData(data); })
          .catch(() => {});
      },
      onMembersUpdated: () => {
        fetchMembers(auth.token, activeHouseholdId).then(res => setHouseholdMembers(res.members)).catch(() => {});
      },
    });

    return () => { cancelled = true; disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, auth, activeHouseholdId]);

  // Push local changes to the shared household data after a short quiet period.
  useEffect(() => {
    if (!settingsLoaded || !auth || !activeHouseholdId || !initialSyncDoneRef.current || isViewer) return;
    if (suppressNextPushRef.current) { suppressNextPushRef.current = false; return; }

    const timer = setTimeout(() => {
      setSyncStatus('syncing');
      pushHouseholdData(auth.token, activeHouseholdId, { medications, logs, globalLogs, conditions, vitals, medicalRecords, medicalContacts })
        .then(() => { setSyncStatus('synced'); setSyncError(null); })
        .catch(e => { setSyncStatus('error'); setSyncError(e instanceof Error ? e.message : '同期に失敗しました'); });
    }, 1200);

    return () => clearTimeout(timer);
  }, [medications, logs, globalLogs, conditions, vitals, medicalRecords, medicalContacts, settingsLoaded, auth, activeHouseholdId, isViewer]);

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

  const handleUpdateMemberRole = async (userId: string, role: 'editor' | 'viewer') => {
    if (!auth || !activeHouseholdId) return;
    const { members } = await apiUpdateMemberRole(auth.token, activeHouseholdId, userId, role);
    setHouseholdMembers(members);
  };

  // Keeps the pending-action drain logic (which can fire from a service worker
  // "message" event at any time) reading fresh state instead of a stale closure.
  const stateRef = useRef({ logs, medications });
  useEffect(() => { stateRef.current = { logs, medications }; }, [logs, medications]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrateFromLocalStorage();
        const [meds, ls, gLogs, conds, settings, vits, medRecs, contacts] = await Promise.all([
          getAllMedications(),
          getAllLogs(),
          getAllGlobalLogs(),
          getAllConditions(),
          getReminderSettings(),
          getAllVitals(),
          getAllMedicalRecords(),
          getMedicalContacts(),
        ]);
        if (cancelled) return;
        setMedications(meds);
        setLogs(ls);
        setGlobalLogs(gLogs);
        setConditions(conds);
        setReminderSettings(settings);
        setVitals(vits);
        setMedicalRecords(medRecs);
        setMedicalContacts(contacts);

        // Check if we should show the reminder overlay
        const today = format(new Date(), 'yyyy-MM-dd');
        const now = format(new Date(), 'HH:mm');
        if (settings.enabled && settings.lastCheckedDate !== today && now >= settings.time) {
          setShowReminderOverlay(true);
        }

        if (localStorage.getItem('onboardingCompleted') !== 'true') {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFinishOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    // Guard against writing back the pre-load default state (empty arrays) over
    // real data still sitting in IndexedDB: this effect's dependencies are
    // all "new" on the very first render too, so without this check it can fire
    // before the load effect above has applied what it read.
    if (!settingsLoaded) return;
    Promise.all([
      replaceAllMedications(medications),
      replaceAllLogs(logs),
      replaceAllGlobalLogs(globalLogs),
      replaceAllConditions(conditions),
      saveReminderSettings(reminderSettings),
      replaceAllVitals(vitals),
      replaceAllMedicalRecords(medicalRecords),
      saveMedicalContacts(medicalContacts),
    ]).catch(e => console.error("Failed to persist data", e));
  }, [medications, logs, globalLogs, conditions, reminderSettings, vitals, medicalRecords, medicalContacts, settingsLoaded]);

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

  // One daily catch-all reminder (the global 強制リマインド time) plus one reminder
  // per medication that has its own notification time set.
  const activeReminders = useMemo<PushReminder[]>(() => {
    const medReminders: PushReminder[] = medications
      .filter(m => !m.isFolder && m.notificationTime)
      .map(m => ({ id: m.id, medicationId: m.id, title: m.title, time: m.notificationTime as string }));
    return [
      { id: 'ALL', medicationId: 'ALL', title: '服薬リマインダー', time: reminderSettings.time },
      ...medReminders,
    ];
  }, [medications, reminderSettings.time]);
  const remindersKey = useMemo(() => JSON.stringify(activeReminders), [activeReminders]);

  // Keep the backend's push subscription in sync with the reminder toggle/time and
  // with each medication's own notification time.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (reminderSettings.enabled) {
      subscribeToPush(activeReminders).then(result => {
        setPushStatus(result.ok ? null : (result.reason || '通知の登録に失敗しました'));
      });
    } else {
      unsubscribeFromPush();
      setPushStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderSettings.enabled, remindersKey, settingsLoaded]);

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
    const backup = buildBackup({ medications, logs, globalLogs, conditions, reminderSettings, vitals, medicalRecords, medicalContacts });
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
      setVitals(backup.vitals);
      setMedicalRecords(backup.medicalRecords);
      setMedicalContacts(backup.medicalContacts);
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

  const handleOpenGroupForm = () => {
    setEditingMed({
      id: '',
      title: '',
      unit: '錠',
      dosage: 0,
      label: '',
      stock: 0,
      memo: '',
      color: 'emerald',
      startDate: Date.now(),
      isFolder: true,
      folderType: 'multi-dose',
    });
    setIsFormOpen(true);
  };

  // Accepts one or more photos (multi-page お薬手帳) and runs client-side OCR
  // (Tesseract.js, see utils/ocrRecognize.ts) on each, one draft per photo — no
  // AI/network call, so no per-scan cost. Unlike the AI it replaced, this can't
  // split multiple medications out of a single photo (see CameraModal's hint).
  const handleScan = async (base64Images: string[]) => {
    setIsCameraOpen(false);
    setIsScanning(true);
    setScanProgress({ done: 0, total: base64Images.length });
    try {
      const texts = await recognizeImages(base64Images, (done, total) => setScanProgress({ done, total }));
      const drafts = texts.map(parseOcrTextToMedication).filter((m): m is Medication => m !== null);
      if (drafts.length > 0) {
        setScanDrafts(drafts);
      } else {
        alert("お薬の情報を読み取れませんでした。手動で入力してください。");
      }
    } catch (error) {
      console.error("OCR scanning error:", error);
      alert("文字の読み取りに失敗しました。手動で入力してください。");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const handleConfirmScanReview = (meds: Medication[]) => {
    setMedications(prev => [...prev, ...meds]);
    meds.forEach(med => addGlobalLog('scan', med.title, 'スキャンにより追加しました'));
    setScanDrafts(null);
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
            onEditMed={isViewer ? () => {} : (med) => { setEditingMed(med); setIsFormOpen(true); }}
            onOpenForm={() => { setEditingMed(null); setIsFormOpen(true); }}
            onOpenScan={() => setIsCameraOpen(true)}
            onOpenGroupForm={handleOpenGroupForm}
            readOnly={isViewer}
          />
        )}
        {view === 'meds' && (
          <MedicationListView
            medications={medications}
            globalLogs={globalLogs}
            onEditMed={isViewer ? () => {} : (med) => { setEditingMed(med); setIsFormOpen(true); }}
            onOpenForm={() => { setEditingMed(null); setIsFormOpen(true); }}
            onOpenScan={() => setIsCameraOpen(true)}
            onOpenGroupForm={handleOpenGroupForm}
            readOnly={isViewer}
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
            <div className="bg-slate-50 dark:bg-slate-900 py-3 safe-top border-b border-slate-200 dark:border-slate-700"><h1 className="text-center font-bold text-slate-800 dark:text-slate-100">{t.settings.title}</h1></div>
            <div className="p-5 pb-32 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-3">{t.settings.language}</p>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                  {(['ja', 'en'] as const).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${language === lang ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-500'}`}
                    >
                      {lang === 'ja' ? '日本語' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl flex items-center justify-center">
                      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{t.settings.darkMode}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">{t.settings.darkModeDesc}</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label={t.settings.darkMode}
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
                      <p className="font-black text-slate-800 dark:text-slate-100">{t.settings.forceRemind}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">{t.settings.forceRemindDesc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReminderSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    role="switch"
                    aria-checked={reminderSettings.enabled}
                    aria-label={t.settings.forceRemind}
                    className={`w-12 h-6 rounded-full transition-colors relative ${reminderSettings.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-slate-800 rounded-full transition-all ${reminderSettings.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {reminderSettings.enabled && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <Clock size={16} className="text-slate-500 dark:text-slate-500" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t.settings.startTime}</span>
                    <input
                      type="time"
                      value={reminderSettings.time}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, time: e.target.value }))}
                      className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1 font-black text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                )}

                {reminderSettings.enabled && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold leading-relaxed pt-2 border-t border-slate-50 dark:border-slate-800">
                    {t.settings.perMedHint}
                  </p>
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
                onUpdateMemberRole={handleUpdateMemberRole}
              />

              <button onClick={() => setView('report-setup')} className="w-full p-6 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between font-black text-slate-800 dark:text-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center"><FileDown size={24}/></div>
                  <div className="text-left"><p className="text-lg">{t.settings.reportCreate}</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">{t.settings.reportCreateDesc}</p></div>
                </div>
                <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
              </button>

              <button onClick={() => setShowOnboarding(true)} className="w-full p-6 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between font-black text-slate-800 dark:text-slate-100 shadow-sm active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/10 text-teal-600 rounded-2xl flex items-center justify-center"><HelpCircle size={24}/></div>
                  <div className="text-left"><p className="text-lg">{t.settings.howToUse}</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">{t.settings.howToUseDesc}</p></div>
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
                    <p className="text-lg">{t.settings.interactionCheck}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-bold">
                      {medications.filter(m => !m.isFolder).length < 2 ? t.settings.interactionCheckNeedsTwo : t.settings.interactionCheckReady}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
              </button>
              <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                <button onClick={handleExportBackup} className="w-full p-6 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-700 transition-colors">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Download size={22}/></div>
                  <div className="text-left"><p className="font-black text-slate-800 dark:text-slate-100">{t.settings.exportData}</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">{t.settings.exportDataDesc}</p></div>
                </button>
                <button onClick={() => importInputRef.current?.click()} className="w-full p-6 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-700 transition-colors">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Upload size={22}/></div>
                  <div className="text-left"><p className="font-black text-slate-800 dark:text-slate-100">{t.settings.importData}</p><p className="text-xs text-slate-500 dark:text-slate-500 font-bold">{t.settings.importDataDesc}</p></div>
                </button>
                <input ref={importInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
              </div>

              <button onClick={async () => {
                if (!window.confirm(t.settings.resetConfirm)) return;
                try {
                  await resetAllData();
                  localStorage.clear();
                  location.reload();
                } catch (e) {
                  console.error("Failed to reset data", e);
                  alert(t.settings.resetFailed);
                }
              }} className="w-full p-4 bg-white dark:bg-slate-800 rounded-3xl border border-red-50 dark:border-red-500/20 text-red-600 font-bold flex items-center gap-3 active:scale-95 transition-transform">
                <RotateCcw size={20} /> {t.settings.resetData}
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav currentView={view} onChange={setView} />

      {showOnboarding && <OnboardingOverlay onFinish={handleFinishOnboarding} />}

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

      {isCameraOpen && <CameraModal onCapture={handleScan} onCancel={() => setIsCameraOpen(false)} />}

      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 size={48} className="animate-spin mb-4 text-emerald-400" />
          <p className="font-bold tracking-widest uppercase text-xs">
            文字を読み取っています…
            {scanProgress && scanProgress.total > 1 ? `(${scanProgress.done}/${scanProgress.total}枚)` : ''}
          </p>
        </div>
      )}

      {scanDrafts && (
        <ScanReviewModal
          drafts={scanDrafts}
          onConfirm={handleConfirmScanReview}
          onCancel={() => setScanDrafts(null)}
        />
      )}

      {isFormOpen && (
        <MedicationForm
          initialData={editingMed || undefined}
          isNew={!editingMed || !medications.some(m => m.id === editingMed.id)}
          availableGroups={medications.filter(m => m.isFolder)}
          onSave={handleSaveMed}
          onCancel={() => { setIsFormOpen(false); setEditingMed(null); }}
          onDelete={editingMed && medications.some(m => m.id === editingMed.id) ? (id) => {
            setMedications(medications.filter(m => m.id !== id && m.parentId !== id));
            addGlobalLog('delete', editingMed?.title || '不明', '情報を削除しました');
            setIsFormOpen(false);
          } : undefined}
          visibleUnits={UNITS}
          visibleLabels={LABELS}
        />
      )}
    </div>
  );
};

export default App;
