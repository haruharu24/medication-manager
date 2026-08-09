// Lightweight i18n dictionary. Add a key under `ja`, mirror it under `en`
// (TypeScript enforces the two stay in sync via the shared shape), then read it
// through useI18n()'s `t` object — see i18n/index.tsx.
//
// Coverage: navigation, the settings screen, the home/meds screen chrome
// (headers, add menus, tabs), and the onboarding overlay. The medication form,
// AI scan review screen, report screens, account/household panel, camera
// modal, and health card are still Japanese-only; extend this file and thread
// useI18n() through them the same way when localizing those.
const ja = {
  nav: {
    home: 'ホーム',
    meds: 'お薬',
    settings: '設定',
  },
  home: {
    appName: 'MediMate',
    add: '追加',
    manualEntry: '手動入力',
    scanBook: '手帳スキャン',
    createGroup: 'グループを作成',
    lowStockWarning: '在庫が少ないお薬があります',
    calendarMonth: '月',
    calendarWeek: '週',
    calendarDay: '日',
  },
  meds: {
    title: 'お薬ボックス',
    list: 'リスト',
    history: '履歴',
    individualMeds: '個別のお薬',
  },
  settings: {
    title: '設定',
    language: '言語',
    darkMode: 'ダークモード',
    darkModeDesc: '画面の配色を切り替え',
    forceRemind: '強制リマインド',
    forceRemindDesc: '指定時間以降の起動時に警告',
    startTime: '開始時間:',
    perMedHint: 'お薬ごとに「通知」時刻を設定すると、その時刻にも個別に通知が届きます。',
    howToUse: '使い方を見る',
    howToUseDesc: 'アプリの基本的な使い方を確認',
    vitalsRecord: 'バイタル記録',
    vitalsRecordDesc: '血圧・体重・体温・血糖値を記録',
    medicalHistory: 'アレルギー・既往歴',
    medicalHistoryDesc: 'アレルギーや持病を記録',
    reportCreate: 'レポート作成',
    reportCreateDesc: 'PDF出力・印刷・共有',
    interactionCheck: '飲み合わせチェック(AI)',
    interactionCheckNeedsTwo: 'お薬を2件以上登録すると使えます',
    interactionCheckReady: 'AIが併用リスクを確認します',
    exportData: 'データをエクスポート',
    exportDataDesc: '全データをJSONファイルとして保存',
    importData: 'データをインポート',
    importDataDesc: 'バックアップファイルから復元(上書き)',
    resetData: 'データリセット',
    resetConfirm: '全データを削除しますか？',
    resetFailed: 'データの削除に失敗しました。もう一度お試しください。',
  },
  onboarding: {
    skip: 'スキップ',
    next: '次へ',
    start: 'はじめる',
    closeLabel: 'スキップして閉じる',
    steps: [
      { title: 'MediMateへようこそ', description: 'お薬の記録・在庫管理・服薬リマインダーをまとめて管理できるアプリです。かんたんな使い方をご案内します。' },
      { title: 'お薬を登録する', description: '右上の「追加」から、手入力・お薬手帳の写真スキャン・グループ(一包化)作成の3通りでお薬を登録できます。' },
      { title: '服用を記録する', description: 'ホーム画面でお薬をタップすると、その場で服用済みとして記録できます。カレンダーで過去の記録も確認できます。' },
      { title: '飲み忘れを防ぐ', description: '設定画面の「強制リマインド」をONにすると通知が届きます。お薬ごとに個別の通知時刻も設定できます。' },
      { title: '家族と共有する', description: '設定画面からアカウントを作成し世帯を作ると、家族や介護者とお薬の記録をリアルタイムで共有できます。' },
    ],
  },
};

const en: typeof ja = {
  nav: {
    home: 'Home',
    meds: 'Meds',
    settings: 'Settings',
  },
  home: {
    appName: 'MediMate',
    add: 'Add',
    manualEntry: 'Manual entry',
    scanBook: 'Scan medication notebook',
    createGroup: 'Create group',
    lowStockWarning: 'Some medications are running low',
    calendarMonth: 'M',
    calendarWeek: 'W',
    calendarDay: 'D',
  },
  meds: {
    title: 'Medication box',
    list: 'List',
    history: 'History',
    individualMeds: 'Individual medications',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    darkMode: 'Dark mode',
    darkModeDesc: 'Switch the screen color scheme',
    forceRemind: 'Reminder notifications',
    forceRemindDesc: 'Warns on app open after the set time',
    startTime: 'Start time:',
    perMedHint: 'Setting a "notification" time on an individual medication also sends a reminder at that time.',
    howToUse: 'How to use this app',
    howToUseDesc: 'Review the basics of using the app',
    vitalsRecord: 'Vitals tracking',
    vitalsRecordDesc: 'Track blood pressure, weight, temperature & blood sugar',
    medicalHistory: 'Allergies & medical history',
    medicalHistoryDesc: 'Record allergies and past conditions',
    reportCreate: 'Create report',
    reportCreateDesc: 'Export as PDF, print, or share',
    interactionCheck: 'Interaction check (AI)',
    interactionCheckNeedsTwo: 'Add 2 or more medications to use this',
    interactionCheckReady: 'AI checks for interaction risks',
    exportData: 'Export data',
    exportDataDesc: 'Save all data as a JSON file',
    importData: 'Import data',
    importDataDesc: 'Restore from a backup file (overwrites)',
    resetData: 'Reset all data',
    resetConfirm: 'Delete all data?',
    resetFailed: 'Failed to delete data. Please try again.',
  },
  onboarding: {
    skip: 'Skip',
    next: 'Next',
    start: 'Get started',
    closeLabel: 'Skip and close',
    steps: [
      { title: 'Welcome to MediMate', description: 'Track your medications, manage stock, and set reminders all in one app. Here’s a quick tour.' },
      { title: 'Add a medication', description: 'Use "Add" in the top right to enter one manually, scan photos of your medication notebook, or create a group (for pre-packaged doses).' },
      { title: 'Log a dose', description: 'Tap a medication on the home screen to mark it as taken. Check past records anytime on the calendar.' },
      { title: 'Never miss a dose', description: 'Turn on "Reminder notifications" in Settings to get alerts. You can also set an individual notification time per medication.' },
      { title: 'Share with family', description: 'Create an account and a household in Settings to share medication records in real time with family or caregivers.' },
    ],
  },
};

export const translations = { ja, en };
export type TranslationDict = typeof ja;
