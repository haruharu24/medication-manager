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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key. Only needed for the AI drug-interaction check (設定 → 飲み合わせチェック) — お薬手帳スキャン (photo scan) runs entirely client-side via Tesseract.js OCR and doesn't call Gemini or need this key.
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
4. 同じ世帯に参加している端末同士は、服薬記録・お薬リスト・体調記録・履歴・バイタル記録・アレルギー既往歴・薬局病院連絡先(`medications` / `logs` / `globalLogs` / `conditions` / `vitals` / `medicalRecords` / `medicalContacts`)がサーバー経由でリアルタイムに同期される(WebSocket)。リマインダー時刻などの通知設定は端末ごとの個人設定のままで同期対象に含まれない。
5. 世帯を作成したユーザーは「オーナー」になり、招待コードで参加したメンバーはデフォルトで「編集者」(閲覧・書き込み両方可)になる。設定画面のメンバー一覧からオーナーが他のメンバーを「閲覧のみ」に変更でき、その場合はお薬の追加・編集メニューが非表示になり、サーバー側もそのメンバーからの書き込みリクエスト(PUT)を拒否する。権限の変更はWebSocketで即座に反映される。オーナーは他のメンバーに「オーナー権限を移譲」することもできる。
6. 未ログイン、または世帯未参加の場合は従来どおり端末内(localStorage)のみで動作する。
7. 設定画面の「アカウントを削除」から、パスワードの再入力と確認文字列の入力を経てアカウントを完全に削除できる。他のメンバーがいる世帯のオーナーは、先にオーナー権限を移譲してからでないと削除できない(削除しても他メンバーの共有データが失われないようにするため)。削除しても端末内のお薬データ自体は残る(アカウント無しの端末内利用にそのまま戻る)。

アカウント・世帯・同期データは `server/data/accounts.json` にJSONファイルとして保存される(git管理外)。パスワードは常にハッシュ化して保存する。本番運用する場合はデータベースへの置き換えとHTTPS必須化を推奨。

## 家族共有の月額課金(RevenueCat / Apple IAP)

家族共有(世帯の作成・参加・データ同期)は月額¥500のサブスクリプションで課金する。**お薬の追加・編集など通常のアプリ利用は、サブスクリプションの有無に関わらず常に無料。**

- 決済処理そのものはApple In-App Purchase(RevenueCat経由)が担い、`server/`はRevenueCatが送るWebhook(`POST /api/webhooks/revenuecat`)を受け取って`users[].subscriptionStatus`を更新するだけ。クライアントから送られてくる購入完了通知は一切信用せず、Webhookだけが唯一の書き込み経路(詳細は[CLAUDE.md](CLAUDE.md)を参照)。
- `server/.env` に `REVENUECAT_WEBHOOK_SECRET`(RevenueCatダッシュボードのWebhook設定と同じ値、生成方法は `.env.example` 参照)を設定する。未設定だとサーバーは起動時にエラーで終了する。
- フロントエンドの `.env.local` に `VITE_REVENUECAT_SDK_KEY`(RevenueCatの公開SDKキー)を設定する。ネイティブアプリ(iOS)からのみ使用され、ブラウザ/開発環境では安全に無視される。
- ネイティブアプリのビルド手順(Capacitor + Xcode)は次のセクションを参照。

## iOSネイティブアプリ化(Capacitor)

このリポジトリは[Capacitor](https://capacitorjs.com/)でビルド出力(`dist/`)をそのままiOSアプリにラップできる状態になっている。**iOSのビルド・署名・App Store提出にはmacOS + Xcodeが必要**で、このリポジトリのLinux開発環境では完結しない。Mac側で以下を行う:

1. Apple Developer Programに加入する($99/年)。
2. `capacitor.config.ts` の `appId` を、App Store Connectに登録した実際のBundle IDに置き換える(現状はプレースホルダ `com.example.medimate`)。
3. 本番用の環境変数(`VITE_PUSH_SERVER_URL` / `VITE_REVENUECAT_SDK_KEY`)を設定した状態で `npm install && npm run build` する。
4. `npx cap add ios` でiOSプロジェクトを生成し、`npx cap sync ios` でビルド済みの `dist/` を取り込む。
5. App Store Connectで自動更新サブスク商品(¥500/月)を作成し、Product IDを取得する。
6. RevenueCatダッシュボードでプロジェクトを作成し、App Store Connectと連携、Entitlement/Offeringを設定して公開SDKキーを取得する(→手順3に戻って再ビルド)。RevenueCatのWebhook URL(`https://<公開したserver/のURL>/api/webhooks/revenuecat`)と共有シークレットを設定し、`server/.env` の `REVENUECAT_WEBHOOK_SECRET` と一致させる。
7. `server/` をWebhookが届く公開URLへデプロイする。
8. `npx cap open ios` でXcodeを開き、署名(Team/Bundle ID)を設定してシミュレータまたはSandboxテスターアカウントで購入フローを確認し、審査に提出する。

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
