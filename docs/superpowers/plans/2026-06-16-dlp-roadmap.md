# AIまえチェック DLP Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** AIまえチェックを、paste前チェック中心の拡張から、ChatGPT / Claude / Gemini の通常入力体験を維持した送信前DLPレイヤーへ移行する。

**Architecture:** 既存monorepoを維持し、`packages/core`をサイト非依存のDLPエンジン、`packages/llm`をWebLLMによる文脈リスク候補チェック、`apps/extension`をサイトadapter・送信インターセプト・UI、`apps/demo`をLP兼体験デモとして分離する。サイドパネルや独自入力欄は作らず、対象サイトの通常入力欄を使う。

**Tech Stack:** TypeScript, pnpm workspace, React, WXT, Vite, Tailwind CSS, Vitest, Playwright, Chrome Extension Manifest V3, WebLLM, Web Worker, WebGPU, chrome.storage.local.

---

## 決定事項

- 初期対象サイトは ChatGPT / Claude / Gemini。Perplexityは後続adapterとして扱う。
- mediumは確認モーダルの詳細から素通し可能。high / critical とSecret Guard対象は安全化なしでは送信不可。
- Secret Guard対象は、APIキー、private key、SSH/PEM秘密鍵、JWT、`.env`、DATABASE_URL、AWS/GitHub/Slack/Stripe/OAuth token、webhook URL、クレカ風、マイナンバー風。
- WebLLMは文脈リスク候補チェックに限定する。失敗時は外部APIへfallbackせず、ルールベース検出は継続する。
- ユーザー入力文、検出結果、マスク対応表、送信履歴、ファイル本文は保存しない。保存してよいのは設定とWebLLMモデルキャッシュだけ。
- UIは送信時確認モーダル、カテゴリ別チェックボックス、詳細展開、変換モード選択、ファイル検査結果モーダルに限定する。常時表示のrisk badgeは貼り付け前チェックと意味が重なりやすいため表示しない。

## Issue分割

- #17 方針転換ロードマップ
- #18 core: risk score / policy / transform model
- #19 extension: site adapter / send interception
- #20 extension: paste guard / confirmation UI
- #21 extension: category confirmation modal
- #22 llm: WebLLM文脈チェック
- #92 refactor: 安全な依頼文生成機能を削除する
- #23 extension: text file preflight
- #24 demo/docs: LP兼デモとREADME更新

## 実装順序

### Task 1: Core DLPエンジン拡張 (#18)

**Files:**
- Modify: `packages/core/src/types.ts`
- Create: `packages/core/src/riskScore.ts`
- Create: `packages/core/src/policy.ts`
- Create: `packages/core/src/transform.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/riskScore.test.ts`
- Test: `packages/core/tests/transform.test.ts`

- [x] `RiskLevel`を`"critical" | "high" | "medium" | "low"`へ拡張し、UI表示用には別途`RiskDecisionLevel = "safe" | "low" | "medium" | "high" | "critical"`を追加する。
- [x] `DlpCategory`を`person | organization | address | email | phone | id | secret | financial | medical | legal | date | url | file | other`で定義する。
- [x] `RiskScoreResult`を追加する。

```ts
export interface RiskScoreResult {
  score: number;
  level: "safe" | "low" | "medium" | "high" | "critical";
  blocked: boolean;
  secretGuard: boolean;
  categoryCounts: Record<string, number>;
  reasons: string[];
}
```

- [x] `scoreRisk(findings, options)`を実装する。目安は secret +30、クレカ/マイナンバー +25、医療/法務/人事/金融文脈 +20、氏名+住所 +15、氏名+電話 +15、メール +10、顧客ID +10、ファイル +10、会社名 +5、日付 +5。
- [x] `level`は 0=safe、1-19=low、20-49=medium、50-79=high、80-100=critical とする。
- [x] Secret Guard対象が含まれる場合は`secretGuard=true`、原則`blocked=true`にする。
- [x] `TransformMode = "mask" | "generalize"`を追加する。
- [x] `transformText(input, findings, mode)`を追加する。`mask`は既存`maskSensitiveText`を使い、`generalize`はルールカテゴリ別の固定表現へ置換する。`minimize`はsafe_prompt生成と一緒に削除した。
- [x] 既存の`detectSensitiveText`、`maskSensitiveText`、`mergeFindings`の公開APIを壊さない。
- [x] `pnpm test:core`、`pnpm typecheck`を通す。

### Task 2: Adapter / Send Interception基盤 (#19)

**Files:**
- Replace/Modify: `apps/extension/entrypoints/content.ts`
- Create: `apps/extension/src/content/adapters/baseAdapter.ts`
- Create: `apps/extension/src/content/adapters/chatgptAdapter.ts`
- Create: `apps/extension/src/content/adapters/claudeAdapter.ts`
- Create: `apps/extension/src/content/adapters/geminiAdapter.ts`
- Create: `apps/extension/src/content/dom/editorLocator.ts`
- Create: `apps/extension/src/content/dom/sendInterceptor.ts`
- Modify: `apps/extension/src/lib/sites.ts`
- Test: `apps/extension/tests/sendInterceptor.test.ts`

- [x] `SiteAdapter`を定義する。

```ts
export interface SiteAdapter {
  id: "chatgpt" | "claude" | "gemini";
  findEditor(root: ParentNode): EditableTarget | null;
  findSendButton(root: ParentNode): HTMLElement | null;
  isSendKeyboardEvent(event: KeyboardEvent): boolean;
  readText(editor: EditableTarget): string;
  replaceText(editor: EditableTarget, text: string): void;
  submit(editor: EditableTarget): void;
}
```

- [x] ChatGPT adapterを先行実装する。Claude/Geminiは実セレクタ候補とfallbackを持つ雛形まで作る。
- [x] `targetSites`からPerplexityを初期対象として外す。READMEでは後続adapterとして扱う。
- [x] `MutationObserver`でeditor / send buttonの差し替えを追跡する。
- [x] 送信ボタンclick、Enter、Cmd+Enter / Ctrl+Enterを捕捉し、一度`preventDefault()`してDLPチェックへ渡す。
- [x] 変換後テキストで入力欄を置換し、`input`イベントを発火してから元の送信操作を再実行する。
- [x] 再実行時に再度interceptしないよう、1回限りの`bypassNextSubmit`フラグをadapter単位で持つ。
- [x] リスクなしならUIなしで送信する。
- [x] `pnpm build:extension`、`pnpm typecheck`を通す。

### Task 3: Paste Guard / Confirmation UI (#20)

**Files:**
- Create: `apps/extension/src/content/dom/pasteGuard.ts`
- Modify: `apps/extension/src/lib/modal.ts`
- Test: `apps/extension/tests/pasteGuard.test.ts`

- [x] 入力中は軽量検出だけを行い、モーダルは出さない。
- [x] 右下固定のrisk badgeは削除し、貼り付け前/送信前の確認モーダルへ判断UIを集約する。
- [x] paste内容にSecret Guard対象が含まれる場合、可能な限り`preventDefault()`して生データを入力欄に入れない。
- [x] high/critical paste UIは「安全化して貼り付け」「キャンセル」のみにする。
- [x] medium以下のpasteは必要に応じて既存の確認モーダルに流せるが、デフォルトで「そのまま入力」を強調しない。
- [x] ユーザー本文や検出文字列を`console.log`しない。
- [x] `pnpm build:extension`、`pnpm typecheck`を通す。

### Task 4: 送信時確認モーダル刷新 (#21)

**Files:**
- Replace/Modify: `apps/extension/src/lib/modal.ts`
- Create: `apps/extension/src/ui/confirmModal.ts`
- Create: `apps/extension/src/ui/styles.ts`
- Test: `apps/extension/tests/confirmModal.test.ts`

- [x] 既存の個別Finding一覧中心UIを、カテゴリ単位のチェックボックス中心UIへ変更する。
- [x] 初期表示はカテゴリ、件数、変換後の代表プレースホルダーだけを表示する。
- [x] 個別文字列は「詳細を開く」で表示する。
- [x] 変換方法は`抽象化 / マスク / 最小化`のラジオボタンにする。初期値は設定のdefaultTransformModeを使う。
- [x] `安全化して送信`、`編集`、`キャンセル`を表示する。
- [x] mediumは詳細から素通し許可可能にする。high/criticalとSecret Guard対象は安全化なしでは送信不可。
- [x] Secret Guard対象はカテゴリチェックを外せないか、外す操作を無効表示にする。
- [x] Shadow DOMを維持し、対象ページCSSとの衝突を避ける。
- [x] `pnpm build:extension`、`pnpm typecheck`を通す。

### Task 5: WebLLM文脈チェック (#22 / #92)

**Files:**
- Modify: `packages/llm/src/types.ts`
- Modify: `packages/llm/src/analyzer.ts`
- Modify: `packages/llm/src/index.ts`
- Modify: `packages/llm/src/prompt.ts`
- Test: `packages/llm/tests/llm.test.ts`

- [x] WebLLM内部指示は日本語プロンプトをベースにし、文脈リスク候補のJSONだけを返すようにする。
- [x] `ContextRiskCandidate`をFindingへ変換し、ユーザーがマスク対象に含めるか確認できるようにする。
- [x] 不正JSON時は本文を含めず、既存の日本語エラー分類へ流す。
- [x] 敬称つき人名、候補者名、Project形式の案件名をローカル補助候補として追加する。
- [x] safe_prompt生成、Minimize、依頼文自動生成UIは精度不足のため削除する。
- [x] WebGPU非対応、QuotaExceeded、OOM、Worker失敗時も外部APIへfallbackしない。
- [x] `pnpm test:llm`、`pnpm typecheck`を通す。

### Task 6: ファイル添付前チェック (#23)

**Files:**
- Create: `apps/extension/src/content/dom/fileInterceptor.ts`
- Create: `apps/extension/src/ui/fileModal.ts`
- Create: `packages/core/src/fileText.ts`
- Test: `packages/core/tests/fileText.test.ts`
- Test: `apps/extension/tests/fileInterceptor.test.ts`

- [x] 対応拡張子は `.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.yml`, `.env`, `.log`, `.js`, `.ts`, `.py`, `.go`, `.rb`, `.java`, `.html`, `.xml` とする。
- [x] PDF、docx、xlsx、画像OCRは対象外として明示する。
- [x] `input[type=file]`のchangeとadapterの添付ボタン周辺操作を検出する。
- [x] 対応ファイルはローカルで`File.text()`により読み取り、本文を保存しない。
- [x] risk scoreを算出し、安全なら添付を許可、危険ならモーダルで「安全版を作成」「添付をキャンセル」を表示する。
- [x] MVPでは安全版作成はテキストファイルのsecret removal / mask版Blob生成までに限定する。
- [x] `pnpm test:core`、`pnpm build:extension`を通す。

### Task 7: Demo / README更新 (#24)

**Files:**
- Modify: `apps/demo/src/App.tsx`
- Modify: `apps/demo/src/components/*`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Test: `apps/demo/tests/demo.spec.ts`

- [x] LPコピーを「AIに送る前」から「LLMに送信される前に検出・安全化」へ寄せる。
- [x] デモはrisk score、カテゴリ単位チェック、Mask / Generalize、安全化後テキストを体験できる構成にする。
- [x] WebLLMモデルファイル取得、private browserでの保存容量制限、WebGPU非対応時の挙動をREADMEに明記する。
- [x] 「完全に安全」「ゼロリスク」「生データが対象サイトに一切見えない」といった表現を避ける。
- [x] Perplexityは後続adapterであることをREADMEに記載する。
- [x] `pnpm test:e2e`、`pnpm build:demo`を通す。

## 横断テスト計画

- Core: `pnpm test:core`
  - Secret Guard対象がcriticalまたはblockedになる
  - mediumの個人情報は確認対象になる
  - Mask / Generalizeが検出範囲の重複を壊さない
- LLM: `pnpm test:llm`
  - 文脈リスク候補JSONをパースできる
  - 不正JSONで本文を含まないエラーになる
  - safe_prompt生成APIが公開されていない
- Extension: `pnpm build:extension`, `pnpm typecheck`
  - ChatGPT送信ボタンclickを止められる
  - Enter送信を止められる
  - bypassNextSubmitで無限ループしない
  - Secret Guard pasteをpreventDefaultできる
- Demo: `pnpm test:e2e`, `pnpm build:demo`
  - サンプル文からrisk scoreを表示できる
  - 変換モードを切り替えられる
  - 安全化後テキストを表示できる
- Full: `pnpm test`, `pnpm typecheck`, `pnpm build`

## GitHub運用

- 各Issueは独立ブランチで実装する。
- すべてのPRは、実装、テスト、ビルド結果をPR本文に記録する。
- 仕様変更やUI文言変更だけでもPRを作成する。
- public repo前提のため、Issue / PR / README / テストデータに実在の個人情報、実APIキー、実トークンを入れない。

## 実装しないこと

- サイドパネル
- チャット入力欄に重ねる独自入力UI
- 外部LLM API fallback
- telemetry / analytics / Sentry
- ユーザー入力、検出結果、マスク対応表、送信履歴の保存
- PDF / docx / xlsx / 画像OCRのMVP対応
- Perplexityの初期adapter対応
