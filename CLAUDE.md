# MediMate 開発ガイド

服薬管理アプリ。React + TypeScript + Vite のフロントエンドと、`server/` にアカウント認証・世帯データ同期・Web Pushリマインダー用のExpressバックエンドがある。

## テストについて(必須)

**新しい機能を追加した後、または既存の挙動を変更した後は、必ず対応するテストを追加・更新してから作業完了とすること。** テストを書かずに機能追加を終えてはいけない。

### テストの種類と置き場所

- **ユニットテスト**: `utils/*.ts` の各モジュールに対して `utils/<name>.test.ts` を同じディレクトリに置く。純粋関数のロジック(在庫計算、服薬達成率、バックアップの検証など)はここで担保する。
- **コンポーネントテスト**: `components/*.tsx` / `features/**/*.tsx` に対して React Testing Library で `<Component>.test.tsx` を同じディレクトリに置く。ユーザー操作(クリック・入力)とコールバック呼び出しを検証する。
- **サーバーのユニット・結合テスト**: `server/*.test.js`。`accountStore.js`/`auth.js` の単体テストと、`index.js` を実際に起動してHTTP API(認証・世帯・データ同期)を叩く結合テストがある。
- **E2Eテスト**: `e2e/*.spec.ts` (Playwright)。実際のブラウザでフロントエンド+バックエンドを両方起動して、ユーザーの実際の操作フローを検証する。
- **アクセシビリティテスト**: `e2e/accessibility.spec.ts` に `@axe-core/playwright` でのスキャンをまとめている。新しい画面やモーダルを追加したら、このファイルに1テストケースを足すこと。

### 実行コマンド

```
npm test              # ユニット・結合テスト(Vitest) を1回実行
npm run test:watch    # Vitestをwatchモードで実行
npm run test:e2e      # Playwright E2E(アクセシビリティ含む)。フロント+サーバーを自動起動する
npm run test:a11y     # @a11y タグの付いたE2Eテストのみ実行
npm run test:all      # test + test:e2e をまとめて実行
```

機能を追加・修正したら、最低でも `npm test` と `npm run test:e2e` の両方をローカルで実行し、全て緑になっていることを確認してからコミットすること。CI (`.github/workflows/test.yml`) でも push/PR ごとに同じチェックが走る。

### 書く上での注意点

- **Tailwindはビルド時コンパイル**(`tailwind.config.js` / `postcss.config.js` / `index.css`)であり、CDN読み込みに戻さないこと。CDN方式だと外部ネットワークに依存し、ネットワーク制限のある環境(このリポジトリの開発サンドボックス含む)でE2E/アクセシビリティテストが実行できなくなる。
- Tailwindのクラス名は `className={\`bg-${color}-50\`}` のようにテンプレートリテラルで組み立てないこと。ビルド時のクラス抽出が壊れて意図したスタイルが当たらなくなる(実例: `ReportSetupView.tsx`/`ReportPreviewView.tsx` のリテラルマップ方式を参照)。
- サーバー側のテストは `server/*.test.js` の先頭に `// @vitest-environment node` を付けること(jsdomのWebSocket/EventがNodeネイティブの実装と衝突するため)。データディレクトリは `MEDIMATE_DATA_DIR` 環境変数でテスト用の一時ディレクトリに差し替えられるようになっている(`server/store.js` / `server/accountStore.js`)。
- 新しいアイコンのみボタンやトグルには `aria-label`(または `aria-labelledby`)を必ず付ける。新しいモーダルには `role="dialog"` `aria-modal="true"` と見出しへの `aria-labelledby`(または `aria-label`)を付ける。
- 新しい文字色を追加する場合、白背景に対して最低 4.5:1 のコントラスト比を確保すること(`text-slate-400`/`text-gray-400` は白背景でこの基準を満たさない — 使うなら `text-slate-500` 以上/`text-gray-500` 以上にする)。

## 多言語対応(i18n)

- `i18n/translations.ts` に `ja`/`en` の辞書、`i18n/index.tsx` に `I18nProvider`/`useI18n()` がある。`en` は `typeof ja` で型付けされているので、`ja` にキーを追加すると `en` 側の対応漏れは型エラーになる。
- 画面に文字列を追加するときは `const { t } = useI18n();` として `t.<namespace>.<key>` を参照する形にすること(直接日本語をJSXに書かない)。`useI18n()` はプロバイダーの外でも安全に使える(未ラップ時は日本語のデフォルト値を返すのでコンポーネント単体テストは今まで通り書ける)。
- 言語の切り替えUIは設定画面(`App.tsx`)にあり、選択は `localStorage.language` に永続化される。
- **現状のカバレッジ境界**: ナビゲーション(`BottomNav`)、設定画面、ホーム/お薬画面のヘッダー・追加メニュー・タブ、オンボーディング(`OnboardingOverlay`)は翻訳済み。お薬の追加・編集フォーム(`MedicationForm`)、スキャン確認画面(`ScanReviewModal`)、レポート画面、家族共有パネル(`AccountPanel`)、飲み合わせチェック、カメラモーダル、日付書式(date-fnsの `locale: ja`)は未対応で日本語のまま。これらを対応する際も同じ `useI18n()` パターンで拡張すること。
- E2Eテストで言語切り替え後の画面を検証する際、Playwrightのデフォルトプロジェクト設定はオンボーディング表示を無効化する `storageState`(`e2e/fixtures/onboarding-completed.json`)を使っている点に注意。

## 世帯メンバーの権限(owner/editor/viewer)

- `server/accountStore.js` の `householdMembers` に `role` フィールドがある(`owner`/`editor`/`viewer`)。作成者は `owner` 固定(変更不可)、招待コードで参加したメンバーは `editor` がデフォルト。オーナーだけが `POST /api/households/:id/members/:userId/role` でメンバーを `editor`/`viewer` に変更できる。
- `viewer` は `GET /api/households/:id/data` は可能だが `PUT` は403(`requireEditor` ミドルウェア)。クライアント側(`App.tsx` の `isViewer`)も同期プッシュのeffectをスキップし、`HomeView`/`MedicationListView` の「追加」メニューを非表示にする(いずれもUXの補助であり、実際の書き込み拒否はサーバー側が担保する)。
- 権限変更は他の同期イベントと同じWebSocket経路で `members-updated` としてブロードキャストされ、影響を受けたメンバーのクライアントは即座にメンバー一覧を再取得する(`utils/household.ts` の `connectHouseholdSocket`)。
- **未対応の境界**: 服薬記録のカレンダートグルや体調スコアの変更は、viewerでもローカルには反映されてしまう(pushは行われないため、次の同期で上書きされる)。完全なロックダウンは今後の課題。

## オフラインキャッシュ(Service Worker)

- `public/sw.js` はプレーンJS(バンドルされない)。`fetch` イベントで同一オリジンのGETリクエストをcache-first + バックグラウンド更新でキャッシュし、ナビゲーションはオフライン時にキャッシュ済みの `/` にフォールバックする。ビルド出力のファイル名はハッシュ化されるため固定リストでの事前キャッシュはせず、実際にリクエストされた時点でキャッシュする方式にしている。
- `sw.js` のキャッシュ戦略を変更したら `SHELL_CACHE` の末尾のバージョン番号(`medimate-shell-v1` など)を上げること。`activate` イベントで旧バージョンのキャッシュを破棄する仕組みになっている。

## データ永続化(IndexedDB)

- お薬・服薬記録・体調記録・履歴・リマインダー設定(`medications`/`logs`/`conditions`/`globalLogs`/`reminderSettings`)は `idb` パッケージ経由のIndexedDB(DB名 `medication-manager`, `db/database.ts` で定義)に永続化する。ストアごとのCRUDは `db/medications.ts` / `db/logs.ts` / `db/conditions.ts` / `db/globalLogs.ts` / `db/settings.ts` に分かれている。
- `App.tsx` はこれらをReact stateとして持ち、現在の配列を丸ごとストアに書き戻す方式(`db/bulk.ts` の `replaceAllMedications` 等でclear+bulk put)を使っている。個々のadd/update/deleteのたびに1件ずつCRUD関数を呼ぶのではなく、既存の15機能(家族共有・グループ作成・AIスキャン確認・通知など)がすべて `setMedications` 等のReact state経由でしか状態を触らない前提を崩さないための設計。新しい機能を追加する際もこのパターンを踏襲し、state更新はReactの `setXxx` を使い、IndexedDBへの書き込みは既存のpersist effect(`App.tsx`)に任せること。
- 初回起動時のみ `db/migration.ts` の `migrateFromLocalStorage()` が旧`localStorage`のデータをIndexedDBへ一度だけ移行する(`idb-migration-done` フラグで再実行を防止、元のlocalStorageキーは削除しない)。
- IndexedDBが利用できない環境(Safariプライベートブラウズ等)へのフォールバックは意図的に実装していない。失敗時は`console.error`のみで、以降のUI操作は通常通り動作するが永続化されない。
- テストは `db/__tests__/*.test.ts`(`fake-indexeddb` を使い、`testUtils.ts` の `setupFreshDB()` で各テスト前にDBをリセットする)。E2Eでの実永続化の検証は `e2e/persistence.spec.ts`(リロード後もデータが残ること、データリセットで全ストアがクリアされることを確認)。
- `activeHouseholdId` / `onboardingCompleted` / `theme` / `language` / アカウント認証情報は今回のIndexedDB化の対象外で、引き続き `localStorage` に保存される。

## お薬手帳スキャン(クライアント側OCR)

- お薬手帳の写真からお薬を登録する「手帳スキャン」機能は、AI(Gemini)を呼ばずクライアント側のTesseract.js(OCR)のみで動く。公開アプリでAPI費用が青天井になるリスクを避けるための設計。飲み合わせチェック(`utils/interactionCheck.ts`)は引き続きGeminiを使う、このアプリで唯一のAI機能。
- `utils/ocrRecognize.ts` がTesseract.jsのラッパーで、`public/tesseract/` に自前ホストしたアセット(`worker.min.js` / `core/tesseract-core-simd-lstm.wasm.js` / `lang/jpn.traineddata`)を使う。デフォルトのCDN取得(jsdelivr)は使わない — Tailwindがビルド時コンパイルになっている理由と同じで、CDN依存はネットワーク制限のある環境(このリポジトリの開発サンドボックス含む)でE2Eテストを壊す。`corePath` はディレクトリではなく単一ファイルへのフルパスを渡すことで、SIMD/relaxed-SIMD判定による6種類のコアファイル自動選択を回避している。
- OEM(エンジンモード)はLSTM版(`1`)を使用。`jpn.traineddata` は `tesseract-ocr/tessdata_fast` から取得したLSTM対応データで、`gzip: false`(圧縮なしのファイルそのまま)。データとcoreファイルのLSTM対応有無が食い違うと "LSTM requested, but not present" で失敗するため、どちらかを差し替える場合は両方を揃えること。
- `utils/ocrParse.ts` が生のOCRテキストから正規表現でお薬の項目(名前・用量・単位・タイミング)を抽出する純粋関数。1枚の写真につき1件のドラフトとして扱い、AIと違って1枚の写真に複数のお薬が写っていても自動分割はしない(`CameraModal` のヒント文言で1枚1件を推奨)。用量・タイミングの両方を検出できなかった場合のみ、生のOCRテキストをmemoに残す。
- `ScanReviewModal` はドラフトの出所(AI/OCR)に依存しない作りなので、スキャン方式を変更してもこのコンポーネント自体は変更不要。

## その他

- `server/` はフロントエンドとは別プロセスで動く。ローカル開発の手順は README を参照。
- 服薬記録の追加・取り消しロジックは `utils/medicationActions.ts` に集約されている。カレンダー編集モード、通知/ショートカット経由のクイック記録など、複数の経路から呼ばれるので、ロジックを直接書き換えず既存のヘルパーを再利用すること。
