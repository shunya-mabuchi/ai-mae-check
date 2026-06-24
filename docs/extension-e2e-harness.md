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

0.1.1時点では、拡張E2Eハーネス本体を必須CIにはしません。第一段階として、`.github/workflows/extension-e2e.yml` の `workflow_dispatch` で手動実行できるGitHub Actionsを用意します。

理由:

- リリース用manifestへテスト専用host permissionを混入させない設計が先に必要
- GitHub Actions上のheaded ChromiumとMV3拡張読み込みの安定性を検証する必要がある
- WebLLM実モデルロードをCI必須にすると、GPU、保存領域、ネットワークに依存して不安定になりやすい

ただし、方針ドキュメント、E2E実装ファイルの存在確認、リリースmanifest QAは必須CIで維持します。手動CIでheaded Chromium相当のMV3拡張読み込みが安定することを確認できた段階で、`pnpm test:extension:e2e` をPR必須CIへ昇格するか判断します。

### 2026-06-24時点の判断

PR必須CIへの昇格は、現時点では見送ります。

理由:

- GitHub Actions上のheaded Chromium相当実行は、ローカルよりもタイミング差やブラウザ起動差分が出やすい
- MV3拡張読み込み、ローカルHTTPサーバー、Playwrightの3要素が絡むため、失敗時の調査コストが通常のユニットテストより高い
- Chrome Web Store提出前の必須チェックは、manifest QA、Chrome Store readiness QA、拡張ユニットテスト、手元のE2Eで十分に担保する

再判断条件:

- `workflow_dispatch` の手動CIを少なくとも3回実行し、失敗がないか、失敗原因がリトライ不要な設定問題として解消済みである
- `pnpm test:extension:e2e` のCI実行時間が、通常PRの待ち時間として許容できる
- リリースZIPへE2E専用host permissionが混入しないことを、`pnpm qa:extension:manifest` と `pnpm qa:chrome-store` で継続確認できる

手動CIの役割:

- `workflow_dispatch` で必要なタイミングだけ実行する
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

- CIでheaded Chromium相当の実行が安定するか検証する
- 実サイト手動QAの結果とE2Eケースの対応表を増やす
- Perplexityを0.1.1以降のadapter継続検証対象として扱う
