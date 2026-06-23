# WebLLMエラー分類と復旧手順

AIまえチェックでは、WebLLMの失敗理由を分類して、ユーザー向けの説明と本文を含まない診断メモを表示します。WebLLMが失敗しても、ルールベース検出と安全化は引き続き利用できます。

## エラー分類

| kind | 主な原因 | ユーザー向けの復旧手順 |
| --- | --- | --- |
| `webgpu` | WebGPU非対応、Adapter取得失敗、GPU実行中断 | `chrome://gpu` のDawn Info、Chromeの完全再起動、通常ウィンドウでの再試行を確認する |
| `model_fetch` | WebLLMモデル配信元への接続失敗 | Hugging Face、GitHub raw、プロキシ、広告ブロッカー、社内ネットワーク制限を確認する |
| `storage` | IndexedDB、Cache Storage、ディスク容量、シークレットモードの保存制限 | サイトデータ削除、空き容量確認、通常ウィンドウでの再試行を行う |
| `memory` | GPU/システムメモリ不足 | ほかのタブやアプリを閉じ、低VRAM環境ではAI文脈チェックを任意機能として扱う |
| `worker` | WebLLM Worker、bridge iframe、拡張再読み込み後の古いContent Script | 対象サイトのタブも再読み込みしてから再試行する |
| `wasm` | WebAssembly実行ファイルの読み込み失敗 | ブラウザキャッシュやサイトデータを削除して再試行する |
| `json_parse` | WebLLM出力をJSONとして読めない | ルールベース検出結果は維持し、必要ならAI文脈チェックを再実行する |
| `timeout` | AbortError、タイムアウト、応答待ちの中断 | 入力を短くする、タブを再読み込みする、初回モデル準備後に再実行する |
| `unknown` | 上記に当てはまらない内部エラー | DevTools Console、Network、`chrome://gpu` のDawn Infoを確認する |

## 記録してよい情報

- OS、Chromeバージョン、WebGPU Status
- WebLLMエラー種別 `kind`
- 本文を含まない `technicalDetail`
- モデルID、拡張バージョン

## 記録しない情報

- 貼り付け本文、送信本文
- 検出された文字列
- placeholderMap
- 入力ページのURL全文
- WebLLMに渡したプロンプト本文

## 手動確認

1. WebGPU非対応環境またはブロック環境でAI文脈チェックを実行し、`webgpu` のメッセージが出ることを確認する。
2. モデル配信元をブロックして `model_fetch` のメッセージを確認する。
3. シークレットモードや保存容量制限で `storage` のメッセージを確認する。
4. 拡張機能を再読み込みしたあと対象サイトのタブを再読み込みせず試し、`worker` の復旧メッセージを確認する。
5. 不正JSONを返すモックで `json_parse` になり、ルールベース検出結果が維持されることを確認する。
