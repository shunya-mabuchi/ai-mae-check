# プライバシー回帰チェック

AIまえチェックは、貼り付け本文・送信本文・検出結果・placeholderMapを永続保存しない前提で設計しています。今後の機能追加でこの前提が崩れないように、公開前QAとしてプライバシー回帰チェックを置きます。

```bash
pnpm qa:privacy-regression
```

## 自動チェックすること

- 拡張機能・core・llm・workerの実行時コードで `localStorage`、`sessionStorage`、`indexedDB` を直接使わない
- 実行時コードで `console.log` などのconsole出力を追加しない
- `chrome.storage.local` の読み書きを `apps/extension/src/lib/settings.ts` に集約する
- 保存するキーは `ai-mae-check.settings.v1` の設定だけにする
- 拡張機能からの `fetch` は署名付きルール取得 `GET /api/rules/latest` に限定する
- ルール取得リクエストに本文を付けない
- Cloudflare Pages Functions / Worker側で `request.text()` や `request.json()` などにより本文を読まない
- `navigator.sendBeacon`、`XMLHttpRequest`、`FormData` による未レビューの外部送信を追加しない

## postMessageの扱い

WebLLMはChrome拡張のContent Scriptから直接Workerを起動しにくいため、拡張機能originのbridge iframeを使います。このため `postMessage` / `MessagePort` で貼り付け本文を拡張機能内のbridgeへ渡します。

これは開発者サーバーや外部LLM APIへ本文を送るものではありません。ただし、`postMessage` の利用箇所はWebLLM bridge用途に限定し、外部originへ本文を渡す実装を追加しない前提です。

## 手動確認すること

- DevTools Consoleに貼り付け本文や検出文字列が出ていない
- Application > Storageで、拡張機能の設定以外に本文・placeholderMap・検出結果が保存されていない
- Networkタブで、本文を含むリクエストが発生していない
- ルール配信は `GET /api/rules/latest` のみで、本文や検出結果を送っていない
- WebLLMモデル取得が発生する場合でも、貼り付け本文はモデル配信元や外部LLM APIへ送信されていない

## 例外

WebLLMのモデルファイルやブラウザ内部キャッシュは、ブラウザ実装やWebLLMランタイムによりIndexedDB等を使う場合があります。このQAはAIまえチェック自身の実装が本文や検出結果を永続保存しないことを確認するためのものです。
