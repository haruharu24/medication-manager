<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3483c948-33d1-401c-9131-7ef5075be2cd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`

   Styling is compiled at build time with Tailwind CSS (`tailwind.config.js` / `postcss.config.js` / `index.css`) rather than loaded from a CDN, so the app has no external runtime dependency for its UI framework and renders identically offline or in network-restricted CI.
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional, for the "服薬時間になったらプッシュ通知" reminder) Set `VITE_PUSH_SERVER_URL` in `.env.local` to point at the push server below. Defaults to `http://localhost:8787`.
4. Run the app:
   `npm run dev`

## プッシュ通知サーバー (`server/`)

アプリを完全に閉じていても服薬リマインダーが届くように、`server/` に Web Push 用の小さな Express サーバーを用意しています。フロントエンドとは別プロセスで動かします。

1. VAPID鍵を生成:
   ```
   cd server
   npm install
   npm run generate-vapid
   ```
2. `server/.env.example` を `server/.env` にコピーし、生成した `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` を貼り付ける。`CORS_ORIGIN` はフロントエンドのURL(開発時は `http://localhost:3000`)、`PUBLIC_SERVER_URL` はこのサーバー自身の外部URLに合わせて設定する。
   また `JWT_SECRET` に以下で生成したランダムな文字列を設定する(家族共有ログインのセッション署名に使用):
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. サーバーを起動:
   ```
   npm start
   ```
4. フロントエンド側の `.env.local` に `VITE_PUSH_SERVER_URL=http://localhost:8787`(サーバーの実際のURL)を設定してからアプリを起動する。
5. アプリの「設定」画面で「強制リマインド」をONにすると、通知の許可を求められたのちサーバーに購読情報が登録され、指定時刻に毎日プッシュ通知が届くようになる。通知の「飲んだ」ボタンからアプリを開かずそのまま記録できる。
6. さらに、お薬ごとの編集画面で「通知」欄に時刻を設定すると、そのお薬専用のリマインダーも同じ購読に追加され、指定した時刻にそのお薬の名前入りで個別に通知が届く(「飲んだ」を押すとそのお薬だけが記録される)。1つの端末で複数のお薬の通知時刻を設定しても、それぞれ独立して届く。

購読データは `server/data/subscriptions.json` にJSONファイルとして保存される(git管理外)。本番運用する場合はデータベースへの置き換えを推奨。

## 家族/介護者との共有(アカウント・世帯同期)

同じ `server/` がアカウント登録・ログインと「世帯」単位のデータ同期も兼ねる。

1. 設定画面の「家族と共有」からメールアドレス・パスワードでアカウントを作成(または既存アカウントでログイン)。
2. 「新しい世帯を作る」で世帯を作成すると、招待コード(8桁の英数字)が発行される。
3. 家族側の端末で同じサーバーにアカウント登録し、発行された招待コードで「招待コードで参加」する。
4. 同じ世帯に参加している端末同士は、服薬記録・お薬リスト・体調記録・履歴(services `medications` / `logs` / `globalLogs` / `conditions`)がサーバー経由でリアルタイムに同期される(WebSocket)。リマインダー時刻などの通知設定は端末ごとの個人設定のままで同期対象に含まれない。
5. 未ログイン、または世帯未参加の場合は従来どおり端末内(localStorage)のみで動作する。

アカウント・世帯・同期データは `server/data/accounts.json` にJSONファイルとして保存される(git管理外)。パスワードは常にハッシュ化して保存する。本番運用する場合はデータベースへの置き換えとHTTPS必須化を推奨。

## オフライン対応

Service Worker(`public/sw.js`)がアプリ本体(HTML/JS/CSS/アイコン)をキャッシュし、電波が届かない場所でもアプリを開いてこれまでの記録を確認できる。ビルド出力のファイル名はVite側でハッシュ化されるため事前に列挙せず、初回オンライン時のアクセスで動的にキャッシュしていく方式(cache-first + バックグラウンド更新)。プッシュサーバーへのAPIリクエストなど他オリジンへの通信はキャッシュ対象外。

## 多言語対応

設定画面から日本語/英語を切り替えられる(`localStorage` に保存され次回起動時も維持される)。ナビゲーション・設定画面・ホーム/お薬画面のヘッダーやメニュー・初回オンボーディングは翻訳済み。お薬の登録フォームやレポート画面など一部はまだ日本語のみ(詳細・拡張方法は [CLAUDE.md](CLAUDE.md) を参照)。

## テスト

```
npm install
npm test              # ユニット・結合テスト(Vitest) — utils/, components/, server/ を1回実行
npm run test:watch    # 上記をwatchモードで実行
npm run test:e2e      # Playwright E2Eテスト。フロントエンド・バックエンドを自動起動する(初回は `npm --prefix server install` が必要)
npm run test:a11y     # @axe-core/playwright によるアクセシビリティテストのみ実行
npm run test:all      # test + test:e2e をまとめて実行
```

`e2e/` 配下のテストは `playwright.config.ts` の `webServer` 設定でフロントエンド(Vite)とバックエンド(`server/index.js`)を自動起動するため、事前に手動でサーバーを立ち上げておく必要はない。CI (`.github/workflows/test.yml`) では push / PR ごとに型チェック・ビルド・全テストが実行される。

機能追加時のテスト方針は [CLAUDE.md](CLAUDE.md) を参照。
