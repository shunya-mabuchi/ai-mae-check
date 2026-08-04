# ローカルAI互換性マトリクス

現行のAI文脈チェックはWebLLM/WebGPUを使わず、Transformers.js + ONNX Runtime WebのCPU/WASMで実行します。

## 固定モデル

| 役割 | モデル | revision | dtype |
| --- | --- | --- | --- |
| 日本語NER | `jiting/xlm-roberta-ner-japanese_onnx` | `8d70fc4d277a84e59ccc70520ffd9daff66e66f0` | q8 |
| 文脈候補 | `sirasagi62/ruri-v3-30m-ONNX` | `cdf9391f1ff2198daa8f63f7ccf97d7b3e7415a0` | q8 |

## 確認項目

- Chrome、OS、CPU、メモリ
- 通常ウィンドウとシークレットモードの違い
- モデル配信元への接続可否
- モデルキャッシュの保存容量
- NERだけ成功、Ruriだけ成功、両方成功、両方失敗の各ケース
- AI失敗後もルールベース検出とマスキングが使えること
- UIに本文、placeholderMap、Cookie、トークンを表示・記録しないこと

## 実機記録テンプレート

| 日付 | Chrome / OS | CPU・メモリ | NER | Ruri | 結果 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | Chrome xx / Windows | CPU名 / RAM | 成功・失敗 | 成功・失敗 | 成功・部分成功・失敗 | 本文なしの診断 |

実機記録には、入力本文やその断片を含めません。エラーは `model_fetch`、`storage`、`memory`、`worker`、`wasm`、`timeout`、`unknown` の分類と技術詳細だけを残します。

## 既知の制限

- 初回は第三者配信元からモデルを取得するため時間がかかる場合があります。
- q8モデルでも端末のメモリや保存領域によっては利用できません。
- NERは人名・組織名・場所・施設などの候補抽出であり、住所全体やすべての固有名詞を保証しません。
- Ruriは曖昧な文脈の候補提示であり、秘密情報の確定判定ではありません。
- モデルが使えない場合も、ルールベース検出は引き続き利用できます。
