# 実サイトQAチェックリスト

このドキュメントは、AIまえチェックのChrome拡張を ChatGPT / Claude / Gemini / Perplexity 上で継続検証するための手順です。実在の個人情報、実APIキー、実トークン、実案件情報は使わず、必ずダミーデータだけで確認します。

## 目的

- 対象サイト上でpaste検知、送信前確認、マスク貼り付け、送信ブロックが動くことを確認する
- WebLLMの実機動作、WebGPU非対応、モデル取得失敗時の表示を確認する
- 対象サイトのDOM変更でadapterが壊れていないか確認する
- Perplexityも対象サイトとして確認する

SiteAdapterの責務、共通DLP処理との境界、新しいadapter追加手順は [SiteAdapter契約とE2E確認項目](site-adapter-contract.md) にまとめています。このQAでは、その契約に沿って入力欄検出、送信ボタン検出、送信キー、置換後のReact系UI反映を確認します。

## 事前準備

```bash
pnpm install
pnpm build:extension
pnpm qa:extension:manifest
```

Chromeで次を行います。

1. `chrome://extensions` を開く
2. デベロッパーモードを有効にする
3. 「パッケージ化されていない拡張機能を読み込む」を選ぶ
4. `apps/extension/.output/chrome-mv3` を読み込む
5. 初回インストール時にAIまえチェックのOptions Pageが開くことを確認する
6. 開かない場合は拡張アイコンをクリックしてOptions Pageを開く
7. 拡張機能が有効、対象サイトがON、WebLLMは手動実行になっていることを確認する
8. 確認対象サイトのタブを再読み込みする

## 静的manifest QA

`pnpm qa:extension:manifest` では、ビルド済みmanifestに対して次を確認します。

- Manifest V3である
- 拡張名と説明が日本語の公開前提文言である
- 権限が `storage` のみである
- host permissionsがChatGPT / Claude / Gemini / Perplexityに限定されている
- `<all_urls>` を要求していない
- Content Scriptのmatchesが対象サイトに限定されている
- WebLLM bridge用の `llm-worker.js` と `llm-bridge.html` がweb accessible resourcesに含まれている
- 拡張アイコンがmanifestに設定されている
- 拡張アイコンをクリックするとOptions Pageを開ける

## 表示方針

ページ上には、右下固定の「safe」「risk」などの常時ステータス表示を出しません。常時表示は、実際の貼り付け前確認・送信前確認モーダルと役割が重なり、ユーザーが「安全判定済み」と誤解する可能性があるためです。

表示の役割は次のように分けます。

- 拡張アイコン: 設定画面への入口。対象サイトや検出ルール、AI文脈チェック設定を確認するために使う
- 確認モーダル: 検出が発生したときだけ表示し、検出項目、安全化プレビュー、AI文脈チェック候補、送信可否を表示する
- Options Page: 有効/無効、対象サイト、検出ルール、AI文脈チェック、診断情報を管理する
- ページ常時表示: 原則として表示しない。必要になった場合も、モーダルと同じ意味の安全/危険ラベルは出さない

## ダミーテストデータ

### ルール検出サンプル

```text
田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。

A社向けの提案資料について、NDA締結前なので関係者限りで確認してください。
初期費用は300万円、月額80万円で進める予定です。

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456

社内確認URL:
https://user:password@example.com/internal/proposal

この内容をAIで要約したいです。
```

このサンプルに含まれるメールアドレス、電話番号、AWS Access Key風文字列、GitHub token風文字列、URL、社名、案件名はすべて実在しないダミーです。手動QAではこのまま使います。

### 文脈リスクサンプル

```text
佐藤様向けに、Project Blue Bridge の提案メモを作成します。

まだ正式発表前なので、社外共有はしない前提でお願いします。
来月の契約更新に向けて、現行プランから年間契約へ切り替える案を検討しています。

候補者の山田花子さんについて、最終面談後の評価メモも含めます。
給与条件は現職より少し上げる方向で、内定前に社内だけで確認したいです。
```

## 共通確認項目

各対象サイトで次を確認します。

- [ ] 拡張機能を再読み込み後、対象ページも再読み込みした
- [ ] 対象hostだけでcontent scriptが動き、`<all_urls>` に頼っていない
- [ ] Options Pageの対象サイトON/OFFが反映される
- [ ] 初回インストール後にOptions Pageが開き、はじめにセクションが表示される
- [ ] 拡張アイコンをクリックするとOptions Pageが開く
- [ ] ページ右下などに常時ステータス表示が出ない
- [ ] 通常の入力欄を検出できる
- [ ] password / email / tel / number系inputには介入しない
- [ ] credit card系inputと思われる入力欄、disabled / readonly / 非表示要素には介入しない
- [ ] ルール検出サンプルをpasteすると確認モーダルが表示される
- [ ] 高リスク、または秘密情報保護の対象では、そのまま送信できない
- [ ] mediumは詳細確認から許可可能である
- [ ] マスクまたは安全化操作で、選択範囲やカーソル位置の入力を大きく壊さない
- [ ] `input` イベントが発火し、対象サイトのReact系UIが変更を認識する
- [ ] 送信ボタンclickで送信前確認が出る
- [ ] 通常Enterの送信操作で送信前確認が出る
- [ ] Shift+Enter、Alt+Enter、IME変換中Enterは送信扱いにしない
- [ ] キャンセル時に本文が勝手に送信されない
- [ ] 安全化後に再スキャンされ、秘密情報保護の対象が残る場合は送信されない

## ChatGPT確認

対象:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

確認:

- [ ] 入力欄にルール検出サンプルをpasteする
- [ ] paste確認モーダルが表示される
- [ ] 「マスクして貼る」または安全化系操作で本文が置換される
- [ ] 文脈リスクサンプルを入力し、送信ボタンclickで送信前確認が出る
- [ ] 通常Enterの送信操作で送信前確認が出る
- [ ] AI文脈チェックを手動実行できる
- [ ] WebLLM結果の候補が「確定」ではなく候補として表示される
- [ ] WebLLMが失敗してもルールベース検出結果は残る

## Claude確認

対象:

- `https://claude.ai/*`

確認:

- [ ] 入力欄にルール検出サンプルをpasteする
- [ ] paste確認モーダルが表示される
- [ ] マスク貼り付け後、Claudeの入力欄が変更を認識する
- [ ] 文脈リスクサンプルで送信前確認が出る
- [ ] 送信ボタンclickとキーボード送信の両方を確認する
- [ ] AI文脈チェックを手動実行できる
- [ ] キャンセル時に送信されない
- [ ] 安全化後の自動submit fallbackで、対象サイトが送信操作を受け取る

## Gemini確認

対象:

- `https://gemini.google.com/*`

確認:

- [ ] 入力欄にルール検出サンプルをpasteする
- [ ] paste確認モーダルが表示される
- [ ] マスク貼り付け後、Geminiの入力欄が変更を認識する
- [ ] 文脈リスクサンプルで送信前確認が出る
- [ ] 送信ボタンclickとキーボード送信の両方を確認する
- [ ] AI文脈チェックを手動実行できる
- [ ] キャンセル時に送信されない

## Perplexity確認

対象:

- `https://www.perplexity.ai/*`
- `https://perplexity.ai/*`

確認:

- [ ] 入力欄への貼り付けで確認モーダルが開く
- [ ] 高リスクまたは秘密情報保護対象は、そのまま送信できない
- [ ] 安全化後、Perplexityの入力欄が置換内容を認識する
- [ ] 送信ボタン押下前に確認モーダルが開く
- [ ] Enter送信または送信ボタン押下のどちらでも送信前確認が動く
- [ ] 検索モード、添付、音声入力などの近接ボタンを誤クリックしない
- [ ] AI文脈チェックを手動実行できる
- [ ] キャンセル時に送信されない

## WebLLM実機確認

通常環境:

- [ ] DevTools Consoleで `Boolean(navigator.gpu)` が `true` になる
- [ ] `navigator.gpu.requestAdapter()` が `null` ではないadapterを返す
- [ ] AI文脈チェック開始時に「ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。」が表示される
- [ ] 初回モデル取得後、候補または候補なしメッセージが表示される
- [ ] 候補なしの場合も「安全を保証するものではありません」と表示される
- [ ] 人名候補、顧客名候補、案件名候補がチェック対象として表示される

WebGPU非対応またはadapterなし:

- [ ] 「このブラウザまたは端末ではAI文脈チェックを利用できません。ルールベースの検出は引き続き利用できます。」が表示される
- [ ] ルールベース検出とマスク貼り付けは利用できる
- [ ] エラー表示にユーザー本文が含まれない

モデル取得失敗:

- [ ] 「ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。ルールベースの検出結果は引き続き利用できます。」が表示される
- [ ] 診断メモにHugging Face、GitHub raw、プロキシ、セキュリティソフト、広告ブロック、社内ネットワーク制限の確認が出る
- [ ] ルールベース検出とマスク貼り付けは利用できる
- [ ] エラー表示にユーザー本文が含まれない

Worker / bridge失敗:

- [ ] `llm-bridge.html` と `llm-worker.js` が `.output/chrome-mv3` に存在する
- [ ] `manifest.json` の `web_accessible_resources` に `llm-worker.js` と `llm-bridge.html` が含まれる
- [ ] 対象ページを再読み込みして再試行する

## 失敗時の診断メモ

本文そのものはIssueやPRへ貼らないでください。記録するのは、サイト、操作、期待結果、実際の表示、エラー種別、ブラウザ/OS、WebGPU可否だけにします。

記録例:

```text
サイト: ChatGPT
操作: ルール検出サンプルをpaste
期待: paste確認モーダル表示
結果: 表示されない
エラー種別: adapter/editor検出失敗
Chrome: 148.x
OS: Windows
WebGPU: adapterあり
補足: 本文は記録しない
```

## 実サイトQA記録テンプレート

実サイトQAを行ったら、本文・検出文字列・placeholderMap・現在のページURLを含めずに、次の粒度で記録します。URLは対象サービス名とhost種別だけに留めます。

```text
実施日: YYYY-MM-DD
確認者: GitHub usernameまたはinitial
拡張バージョン: 0.1.x
Chrome: 148.x
OS: Windows / macOS / Linux
対象サイト: ChatGPT / Claude / Gemini / Perplexity
対象host: chatgpt.com / chat.openai.com / claude.ai / gemini.google.com / www.perplexity.ai / perplexity.ai
入力欄種別: textarea / contenteditable / role=textbox
paste確認: pass / fail / skipped
送信ボタン確認: pass / fail / skipped
Enter送信確認: pass / fail / skipped
安全化後のReact反映: pass / fail / skipped
WebLLM確認: pass / fail / unsupported / skipped
エラー分類: none / adapter-editor / adapter-submit / insertion / policy / webllm-webgpu / webllm-fetch / other
本文なしの補足: 例「送信ボタンのaria-labelが変わっていた」
Issue化: なし / #xxx
```

記録タイミング:

- Chrome Web Store提出前
- Chrome Web Store公開後
- 対象サイトのUIが大きく変わったとき
- SiteAdapter、Content Script、挿入処理、送信前確認を変更したPRのマージ前

失敗時にIssueへ書いてよい情報:

- 対象サイト名と対象host
- 操作種別
- 期待結果と実際の表示
- エラー分類
- Chrome / OS / WebGPU可否
- 本文を含まないDOM手がかり。例: `textarea` が `contenteditable` に変わった、送信ボタンのaria-labelが消えた

Issueへ書かない情報:

- 貼り付け本文、送信本文、添付ファイル本文
- 検出された文字列
- placeholderMap
- 実在する顧客名、案件名、人名、社内URL
- 現在のページURL全文や会話ID

## 実サイトQA記録

### 2026-06-27 ユーザー手動確認

本文、検出文字列、placeholderMap、現在のページURL全文は記録していません。

| 対象サイト | paste確認 | 送信前確認 | 安全化後の入力反映 | WebLLM確認 | 補足 |
| --- | --- | --- | --- | --- | --- |
| ChatGPT | 通過 | 通過 | 通過 | 一部補強が必要 | AI文脈チェックで人名・社名候補の取りこぼしを確認。#455-#459で補強する |
| Claude | 通過 | 通過 | 通過 | 一部補強が必要 | AI文脈チェックで人名・社名候補の取りこぼしを確認。#455-#459で補強する |
| Gemini | 通過 | 通過 | 通過 | 一部補強が必要 | AI文脈チェックで人名・社名候補の取りこぼしを確認。#455-#459で補強する |
| Perplexity | 通過 | 通過 | 通過 | 一部補強が必要 | AI文脈チェックで人名・社名候補の取りこぼしを確認。#455-#459で補強する |

## 完了条件

- [ ] `pnpm build:extension` が通る
- [ ] `pnpm qa:extension:manifest` が通る
- [ ] ChatGPTのチェックリストを一通り確認した
- [ ] Claudeのチェックリストを一通り確認した
- [ ] Geminiのチェックリストを一通り確認した
- [ ] Perplexityのチェックリストを一通り確認した
- [ ] WebLLM通常環境、WebGPU非対応、モデル取得失敗時の表示を確認した
- [ ] 失敗があれば、本文を含めずにIssue化した
