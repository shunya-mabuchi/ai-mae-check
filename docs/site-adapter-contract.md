# SiteAdapter契約とE2E確認項目

最終更新日: 2026-06-24

この文書は、AIまえチェックのChrome拡張で ChatGPT / Claude / Gemini / Perplexity を継続的に保守するためのSiteAdapter契約と、サイト別確認項目を定義します。

AIまえチェックでは、DLP判定、マスキング、安全化、policy判定は共通ロジックとして扱います。対象サイトごとに変わるDOM探索、送信ボタン検出、入力欄の読み取り・置換、送信操作の再実行はSiteAdapterの責務として扱います。

対象サイトを増やす場合も、`<all_urls>` に頼らず、必要なhost permissionだけを追加します。

## 現在の実装位置

- adapter契約: `apps/extension/src/content/adapters/baseAdapter.ts`
- ChatGPT adapter: `apps/extension/src/content/adapters/chatgptAdapter.ts`
- Claude adapter: `apps/extension/src/content/adapters/claudeAdapter.ts`
- Gemini adapter: `apps/extension/src/content/adapters/geminiAdapter.ts`
- Perplexity adapter: `apps/extension/src/content/adapters/perplexityAdapter.ts`
- hostnameからadapterを選ぶ処理: `apps/extension/src/content/adapters/index.ts`
- 送信前intercept: `apps/extension/src/content/dom/sendInterceptor.ts`
- paste時の共通editable処理: `apps/extension/src/lib/dom.ts`
- 送信前の共通DLP判定: `apps/extension/src/content/contentReview.ts`
- 対象サイト定義とOptions Page設定: `apps/extension/src/lib/sites.ts`

## SiteAdapterの責務

現行の `SiteAdapter` は次の契約を持ちます。

```ts
export interface SiteAdapter {
  id: "chatgpt" | "claude" | "gemini" | "perplexity";
  findEditor(root: ParentNode): EditableTarget | null;
  findSendButton(root: ParentNode): HTMLElement | null;
  isSendKeyboardEvent(event: KeyboardEvent): boolean;
  readText(editor: EditableTarget): string;
  replaceText(editor: EditableTarget, text: string): void;
  submit(editor: EditableTarget): void;
}
```

各メソッドの責務:

- `id`: 対象サイトを識別します。Options Pageのサイト設定や診断情報と混同しないよう、安定したIDにします。
- `findEditor`: 対象サイトの通常入力欄だけを返します。password / email / tel / number / credit card系input、disabled / readonly、非表示要素は対象外にします。
- `findSendButton`: クリック送信に使う送信ボタンを返します。disabledまたは `aria-disabled="true"` のボタンは対象外にします。
- `isSendKeyboardEvent`: 送信扱いにするキー操作だけを `true` にします。現行の共通実装では通常Enterを送信、Shift+Enter、Alt+Enter、IME変換中は除外します。
- `readText`: 現在の下書き本文を読み取ります。本文を永続保存したりログ出力したりしません。
- `replaceText`: 安全化後の本文で下書き全体を置換します。React系UIが変更を認識しやすいように `input` イベントを発火します。
- `submit`: 安全化後に送信を再実行します。送信ボタンがあればclickし、見つからない場合はキーボードfallbackを使います。

SiteAdapterが行わないこと:

- DLP判定の実装
- risk scoreやpolicy判定
- WebLLM文脈チェック
- モーダルUIの表示
- `chrome.storage.local` への保存
- ユーザー本文、検出結果、placeholderMapの永続保存
- 対象サイト外のDOM探索

## 共通DLP処理との境界

送信前確認の流れ:

1. `adapterForHostname(location.hostname)` で対象adapterを決める
2. `installSendInterceptor` がadapter経由で入力欄と送信ボタンを探す
3. 送信ボタンclickまたは送信キーを検知する
4. `adapter.readText(editor)` で下書き本文を読む
5. `createSendReviewRequest` が `packages/core` の検出とpolicy判定を行う
6. 必要なら確認モーダルを表示する
7. ユーザーが安全化して送信を選んだ場合、`adapter.replaceText(editor, text)` で置換する
8. submit bypassを1回だけ有効化し、`adapter.submit(editor)` で送信を再実行する

貼り付け前確認の流れ:

1. content scriptが対象サイト上の `paste` イベントを共通処理で受ける
2. `findEditableTarget(event.target)` でtextarea / text input / search input / contenteditableを確認する
3. `event.clipboardData` から文字列を読む
4. `createPasteReviewPlan` がルールベース検出とpaste guard判定を行う
5. 必要なら `preventDefault` して確認モーダルを表示する
6. ユーザーがマスク・安全化を選んだ場合、`insertTextAtTarget` でカーソル位置または選択範囲へ挿入する

現時点では、paste時の入力欄検出はサイト別adapterではなく共通処理です。将来、対象サイトごとにpaste時の挿入挙動を分ける場合も、DLP判定は共通に残し、DOM固有処理だけをadapterへ寄せます。

## 0.1.1のローカルE2Eカバレッジ

`apps/extension/e2e/mock-composer.html` は、実サイトの完全再現ではなく、SiteAdapterが壊しやすい最小DOM差分を検証するためのページです。

現在の自動E2Eで確認するもの:

- `textarea` へのpasteと安全化して貼り付け
- `contenteditable` へのpasteと安全化して貼り付け
- Lexical風の `data-lexical-editor="true"` editorへのpaste
- ProseMirror風の `.ProseMirror` editorへのpaste
- 送信ボタンクリック時の送信前確認
- 通常Enter、Ctrl+Enter、Meta+Enter時の送信前確認
- Shift+Enter、Alt+Enter、IME変換中Enterを送信扱いにしないこと

このE2Eはログインや実サイトDOMに依存しません。実サイトの送信ボタン位置、Reactイベント反映、A/Bテスト差分は [extension-site-qa.md](./extension-site-qa.md) で手動QAとして確認します。

## contenteditable / textarea / Reactイベント方針

- `textarea` と `input[type="text" | "search"]` はnative setter経由で値を更新します。
- `contenteditable` はtext nodeの挿入または `replaceChildren` で更新します。
- paste時はカーソル位置または選択範囲の置換を優先します。
- 送信前安全化では下書き全体の置換を基本にします。
- 置換後は `InputEvent` を発火し、React / Lexical / ProseMirror系UIが変更を認識しやすくします。
- password / email / tel / number / credit card系input、disabled / readonly、非表示要素には介入しません。
- 対象サイトのDOM変更でReactイベントが効かなくなる場合があるため、実サイトQAで入力欄の見た目だけでなく、送信内容に反映されることを確認します。

## 初期対象サイト

### ChatGPT

対象host:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

adapter観点:

- `#prompt-textarea`
- `textarea[data-testid="prompt-textarea"]`
- `contenteditable` / Lexical系editor fallback
- `button[data-testid="send-button"]`
- `aria-label` または `type="submit"` の送信ボタンfallback

確認項目:

- paste時に確認モーダルが出る
- 送信ボタンclickで送信前確認が出る
- 通常Enterで送信前確認が出る
- Shift+EnterやIME変換中Enterでは送信扱いにしない
- 安全化後にChatGPTの入力欄が置換され、送信内容へ反映される
- 拡張再読み込み後は対象タブも再読み込みし、古いcontent scriptが残らないことを確認する

### Claude

対象host:

- `https://claude.ai/*`

adapter観点:

- `data-testid="chat-input"` 配下の `contenteditable`
- ProseMirror fallback
- `textarea` fallback
- `aria-label` / `data-testid` / `type="submit"` の送信ボタンfallback

確認項目:

- paste時に確認モーダルが出る
- 送信ボタンclickで送信前確認が出る
- 通常Enterで送信前確認が出る
- 安全化後にClaudeの入力欄が置換され、送信内容へ反映される
- `contenteditable` のカーソル位置や改行が大きく崩れない
- 送信ボタンが見つからない場合のキーボードfallbackが送信ループを起こさない

### Gemini

対象host:

- `https://gemini.google.com/*`

adapter観点:

- `rich-textarea textarea`
- `div[contenteditable="true"]`
- `role="textbox"`
- `.ql-editor`
- `aria-label` / `data-testid` の送信ボタンfallback

確認項目:

- paste時に確認モーダルが出る
- 送信ボタンclickで送信前確認が出る
- 通常Enterで送信前確認が出る
- 安全化後にGeminiの入力欄が置換され、送信内容へ反映される
- `rich-textarea` と `contenteditable` のどちらのDOMでも入力欄検出が壊れていない
- Gemini側のUI変更で送信ボタン候補が複数ある場合、実際のcomposerに紐づくボタンだけを押す

## 共通E2E確認項目

各対象サイトで次を確認します。実在の個人情報、実APIキー、実トークン、実案件情報は使わず、必ずダミーデータを使います。

- [ ] 拡張機能を再読み込み後、対象ページも再読み込みした
- [ ] 対象hostだけでcontent scriptが動く
- [ ] `<all_urls>`、localhostがリリースmanifestへ混入していない
- [ ] Options Pageで対象サイトON/OFFが効く
- [ ] 通常の入力欄を検出できる
- [ ] password / email / tel / number / credit card系inputには介入しない
- [ ] disabled / readonly / 非表示要素には介入しない
- [ ] ルール検出サンプルをpasteすると確認モーダルが表示される
- [ ] マスク・安全化操作でカーソル位置または選択範囲の挿入が大きく壊れない
- [ ] `input` イベントが発火し、対象サイトのUIが変更を認識する
- [ ] 送信ボタンclickで送信前確認が出る
- [ ] 通常Enterで送信前確認が出る
- [ ] Shift+Enter、Alt+Enter、IME変換中Enterは送信前確認を出さない
- [ ] 高リスク、critical、秘密情報保護対象は安全化なしで送信できない
- [ ] mediumリスクは詳細確認後に許可可能である
- [ ] キャンセル時に本文が勝手に送信されない
- [ ] 安全化後に再スキャンされ、秘密情報保護対象が残る場合は送信されない
- [ ] WebLLMが失敗してもルールベース検出と安全化は利用できる
- [ ] エラー表示や診断メモに本文が含まれない

### Perplexity

対象:

- `https://www.perplexity.ai/*`
- `https://perplexity.ai/*`

確認項目:

- 貼り付け前確認
- 送信前確認
- Enter送信、送信ボタン押下
- 安全化後にPerplexityの入力欄が置換され、送信内容へ反映される
- Perplexity側のUI変更で検索モードや添付ボタンが近くにある場合、実際の送信ボタンだけを押す

## ファイル添付イベントの扱い

0.1.xでは、テキスト系ファイルの `input[type=file]` 経由の添付前チェックだけをMVP対象にします。

対象サイト独自のドラッグ&ドロップ添付や、クリップボード経由のファイル添付は、サイトごとのDOMとイベント経路への依存が大きいため動作保証の対象外です。対応する場合は、SiteAdapterごとに次を調査します。

- `input[type=file]` へ集約されるか
- `drop` / `dragover` / `paste` のどのイベントでファイルが見えるか
- 添付前に安全化版ファイルへ置き換えられるか
- 置き換えられない場合、添付をキャンセルしてユーザーに案内できるか
- サイトの本来の添付UI、アクセシビリティ、ショートカットを壊さないか

将来対応する場合も、`<all_urls>` を無条件に要求しません。対象サイトと目的を限定し、本文、ファイル本文、検出結果、placeholderMap、現在URLをログや診断情報に含めない方針を維持します。

0.2系で検証する場合のadapter契約候補:

```ts
interface FileAttachmentProbe {
  source: "file-input" | "drop" | "clipboard";
  files: File[];
  canReplace: boolean;
}
```

この契約を入れる場合も、DLP判定やファイル本文抽出はSiteAdapterへ持ち込まず、adapterは添付入口の特定と置き換え可否だけを返します。本文抽出、対応形式判定、検出、安全化版ファイル作成は共通ロジックへ寄せます。

0.2系の検証表:

| SiteAdapter | 確認する入口 | 介入条件 | 非対応時の扱い |
| --- | --- | --- | --- |
| ChatGPT | `input[type=file]`, composer周辺drop, clipboard file | 対象ファイルを特定でき、サイトUIを壊さずキャンセルまたは置換できる | 対象外としてユーザーへ手動確認を促す |
| Claude | 添付ボタン配下input, ProseMirror周辺drop, clipboard file | ProseMirrorの入力イベントと添付状態が崩れない | 対象外としてユーザーへ手動確認を促す |
| Gemini | rich-textarea周辺drop, 添付UI, clipboard file | 検索/送信ボタンと添付操作を誤判定しない | 対象外としてユーザーへ手動確認を促す |
| Perplexity | 検索composer周辺drop, 添付ボタン, clipboard file | 検索モード切替や添付ボタンを誤操作しない | 対象外としてユーザーへ手動確認を促す |

## 新しいSiteAdapter追加手順

1. `apps/extension/src/lib/sites.ts` に対象site ID、表示名、host、match patternを追加する
2. `apps/extension/src/content/adapters/baseAdapter.ts` の `AdapterId` を更新する
3. `apps/extension/src/content/adapters/<site>Adapter.ts` を追加する
4. `adapterForHostname` にhostname mappingを追加する
5. `wxt.config.ts` とmanifest QAで、host permissionが必要最小限であることを確認する
6. Options PageでON/OFFできることを確認する
7. `apps/extension/tests/contentReview.test.ts` などにadapter mappingテストを追加する
8. `docs/extension-site-qa.md` とこの文書に手動QA観点を追加する
9. ローカル模擬composerで自動E2Eを追加できる場合は、`docs/extension-e2e-harness.md` の方針に沿って追加する
10. 実サイトでpaste、送信ボタンclick、Enter送信、マスク・安全化後の送信反映を確認する

追加時の禁止事項:

- 初期調査のために `<all_urls>` を本番manifestへ入れない
- 本文、検出結果、placeholderMap、送信履歴を保存しない
- 実APIキー、実トークン、実個人情報、実案件情報をテストやIssueへ貼らない
- 対象サイトの本文を外部LLM APIや開発者サーバーへ送らない
- 1サイトの特殊処理を共通DLP判定へ混ぜない

## Playwright / 手動QAの役割分担

- ユニットテスト: adapter mapping、送信キー判定、bypass、設定ON/OFF、モーダル状態を確認します。
- 拡張E2Eハーネス: ローカル模擬composerでpaste、送信前確認、安全化、キャンセルを確認します。
- 実サイト手動QA: ChatGPT / Claude / Gemini / Perplexity の実DOM、実送信ボタン、Reactイベント反映、WebLLM表示を確認します。

実サイトのログイン、A/Bテスト、DOM更新、利用規約、ネットワーク状態に依存する確認はCIに載せず、手動QAとして記録します。手動QAの記録には、貼り付け本文、送信本文、検出文字列、placeholderMap、現在のページURLを含めません。

## 2026-06-27 実サイト手動QAとの対応

ユーザー手動確認により、ChatGPT / Claude / Gemini / Perplexity の4サイトで、AI文脈チェックの候補取りこぼしを除く基本動作は通過しました。本文、検出文字列、placeholderMap、現在のページURL全文は記録していません。

| 確認観点 | 実サイト手動QA | 自動E2Eでの扱い | 補足 |
| --- | --- | --- | --- |
| paste確認モーダル | 4サイトでpass | ローカル模擬composerで継続確認 | 実DOM差分は手動QAで監視する |
| 送信前確認 | 4サイトでpass | ローカル模擬composerでclick / Enterを継続確認 | サイトごとの送信ボタンDOMは手動QAで監視する |
| 安全化後の入力反映 | 4サイトでpass | textarea / contenteditable / Lexical / ProseMirror風DOMで継続確認 | React系イベント反映は実サイトでも確認済み |
| AI文脈チェック候補 | partial | packages/llmのテストで候補補助を拡充 | 人名・社名・案件名・採用/契約/未公開文脈は #455-#459 で補強する |

## 関連文書

- [実サイトQAチェックリスト](./extension-site-qa.md)
- [Chrome拡張E2E自動化ハーネス方針](./extension-e2e-harness.md)
- [脅威モデル](./threat-model.md)
- [Chrome拡張 権限・CSP・依存関係監査チェックリスト](./extension-security-audit.md)
