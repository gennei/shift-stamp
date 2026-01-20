# ShiftStamp 実装計画（Codex向け）

目的：PWAで「年月を指定 → 1日〜月末の各日を 早番/中番/遅番/休み から選択 → Google Calendarに一括同期」できるアプリを作る。

---

## 1. 要件・仕様

### 1.1 シフト定義（固定）
- 早番：09:00–17:00
- 中番：12:00–20:00
- 遅番：14:00–22:00
- 休み：イベント作成なし（既存のアプリ作成イベントがあれば削除）

タイムゾーン：`Asia/Tokyo`

### 1.2 画面要件（MVP）
- 年月選択（例：`<input type="month">`）
- 月の各日（1日〜月末）を一覧で表示
- 各日ごとに4択：`早番 / 中番 / 遅番 / 休み`
- 操作ボタン
  - `同期（Google Calendarへ反映）`
  - （任意）`プレビュー（追加/更新/削除件数）`
  - （任意）`全日休み`、`平日早番/土日休み` などの一括入力

### 1.3 カレンダー書き込み方針
- 書き込み対象は `calendarId`（デフォルトは `primary`）
- 将来の事故防止のため「アプリが作ったイベント」を識別できるようにする
  - Event に `extendedProperties.private` を付与：
    - `shiftPwa = "v1"`（アプリ識別子）
    - `shiftDate = "YYYY-MM-DD"`（対象日）
    - `shiftType = "EARLY|MIDDLE|LATE"`（種別）

---

## 2. 技術選定（推奨）

### 2.1 フロント
- PWA（Vite）
- UI：Vanilla/Reactどちらでも可（MVPはVanillaが軽い）

### 2.2 認証
- Google Identity Services (GIS) の Token Model
- Scope（最小）：`https://www.googleapis.com/auth/calendar.events`
- トークン取得は「同期ボタン押下」などユーザー操作のタイミングで行う（ポップアップ/許可画面が必要なため）

### 2.3 API
- Google Calendar API v3（REST）
  - `Events.list`（対象月のアプリ作成イベント取得）
  - `Events.insert`（新規作成）
  - `Events.patch`（更新）
  - `Events.delete`（削除）

---

## 3. リポジトリ構成（例）

```
shift-stamp/
  index.html
  vite.config.ts
  package.json
  public/
    manifest.webmanifest
    icons/
  src/
    main.ts
    ui.ts
    storage.ts
    auth.ts
    gcal.ts
    sync.ts
    shift.ts
```

---

## 4. データ設計

### 4.1 ローカル保存（localStorage）
- Key: `shift-plan:YYYY-MM`
- Value: JSON
  - `{ "YYYY-MM-DD": "OFF|EARLY|MIDDLE|LATE", ... }`

### 4.2 イベント生成ルール
- `summary`：`早番` / `中番` / `遅番`（任意で `勤務:早番` などでも可）
- `start.dateTime` / `end.dateTime`：`YYYY-MM-DDTHH:MM:SS+09:00`
- `timeZone`：`Asia/Tokyo`
- `extendedProperties.private`：前述の識別情報を必ず付与

---

## 5. 同期処理（コアロジック）

### 5.1 同期の流れ
1. 対象年月 `ym = YYYY-MM` を取得
2. localStorage から `plan` を取得（なければ全日 OFF とみなす）
3. `timeMin` / `timeMax` を計算（対象月の範囲）
4. `Events.list` で対象月のイベントを取得  
   - クエリに `privateExtendedProperty=shiftPwa=v1` を付けて「アプリ作成分」だけ取得
5. 既存イベントを `shiftDate` で Map 化（date -> event）
6. 1日〜月末を走査し、各日を差分反映
   - desired=OFF：
     - 既存イベントがあれば `Events.delete`
   - desired=EARLY/MIDDLE/LATE：
     - 既存があれば `Events.patch`（summary + start/end + shiftType を更新）
     - 既存がなければ `Events.insert`

### 5.2 失敗時の方針
- 1件でも失敗したら処理を止める（MVP）
- どの日で失敗したかを画面に表示する
- （任意）リトライや部分成功も検討（将来）

### 5.3 レート・クォータ対策（MVPでは簡易）
- 月最大31日なので逐次実行でもOK
- ただし連続リクエストで失敗する可能性があるため、必要なら 100〜200ms の小休止を入れる

---

## 6. UI 実装計画

### 6.1 画面構成
- Header：アプリ名 + 設定（calendarId）
- 年月セレクタ：`<input type="month">`
- 日付リスト：
  - `YYYY-MM-DD (曜)` + 4択（radio/segmented）
- Footer：
  - `保存`（入力→localStorage）
  - `同期`（Googleログイン→Calendar反映）
  - （任意）`プレビュー`（差分件数）

### 6.2 UX（任意で追加）
- 一括入力：平日/土日テンプレ
- 週コピー：先週と同じ
- ドラッグ塗り（後回し可）

---

## 7. 認証・設定手順（開発者作業）

1. Google Cloud プロジェクト作成
2. Google Calendar API 有効化
3. OAuth 同意画面設定（テストユーザーに自分を追加）
4. OAuth Client ID（Web）作成
   - Authorized JavaScript origins：
     - 開発：`http://localhost:5173`
     - 本番：`https://<your-domain>`
5. アプリ側に `CLIENT_ID` を設定（環境変数 or 設定ファイル）

---

## 8. 実装タスク分解（Codexに投げる単位）

### Phase 1: 雛形
- [ ] Vite プロジェクト作成（TS）
- [ ] PWA manifest + アイコン追加（最低限）
- [ ] 画面の骨格（年月選択 + 日付リスト + 同期ボタン）

### Phase 2: ローカル保存
- [ ] 対象月の日付配列生成（1日〜月末）
- [ ] plan の読み書き（localStorage）
- [ ] UI操作 → plan 更新 → 保存/復元

### Phase 3: Google 認証（GIS）
- [ ] `index.html` に GIS script を追加
- [ ] `initTokenClient` と `requestAccessToken()` 実装
- [ ] 「同期」クリックでトークン取得できることを確認

### Phase 4: Calendar API
- [ ] `Events.list` 実装（timeMin/timeMax + privateExtendedProperty）
- [ ] `Events.insert/patch/delete` 実装（Bearer token）
- [ ] 1日分の insert ができることを確認

### Phase 5: 月次同期（差分反映）
- [ ] 既存イベントを `shiftDate` で Map 化
- [ ] OFF/勤務の分岐で delete/patch/insert を実行
- [ ] 実行結果（追加/更新/削除）を画面表示

### Phase 6: 仕上げ
- [ ] エラー表示（どの日の処理で失敗したか）
- [ ] calendarId 設定（primary / 任意文字列入力）
- [ ] デプロイ（Cloudflare Pages / GitHub Pages など）

---

## 9. 受け入れ条件（Doneの定義）
- 任意の年月を選び、各日を 早番/中番/遅番/休み で設定できる
- `同期` を押すと Google Calendar にイベントが作成される
- 同じ月で再同期すると、アプリが作ったイベントだけが更新/削除される（重複しない）
- 休みにした日はイベントが残らない
- タイムゾーンが日本時間で正しい（09:00/12:00/14:00開始になる）

---

## 10. 将来拡張アイデア（MVP後）
- 専用カレンダーをアプリから作成・選択
- 祝日表示
- ドラッグ塗り、週テンプレ、勤務パターン保存
- オフライン編集→オンライン時にまとめて同期
- バッチリトライ・部分成功
