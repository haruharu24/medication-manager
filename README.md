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
3. サーバーを起動:
   ```
   npm start
   ```
4. フロントエンド側の `.env.local` に `VITE_PUSH_SERVER_URL=http://localhost:8787`(サーバーの実際のURL)を設定してからアプリを起動する。
5. アプリの「設定」画面で「強制リマインド」をONにすると、通知の許可を求められたのちサーバーに購読情報が登録され、指定時刻に毎日プッシュ通知が届くようになる。通知の「飲んだ」ボタンからアプリを開かずそのまま記録できる。

購読データは `server/data/subscriptions.json` にJSONファイルとして保存される(git管理外)。本番運用する場合はデータベースへの置き換えを推奨。
