# 公開サイト・デモ・拡張UI再構築設計

## 目的

AIまえチェックの公開サイトと拡張UIを、公開済み0.1.2の挙動とURLを維持しながら段階的に再構築します。

公開サイトはChrome拡張の導入を支える説明ページであり、本体ではありません。説明だけのページへ大きなJavaScriptを配信せず、操作が必要なミニデモだけをReactで動かします。

## 採用する構成

```text
apps/site
├─ index.html                 LP。静的HTML主体
├─ privacy/index.html         プライバシーポリシー。静的HTML
├─ support/index.html         サポート。静的HTML
├─ 404.html                   GitHub Pages用404
├─ public/                    favicon、OGP、manifestなど
└─ src
   ├─ demo/                   ミニデモのReact island
   ├─ ui/                     React Ariaベースの操作部品
   ├─ styles/                 サイトCSSとトークン接続
   └─ demo.tsx                #demo-rootだけをマウント

packages
├─ core                       ルール検出・安全化・ポリシー
├─ llm                        文脈リスク候補・WebLLM
└─ design-tokens              UI非依存のCSS変数
```

## 技術選定

- Vite MPA
- 静的HTML
- React 19
- React Aria Components
- React Aria Componentsを包むローカルUIコンポーネント
- Tailwind CSS 4（CSS-first設定）
- Vitest
- Playwright
- GitHub Pages

React Spectrumは採用しません。Adobeの完成済みテーマではなく、挙動とアクセシビリティを提供するReact Aria Componentsを使います。

Radix UIは新規採用しません。既存の動作を一度に置き換えず、React AriaのButton、Checkbox、RadioGroupから段階的に移行します。

## HTMLとReactの境界

### 静的HTMLにする領域

- ヘッダーとナビゲーション
- ヒーロー
- 拡張機能の説明
- 検出対象
- 仕組み
- 技術構成
- プライバシー説明
- インストール導線
- フッター
- privacyページ
- supportページ

### Reactで動かす領域

- DemoWorkbench
- ルール検出操作
- 検出候補の選択
- 安全化後プレビュー
- AI文脈チェック
- コピー、リセット、進捗、エラー表示

Reactを読み込まない状態でも、LPの説明、導入導線、privacy、supportを読めることを必須とします。

WebLLMの共有型・表示用ロジックは`@ai-mae-check/llm`から参照します。モデル実行系は`@ai-mae-check/llm/runtime`へ分離し、DemoWorkbenchでAI文脈チェックを明示操作した時だけdynamic importします。初期表示とルール検出ではruntimeおよびWorkerを取得しません。

## Vite MPA

次のHTMLを明示的なビルドエントリーにします。

- `apps/site/index.html`
- `apps/site/privacy/index.html`
- `apps/site/support/index.html`

`App.tsx`で`window.location.pathname`を判定する現在のルーティングは廃止します。`siteRoutes.ts`とビルド後に`index.html`を複製する処理も廃止します。

共通ヘッダーとフッターは小さい範囲に限定して各HTMLへ置き、QAでリンク、文言、公開URLの同期を検証します。独自テンプレートエンジンは作りません。

## 公開URL

- LP: `https://shunya-mabuchi.github.io/ai-mae-check/`
- プライバシー: `https://shunya-mabuchi.github.io/ai-mae-check/privacy/`
- サポート: `https://shunya-mabuchi.github.io/ai-mae-check/support/`
- 署名付きルール: `https://shunya-mabuchi.github.io/ai-mae-check/rules/latest.json`

追加ルールは`/rules/latest.json`から取得します。署名、`keyId`、公開鍵の検証契約は変更しません。

## React Ariaの採用範囲

React Ariaを使うもの:

- Button
- Checkbox
- Switch
- RadioGroup
- ProgressBar
- Meter
- Disclosure
- Tooltip
- Modal / Dialog

通常のHTMLとCSSを優先するもの:

- LPのリンク
- Card
- Badge
- Alert
- セクション
- リスク表示の外枠
- 静的な説明リスト

React Aria Componentsの低レベルhookは、Components APIで実現できない要件がある場合だけ使います。

## UIコンポーネント方針

完成済みテーマやコンポーネント集は導入せず、React Aria Componentsの操作部品を薄いローカルコンポーネントで包みます。必要な部品だけをソース管理し、見た目はAIまえチェックのデザイントークンへ接続します。

静的LPをReact化する目的には使いません。CardやBadgeを機械的に増やさず、操作と状態表現に必要な部品だけを採用します。

## デザイントークン

`@ai-mae-check/design-tokens`はReactへ依存せず、サイトと拡張の双方から利用できるCSS変数だけを提供します。

- 背景、面、境界、本文、補助文
- primary、informational
- critical、high、medium、low
- focus ring
- 余白
- 角丸
- 影
- 文字サイズと行間

拡張ではShadow Root内へトークンCSSを明示的に読み込みます。対象サイト側のCSS変数には依存しません。

## DemoWorkbenchの状態管理

複数の`useState`を`useReducer`へまとめ、次のイベントを明示します。

- 本文変更
- サンプル挿入
- ルール検出開始・完了
- AI文脈チェック開始・進捗・完了・失敗
- ルール候補選択
- AI候補選択
- コピー完了
- リセット

`useDemoWorkbench`は画面向けのFacadeとして残します。Reducer、Action、純粋な変換処理にはユニットテストを書きます。

## WebLLMのロード境界

`@ai-mae-check/llm`を次の責務へ分割します。

- `@ai-mae-check/llm/shared`: 型、候補変換、プロンプト、JSON処理、エラー分類
- `@ai-mae-check/llm/runtime`: WebGPU、WebLLMライフサイクル、Runtime Service
- `@ai-mae-check/llm/worker`: Workerエントリー

初期ページとルール検出では`runtime`とWorkerを取得しません。ユーザーがAI文脈チェックを実行したときだけ動的importします。

受け入れ条件:

- 初期表示時のWebLLM runtimeリクエストが0件
- ルール検出時のWebLLM runtimeリクエストが0件
- AI文脈チェック実行後にだけruntimeとWorkerを取得
- 初期サイトJSはgzip 120 KiB以下を目標とする
- content scriptはgzip 40 KiB以下を目標とする
- optionsはReact Ariaの操作部品を含めてgzip 100 KiB以下を目標とする
- 未使用のWebLLM Worker複製を拡張成果物へ出力しない

## 拡張機能の段階移行

1. Options PageのButtonとCheckbox
2. Options PageのRadioGroup
3. ファイル確認モーダルでShadow DOM内Modalを実証
4. 貼り付け確認モーダル
5. 送信前確認モーダル

Options PageのButton、Checkbox、RadioGroup、RadioはReact Aria Componentsへ移行済みです。設定値と`chrome.storage.local`の保存形式は変更せず、Space、矢印キー、Enterによる操作と再読み込み後の永続化を拡張E2Eで確認します。

ファイル確認モーダルはReact Ariaの制御型Modal / Dialogへ移行済みです。Shadow Root内にReact rootと専用Portalコンテナを作り、リスクファイルを選択したときだけ拡張パッケージ内の`file-modal-runtime.js`を読み込みます。通常の貼り付け・送信処理へReact Ariaのランタイムを含めないため、content scriptの初期サイズを維持できます。

貼り付け確認モーダルもReact Ariaの制御型Modal / Dialogへ移行済みです。DLP判定、選択、安全化、WebLLM実行制御は`pasteReviewModalController.ts`へ分離し、Reactコンポーネントは表示と閉じるライフサイクルを担当します。注意対象を貼り付けたときだけ、拡張パッケージ内の`review-modal-runtime.js`を読み込みます。WebLLM処理中に画面を閉じた場合は、遅れて返る進捗・候補・エラーを表示へ反映しません。

送信前確認モーダルもReact Ariaの制御型Modal / Dialogへ移行済みです。カテゴリ選択、プレビュー生成、WebLLM実行制御は`confirmModalController.ts`へ分離し、貼り付け確認と同じ`review-modal-runtime.js`から必要時だけ読み込みます。高リスクと中リスクが混在する場合は、coreの`requiredFindingIds`に含まれるカテゴリだけを固定し、任意カテゴリはユーザーが安全化対象から外せます。

呼び出し側の命令型Promise API、決定値、DLPポリシーは変更しません。React rootのunmount時を含め、Promiseを一度だけ解決します。モーダルの読込または描画に失敗した場合は、元の送信をキャンセルし、日本語の復旧メッセージを表示します。本文はエラーやログに含めません。

Modal導入時はShadow Root内に専用Portalコンテナを作り、次をE2Eで確認します。

- 対象サイトの`body`へOverlayが漏れない
- 初期フォーカス
- Tab循環
- Escapeで一度だけキャンセル
- 元の入力欄へのフォーカス復帰
- 背景スクロール抑止
- モーダル内部のスクロール
- backdrop操作
- z-index

React Ariaへ移行したモーダルでは、旧`setupDialogAccessibility`によるfocus trap、Escape、backdrop管理を併用しません。標準の管理はReact Ariaへ集約します。ただしChromeではShadow DOM境界でTab循環がページ側へ抜ける場合があるため、境界のTab / Shift+Tabだけを`shadowDialogTabContainment.ts`で補完します。また、Shadow DOM内のfocus要素を除去した後もhostが`activeElement`に残り、React Aria 3.51の復帰判定が動かない場合があります。そのため、ファイル確認、貼り付け確認、送信前確認の命令型Promise境界に限り、標準復帰後も`body`のままだった場合だけ元の操作要素へfocusを戻します。

貼り付け確認では、textarea、contenteditable、Lexical風DOM、ProseMirror風DOMの安全化入力に加え、390px幅の長文、Escape、backdrop、スクロール復帰、高リスク情報の生貼り付け禁止を拡張E2Eで確認します。

送信前確認では、送信ボタンとEnter系操作、安全化後の再送信、390px幅の長文、Escape、backdrop、スクロール復帰、高リスクと中リスクが混在する場合のカテゴリ固定範囲を拡張E2Eで確認します。

## 移行原則

- 公開済み0.1.2のURLと検出動作を壊さない
- 一つのPRで構造移行とTailwind 4移行を混ぜない
- 一つのPRで構造移行とBiome導入を混ぜない
- DLP判定とUI置換を同時に変更しない
- WebLLM失敗時もルール検出を維持する
- ユーザー本文を保存、ログ出力、外部LLM API送信しない
- 過去リリース文書は履歴として原則書き換えない

## 完了確認

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm qa:github-pages`
- `pnpm qa:extension:size`
- `pnpm test:e2e`
- `pnpm test:extension:e2e`
- 1440pxと390pxのサイトスクリーンショット比較
- ChatGPT、Claude、Geminiでの手動確認
