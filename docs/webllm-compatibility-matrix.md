# WebLLM対応環境とモデル互換性マトリクス

AIまえチェックのAI文脈チェックは、WebLLMとWebGPUに依存します。端末、OS、Chromeの起動状態、GPUドライバ、保存領域、ネットワーク制限によって結果が変わるため、実機確認結果はこの形式で記録します。

この文書は、WebLLMを安全判定の中心に置くためではなく、「どの環境でAI文脈チェックが使えたか」「使えない場合もルールベース検出が継続できたか」を確認するためのものです。

## 記録してよい情報

- OSとバージョン
- Chromeのバージョン
- 通常ウィンドウ / シークレットモード
- 拡張機能のバージョン
- WebLLMモデルID
- `@mlc-ai/web-llm` のバージョン
- `chrome://gpu` のDawn Infoで確認したWebGPU状態
- 成功 / WebGPU非対応 / 保存領域不足 / モデル取得失敗 / 実行時エラーなどの分類
- 表示された日本語メッセージ
- ルールベース検出が継続できたか

## 記録しない情報

- ユーザー本文
- 実在する個人情報
- 実APIキー
- 実トークン
- 実URLの認証情報
- placeholderMap
- 検出結果の元文字列
- 顧客名、案件名、社内情報など公開Issueへ書くべきでない情報

問題報告では、本文の代わりにダミー文を使います。

## 標準モデルとfallback

0.1.xの標準モデル:

- `Llama-3.2-1B-Instruct-q4f32_1-MLC`

fallback候補:

- `SmolLM2-360M-Instruct-q4f32_1-MLC`

依存パッケージ:

- `@mlc-ai/web-llm@^0.2.79`

モデル選定とライセンス確認は [webllm-model-policy.md](webllm-model-policy.md) にまとめています。

## 互換性確認マトリクス

| 日付 | OS | Chrome | ウィンドウ | 拡張版 | モデルID | WebLLM版 | WebGPU / Dawn Info | 結果 | エラー分類 | ルールベース検出 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-16 | Windows NT 10.0.26200.8457 | Chrome/148.0.7778.180 | 通常 | 0.1.x | Llama-3.2-1B-Instruct-q4f32_1-MLC | ^0.2.79 | Intel UHD Graphics 620、D3D11 backend blocklisted、D3D12はCPU adapterのみblocklisted | 失敗 | webgpu_unavailable | 継続可 | `No available WebGPU adapters` / `Unable to find a compatible GPU` |
| 2026-06-16 | Windows 10/11 | Chrome詳細未記録 | シークレット | 0.1.x | Llama-3.2-1B-Instruct-q4f32_1-MLC | ^0.2.79 | adapter有無は未記録 | 失敗 | storage_quota | 継続可 | `QuotaExceededError`。通常ウィンドウでの再確認を優先 |
| 2026-06-16 | Windows 10/11 | Chrome詳細未記録 | 通常 | 0.1.x | Llama-3.2-1B-Instruct-q4f32_1-MLC以前のprebuilt候補 | ^0.2.79 | 詳細未記録 | 成功報告あり | なし | 継続可 | ユーザー報告ベース。Dawn Infoを保存していないため参考扱い |
| 未確認 | macOS | 未確認 | 通常 | 0.1.x | Llama-3.2-1B-Instruct-q4f32_1-MLC | ^0.2.79 | Metal backend確認待ち | 未確認 | 未確認 | 未確認 | macOS実機を利用できるタイミングで初回ロードと再実行を確認する |
| 未確認 | Linux | 未確認 | 通常 | 0.1.x | Llama-3.2-1B-Instruct-q4f32_1-MLC | ^0.2.79 | Vulkan / Dawn Info確認待ち | 未確認 | 未確認 | 未確認 | Linux実機とGPUドライバ構成を記録できるタイミングで確認する |

2026-06-24時点では、macOSとLinuxの実機確認は未実施です。未確認行は「動作しない」という意味ではなく、確認できる端末とChrome環境が用意できた段階で追記するための枠です。成功報告があったWindows環境も、Dawn InfoやChromeバージョンを保存していないものは参考扱いとし、今後は記録テンプレートに沿って残します。

## エラー分類

| 分類 | 代表例 | ユーザー向け表示 | 確認すること |
| --- | --- | --- | --- |
| `webgpu_unavailable` | `No available WebGPU adapters` / `Unable to find a compatible GPU` | このブラウザまたは端末ではAI文脈チェックを利用できません。ルールベースの検出は引き続き利用できます。 | `chrome://gpu` のDawn InfoでD3D12 backend、WebGPU Status、Blocklistedを確認する |
| `storage_quota` | `QuotaExceededError` | ローカルAIモデルの保存領域を確保できませんでした。ブラウザのサイトデータや空き容量を確認してください。ルールベースの検出結果は引き続き利用できます。 | 通常ウィンドウで再試行、Application > Storageの削除、空き容量確認 |
| `model_fetch_failed` | `TypeError: Failed to fetch` | ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。ルールベースの検出結果は引き続き利用できます。 | Hugging Face、GitHub raw、プロキシ、広告ブロッカー、セキュリティソフト、社内ネットワーク制限を確認する |
| `worker_disposed` | `Object has already been disposed` | AI文脈チェック用のWorkerを起動できませんでした。ページを再読み込みしてから再試行してください。ルールベースの検出結果は引き続き利用できます。 | ページ再読み込み、Chrome完全再起動、拡張の再読み込み |
| `gpu_runtime_error` | `GPUBuffer.mapAsync` / buffer unmapped | AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。 | 再読み込み、Chrome完全再起動、GPUドライバ状態、WebGPU負荷を確認する |
| `invalid_llm_json` | JSONパース失敗 | AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。 | ルールベース検出は維持されるか、本文がログに出ていないかを確認する |

## OS別の確認観点

### Windows

- `chrome://gpu` のDawn InfoでD3D12 backendがAvailableか確認する
- D3D11 backend only、Microsoft Basic Render Driver、Blocklistedの場合はWebLLMモデル変更だけでは解消しないことがある
- Chromeを完全終了してから再起動する
- 可能なら通常ウィンドウで確認する

### macOS

- Metal backendが利用できるか確認する
- 省電力モードや外部ディスプレイ接続で挙動が変わらないか確認する
- 初回モデル取得後、再実行時に待ち時間が短くなるか確認する

### Linux

- ChromeのWebGPU有効状態、Vulkan/Dawn Info、GPUドライバを確認する
- ディストリビューションやドライバ構成で差分が出るため、OS名とバージョンを必ず記録する

## Chrome状態別の確認観点

### 通常ウィンドウ

- 最初に確認する標準環境
- モデル取得、保存領域、WebGPU初期化、候補表示を確認する

### シークレットモード

- 拡張機能がシークレットで許可されているか確認する
- 保存領域が制限され、`QuotaExceededError` が出る場合がある
- シークレットで失敗しても、通常ウィンドウで成功する場合がある

### 他の拡張機能が有効な状態

- 広告ブロッカーやセキュリティ拡張がモデル配信元への通信を止める場合がある
- 失敗時は一時的に他の拡張をOFFにして、エラー分類が変わるか確認する

## 手動確認フロー

1. ChatGPT / Claude / Gemini / Perplexityのいずれかを開く
2. ダミー文だけを入力する
3. ルールベース検出が動くことを確認する
4. `AIチェック` または `AI文脈チェックも実行` を押す
5. 成功、候補なし、またはエラー分類を記録する
6. 失敗時も「ルールベースの検出は引き続き利用できます」と表示されるか確認する
7. DevTools ConsoleやNetworkタブを確認する場合も、本文をIssueやPRへ貼らない

## 記録テンプレート

```text
日付:
OS:
Chrome:
ウィンドウ: 通常 / シークレット
拡張版:
モデルID:
@mlc-ai/web-llm:
WebGPU / Dawn Info:
結果: 成功 / 候補なし / 失敗
エラー分類:
表示メッセージ:
ルールベース検出: 継続可 / 未確認
本文を記録していないこと: はい
備考:
```

## サポートFAQとの関係

サポートページでは、ユーザー向けに「WebGPU対応環境で利用できます」「初回モデル取得に時間がかかる場合があります」と簡潔に案内します。詳細な切り分けや実機結果は、このマトリクスと [webllm-real-device-check.md](webllm-real-device-check.md) に記録します。
