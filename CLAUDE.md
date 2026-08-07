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

## その他

- `server/` はフロントエンドとは別プロセスで動く。ローカル開発の手順は README を参照。
- 服薬記録の追加・取り消しロジックは `utils/medicationActions.ts` に集約されている。カレンダー編集モード、通知/ショートカット経由のクイック記録など、複数の経路から呼ばれるので、ロジックを直接書き換えず既存のヘルパーを再利用すること。
