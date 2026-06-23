# Chrome拡張E2E自動化ハーネス方針

AIまえチェックはChrome拡張が本体です。ユニットテスト、デモE2E、manifest QAに加えて、実際の拡張を読み込んだ状態でpaste/submit/安全化モーダルを確認するE2Eハーネスを段階的に整備します。

この文書は、実サイトのログイン状態に依存しない自動E2Eの範囲と、手動QAとの境界を定義します。

## 方針

- 実サイトのログイン状態に依存しない
- ユーザー本文、実APIキー、実トークン、実秘密情報を使わない
- ローカルの模擬composerページでpaste/submitを検証する
- ChatGPT / Claude / Geminiの実サイト確認は手動QAとして残す
- 0.1.1のZIP再提出前は、残Issueをすべて解消してから最終buildとpackageを行う
- E2E用のmanifest変更を、Chrome Web Store提出用ZIPへ混入させない

## Playwrightで拡張を読み込む方式

PlaywrightでChrome拡張を読み込む場合は、永続コンテキストを使います。

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

- MV3拡張は通常のheadless Chromiumでは制約があるため、まずheaded実行を前提にする
- CIで実行する場合は、GitHub ActionsのLinux runnerでheaded相当の実行可否を検証する
- extension IDは一時プロファイルやkey設定で変わる可能性があるため、テストではID固定に依存しすぎない
- WebLLM実モデルロードはE2E必須条件にしない

## ローカル模擬ページ

実サイトを直接E2E対象にすると、ログイン、A/Bテスト、DOM変更、利用規約、ネットワーク状態に引きずられます。そのため、まずローカルの模擬composerページで確認します。

模擬ページで用意する要素:

- `textarea`
- `contenteditable`
- 送信ボタン
- Enter送信
- Cmd+Enter / Ctrl+Enter送信
- ChatGPT風、Claude風、Gemini風の最小DOM差分

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

現在のリリース用manifestは、対象サイトをChatGPT / Claude / Geminiに限定しています。初期実装では `<all_urls>` を要求しません。

ローカル模擬ページでE2Eを行うには、テスト専用buildだけで `http://127.0.0.1:<port>/*` または `http://localhost:<port>/*` をcontent scriptのmatchに追加する必要があります。

この設定はリリース用manifestへ混入させません。

守ること:

- `pnpm qa:extension:manifest` はリリースbuildに `localhost` や `<all_urls>` が入っていないことを確認する
- E2E専用buildは `EXTENSION_E2E=1` のような明示的な環境変数でだけ有効にする
- E2E専用match patternはPR本文に明記する
- Chrome Web Store提出用ZIPはE2E専用buildから作らない

## 自動E2Eの対象範囲

### 自動化する

- ローカル模擬ページでのpaste検知
- `textarea` と `contenteditable` の挿入挙動
- 送信ボタンclickの送信前確認
- Enter / Cmd+Enter / Ctrl+Enterの送信前確認
- ルールベース検出結果のモーダル表示
- 日本語placeholderによる安全化結果
- input eventが発火し、React系UIが変更を認識しやすいこと
- 本文やplaceholderMapが永続保存されないことの回帰確認

### 自動化しない

- ChatGPT / Claude / Geminiへのログイン
- 実サイトの本番DOMに依存した完全E2E
- WebLLM実モデルロード
- 実APIキー、実トークン、実個人情報を使うテスト
- Chrome Web Store審査画面の操作

## 実サイト手動QAとの役割分担

| 種類 | 目的 | 対象 | CI |
| --- | --- | --- | --- |
| ユニットテスト | 検出、マスク、ポリシー、UI状態の安定性 | packages / extension内部 | 実行する |
| デモE2E | LP兼ミニデモの体験確認 | `apps/demo` | 実行する |
| 拡張E2Eハーネス | 実拡張を読み込んだpaste/submit確認 | ローカル模擬composer | 段階的に導入 |
| 実サイト手動QA | 対象サイトDOMと実操作の確認 | ChatGPT / Claude / Gemini | CIには載せない |
| WebLLM実機確認 | WebGPU、モデル取得、保存領域の確認 | 実ブラウザ/実端末 | CIには載せない |

実サイト手動QAは [extension-site-qa.md](extension-site-qa.md) に残します。WebLLM実機確認は [webllm-real-device-check.md](webllm-real-device-check.md) と [webllm-compatibility-matrix.md](webllm-compatibility-matrix.md) に記録します。

## CI判断

0.1.1時点では、拡張E2Eハーネス本体はCI必須にしません。

理由:

- リリース用manifestへテスト専用host permissionを混入させない設計が先に必要
- GitHub Actions上のheaded ChromiumとMV3拡張読み込みの安定性を検証する必要がある
- WebLLM実モデルロードをCI必須にすると、GPU/保存領域/ネットワークに依存して不安定になる

ただし、方針ドキュメントとリリースmanifest QAはCIで維持します。将来、テスト専用buildとローカル模擬ページが実装できた段階で `pnpm test:extension:e2e` を追加し、最小シナリオだけCIへ載せます。

## 最小シナリオ案

1. `pnpm build:extension:e2e` でテスト専用match patternを含む拡張を作る
2. Playwrightでローカル模擬composerを起動する
3. ダミー文をpasteする
4. 確認モーダルが表示される
5. `安全化して貼り付け` を押す
6. 入力欄に日本語placeholderの安全化結果が入る
7. 送信ボタンを押す
8. high / critical / 秘密情報保護対象が残っていない場合だけ送信が進む

ダミー文以外は使いません。

## 後続実装タスク候補

- `apps/extension/e2e/mock-composer.html` を追加する
- `apps/extension/playwright.extension.config.ts` を追加する
- WXT設定にE2E専用match patternを追加する
- `pnpm build:extension:e2e` と `pnpm test:extension:e2e` を追加する
- CIでは最初に1シナリオだけ実行し、安定性を見て増やす
