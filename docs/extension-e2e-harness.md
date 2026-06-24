# Chrome拡張E2E自動化ハーネス方針

AIまえチェックはChrome拡張が本体です。ユニットテスト、デモE2E、manifest QAに加えて、実際の拡張を読み込んだ状態でpaste検知、送信前確認、安全化して貼り付け、安全化して送信を確認するE2Eハーネスを用意しています。

0.1.1時点で、ローカルの模擬composerページを使う最小ハーネスは実装済みです。実サイトのログイン状態に依存しないため、Chrome Web Store提出用ZIPやWebLLM実モデルロードとは切り離して確認できます。

SiteAdapterの責務、ChatGPT / Claude / Gemini / PerplexityごとのDOM差分、実サイト手動QAの観点は [SiteAdapter契約とE2E確認項目](site-adapter-contract.md) にまとめています。

## 方針

- 実サイトのログイン状態に依存しない
- ユーザー本文、実APIキー、実トークン、実在する個人情報を使わない
- ローカルの模擬composerページでpaste検知と送信前確認を検証する
- ChatGPT / Claude / Gemini / Perplexityの実サイト確認は手動QAとして残す
- 0.1.1のZIP再提出前は、残Issueをすべて解消してから最終buildとpackageを行う
- E2E専用buildのmanifest変更を、Chrome Web Store提出用ZIPへ混入させない

## Playwrightで拡張を読み込む方式

Playwrightでは永続コンテキストを使ってChrome拡張を読み込みます。

```ts
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`
  ]
});
```

注意点:

- MV3拡張は通常のheadless Chromiumで制約があるため、まずheaded実行を前提にします
- CIで実行する場合は、GitHub Actions上のLinux runnerでheaded相当の実行が安定するかを別途確認します
- extension IDは一時プロファイルやkey設定で変わる可能性があるため、テストではID固定に依存しすぎません
- WebLLM実モデルロードはE2E必須条件にしません

## ローカル模擬ページ

実サイトを直接E2E対象にすると、ログイン、A/Bテスト、DOM変更、利用規約、ネットワーク状態に引きずられます。そのため、まずローカルの模擬composerページで確認します。

模擬ページで用意する要素:

- `textarea`
- `contenteditable`
- Lexical風の `data-lexical-editor="true"` editor
- ProseMirror風の `.ProseMirror` editor
- 送信ボタン
- Enter送信
- Ctrl+Enter / Cmd+Enter送信
- Shift+Enter / Alt+Enter / IME変換中Enterは送信扱いにしないケース
- ChatGPT / Claude / Gemini / Perplexity風の最小DOM差分へ拡張しやすい構造

確認する操作:

- paste検知
- 送信前確認
- モーダル表示
- 安全化して貼り付け
- 安全化して送信
- キャンセル
- mediumリスクの詳細確認から送信許可
- high / critical / 秘密情報保護対象のそのまま送信抑止

## テスト専用match pattern

現在のリリース用manifestは、対象サイトをChatGPT / Claude / Gemini / Perplexityに限定しています。`<all_urls>` は要求しません。

ローカル模擬ページでE2Eを行うには、テスト専用buildだけで `http://127.0.0.1:<port>/*` または `http://localhost:<port>/*` をcontent scriptのmatchに追加します。

この設定はリリース用manifestへ混入させません。

守ること:

- `pnpm qa:extension:manifest` はリリースbuildに `localhost` や `<all_urls>` が入っていないことを確認する
- E2E専用buildは `EXTENSION_E2E=1` の明示的な環境変数でだけ有効にする
- E2E専用match patternはPR本文に明記する
- Chrome Web Store提出用ZIPはE2E専用buildから作らない

## 自動E2Eの対象範囲

### 自動化する

- ローカル模擬composerページでのpaste検知
- `textarea`、`contenteditable`、Lexical風DOM、ProseMirror風DOMの挿入挙動
- 送信ボタンクリックの送信前確認
- Enter / Cmd+Enter / Ctrl+Enterの送信前確認
- Shift+Enter / Alt+Enter / IME変換中Enterを送信扱いにしないこと
- ルールベース検出結果のモーダル表示
- 日本語placeholderによる安全化結果
- input eventが発火し、React系UIが変更を認識しやすいこと
- 本文やplaceholderMapが永続保存されないことの回帰確認

### 自動化しない

- ChatGPT / Claude / Gemini / Perplexityへのログイン
- 実サイトの本番DOMに依存した完全E2E
- WebLLM実モデルロード
- 実APIキー、実トークン、実在個人情報を使うテスト
- Chrome Web Store審査画面の操作

## 実サイト手動QAとの役割分担

| 種類 | 目的 | 対象 | CI |
| --- | --- | --- | --- |
| ユニットテスト | 検出、マスク、ポリシー、UI状態の安定性 | packages / extension内部 | 実行する |
| デモE2E | LP兼ミニデモの体験確認 | `apps/demo` | 実行する |
| 拡張E2Eハーネス | 実拡張を読み込んだpaste/submit確認 | ローカル模擬composer | 手動CIから段階的に導入 |
| 実サイト手動QA | 対象サイトDOMと実操作の確認 | ChatGPT / Claude / Gemini / Perplexity | CIには載せない |
| WebLLM実機確認 | WebGPU、モデル取得、保存領域の確認 | 実ブラウザ/実端末 | CIには載せない |

実サイト手動QAは [extension-site-qa.md](extension-site-qa.md) に残します。WebLLM実機確認は [webllm-real-device-check.md](webllm-real-device-check.md) と [webllm-compatibility-matrix.md](webllm-compatibility-matrix.md) に記録します。

## 実装済みコマンド

```bash
pnpm build:extension:e2e
pnpm test:extension:e2e
```

- `pnpm build:extension:e2e` は `EXTENSION_E2E=1` を付けて、E2E専用buildを `apps/extension/.output-e2e/chrome-mv3` に作成します
- `pnpm test:extension:e2e` はE2E専用buildを作成したうえで、Playwrightでローカルの模擬composerページを開きます
- `apps/extension/e2e/mock-composer.html` は `textarea`、`contenteditable`、Lexical風DOM、ProseMirror風DOM、送信ボタンを持つページです
- `apps/extension/e2e/extension.spec.ts` で、paste検知、安全化して貼り付け、安全化して送信、キーボード送信を確認します
- Chrome Web Store提出用ZIPはE2E専用buildから作らないでください。通常の `pnpm package:extension` は `apps/extension/.output/chrome-mv3` を使います

## CI判断

0.1.1時点では、拡張E2Eハーネス本体をPR/push時のCIとして実行します。`.github/workflows/extension-e2e.yml` は `pull_request`、`push`、`workflow_dispatch` で起動し、GitHub Actions上のChromiumでローカル模擬composerを検証します。

理由:

- #431で起動直後の `chrome://extensions/?options=...` 割り込みとWindowsの一時プロファイル削除レースを緩和した
- #432で修正後の `main` を3回手動実行し、3回とも成功した
- 1回あたりの実行時間は約1分20秒から1分30秒で、通常PRの待ち時間として許容できる
- リリース用manifestへE2E専用host permissionを混入させないQAを維持している

WebLLM実モデルロードは引き続きCI必須条件にしません。WebLLMはGPU、保存領域、ネットワークに依存するため、実機確認と互換性マトリクスで扱います。

### 2026-06-24時点の判断

PR/push時の自動CIへ昇格します。

理由:

- 修正後の手動CIで3回連続成功した
- E2E専用buildは `.output-e2e` に分離され、リリースZIPへ混入しない
- `pnpm qa:extension:manifest` と `pnpm qa:chrome-store` でリリースmanifestの権限を継続確認できる
- WebLLM実モデルロードは対象外のままなので、CIの不安定要因を増やしすぎない

継続監視条件:

- GitHub Actions上で起動レースが再発した場合は、失敗ログを見て設定問題か一時的な揺れかを分類する
- 連続して不安定になる場合は、一時的に `workflow_dispatch` へ戻す判断も許可する
- リリースZIPへE2E専用host permissionが混入しないことを継続確認する

手動CIの役割:

- `workflow_dispatch` で必要なタイミングにも実行できる
- `xvfb-run` 上でheaded相当のChromiumを起動する
- WebLLM実モデルロードは必須条件にしない
- E2E専用host permissionがリリースZIPへ混入しない方針を維持する

## 最小シナリオ

1. `pnpm build:extension:e2e` でテスト専用match patternを含む拡張を作る
2. Playwrightでローカル模擬composerを起動する
3. ダミー文をpasteする
4. 確認モーダルが表示される
5. `安全化して入力` を押す
6. 入力欄に日本語placeholderの安全化結果が入る
7. 送信ボタンまたはEnter送信を試す
8. `安全化して送信` 後、high / critical / 秘密情報保護対象が残っていない場合だけ送信が進む

ダミー文以外は使いません。

## 後続拡張候補

- CIでheaded Chromium相当の実行が継続して安定するか監視する
- 実サイト手動QAの結果とE2Eケースの対応表を増やす
- Perplexityを0.1.1以降のadapter継続検証対象として扱う

## 2026-06-24 追加確認

Issue #425 / #429 の対応として、拡張E2Eの手動CIとローカルE2Eを再確認しました。

- `extension-e2e.yml` を `main` で3回手動実行し、2回成功・1回失敗でした。
- 失敗した実行は、mock composerへ移動する直前に `chrome://extensions/?options=...` が割り込む起動レースでした。
- このPRでは、テスト用ページを作成してから余分な `chrome://extensions` ページだけを閉じるようにし、起動直後に唯一のページを閉じて永続コンテキストごと終了するケースを避けています。
- WindowsではChromeプロファイルの `lockfile` 解放が遅れることがあるため、一時プロファイル削除にもリトライを入れています。
- ローカルでは `pnpm test:extension:e2e` が10件すべて成功しました。

#431時点では、手動CIで1回の起動レースを確認していたため、PR必須CIへの昇格はいったん見送りました。その後、#432で修正後の `main` を複数回確認し、PR/push時CIへ昇格しています。

今回追加・確認した自動シナリオ:

- 貼り付け確認のキャンセル時に入力欄へ反映しない
- mediumリスクだけの場合、詳細確認後にそのまま送信できる
- highリスクの場合、そのまま送信へ切り替えられない

## 2026-06-24 #432 追加確認

#431反映後の `main` で `extension-e2e.yml` を3回手動実行し、3回とも成功しました。

| Run | 結果 | 所要時間 | URL |
| --- | --- | --- | --- |
| 28086696311 | success | 約1分24秒 | https://github.com/shunya-mabuchi/ai-mae-check/actions/runs/28086696311 |
| 28086714135 | success | 約1分21秒 | https://github.com/shunya-mabuchi/ai-mae-check/actions/runs/28086714135 |
| 28086731353 | success | 約1分26秒 | https://github.com/shunya-mabuchi/ai-mae-check/actions/runs/28086731353 |

この結果を受けて、`.github/workflows/extension-e2e.yml` を `pull_request` と `push` でも起動するPR/push時CIへ昇格します。`workflow_dispatch` は、リリース前や失敗調査時に単独実行できる導線として残します。
