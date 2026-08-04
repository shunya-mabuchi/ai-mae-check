# AI文脈チェックのモデル選定とライセンス確認

AIまえチェックでは、ローカルモデルを「文脈上の注意候補を補助的に出す」ために使います。外部LLM APIは使わず、メールアドレス、APIキー、秘密鍵、`.env` などの確定的な検出は `packages/core` のルールベース検出を主役にします。モデルの出力だけで安全・危険を断定しません。

## 現在の構成

| 経路 | モデル | 実行方式 | 役割 |
| --- | --- | --- | --- |
| WebLLM | `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | WebGPU | 日本語プロンプトから構造化された文脈候補を生成する |
| CPUフォールバック | `Xenova/multilingual-e5-small` (`q8`) | ONNX Runtime Web / WebAssembly | 文を埋め込み、業務上注意したい文脈との意味的な近さを分類する |
| 軽量補助検出 | モデルなし | TypeScript | 敬称つき人名、会社名、案件名、既知の注意表現を補う |

実行順は、ルールベース検出、WebLLM、CPUフォールバック、軽量補助検出です。WebLLMがWebGPU、GPUメモリ、Worker、モデル設定の理由で完了できない場合だけCPUフォールバックへ切り替えます。CPUフォールバックも失敗した場合は、ルールベース検出と軽量補助検出を維持します。

## WebLLMモデル

`Qwen2.5-0.5B-Instruct-q4f16_1-MLC` を選んだ理由:

- `@mlc-ai/web-llm` 0.2.84の `prebuiltAppConfig.model_list` に含まれる
- 元モデルが日本語を含む多言語に対応し、JSONなどの構造化出力を重視している
- 0.5B級で、文脈候補抽出に必要な能力とブラウザ内実行負荷のバランスを取りやすい
- Apache License 2.0で、利用条件を説明しやすい

WebLLM 0.2.84のprebuilt設定では必要VRAMの目安が約945MBで、`low_resource_required` です。したがって、すべての内蔵GPUで動作するとは表現しません。標準・低負荷の2プロファイルを用意し、失敗時はCPU経路へ切り替えます。

確認元:

- 元モデル: <https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct>
- 元モデルのライセンス: <https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/main/LICENSE>
- WebLLM量子化モデル: <https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC>
- Qwen2.5の公式説明: <https://qwenlm.github.io/blog/qwen2.5/>

## CPUフォールバックモデル

`Xenova/multilingual-e5-small` を選んだ理由:

- 日本語を含む多言語の文埋め込みに対応する
- 生成モデルより小さく、WebGPUを使わずCPUとWebAssemblyで実行できる
- `@huggingface/transformers` からONNX形式を読み込める
- 元モデルがMIT Licenseで、商用利用条件を説明しやすい
- 契約、人事、法務、財務、社内情報、未公開情報の6分類に対する意味的な近さを見る用途に合う

モデルは `q8` を使い、revisionをコミットIDへ固定します。実行用のONNX Runtime WebのWASMはChrome拡張ZIPへ同梱し、外部のJavaScriptやWASMを実行しません。初回利用時にはモデルデータを取得する場合があり、取得後はブラウザキャッシュを利用します。

Transformers.jsが持つ外部CDN向けWASMの既定フォールバックは、拡張ビルド時にローカル相対URLへ置換します。Chrome Web Storeへ提出する生成物に外部WASMのURLを残さず、同梱した `ort-wasm-simd-threaded.wasm` だけを実行します。

確認元:

- 元モデル: <https://huggingface.co/intfloat/multilingual-e5-small>
- Transformers.js向けONNX変換: <https://huggingface.co/Xenova/multilingual-e5-small>
- ONNX Runtime Webの実行方式: <https://onnxruntime.ai/docs/tutorials/web/>

CPUフォールバックは文章生成を行いません。入力を短い文へ分割し、埋め込みベクトルと固定の業務文脈プロトタイプを比較して候補を出します。人名や会社名などの具体的な表層は、既存の軽量補助検出と統合します。

## 実行プロファイル

WebLLMの実行条件は次の2プロファイルです。

| プロファイル | context window | 入力上限 | 出力上限 | 候補上限 |
| --- | ---: | ---: | ---: | ---: |
| 標準 | 2048 | 1200文字 | 384 tokens | 8件 |
| 低負荷 | 1536 | 800文字 | 256 tokens | 6件 |

GPU負荷系の失敗が標準プロファイルで起きた場合は、同じQwenモデルを低負荷プロファイルで1回だけ再実行します。失敗が続く場合は、再初期化を繰り返さずCPUフォールバックへ切り替えます。

CPUフォールバックは入力を最大1200文字、最大8文、各240文字に制限し、ONNX Runtime Webのスレッド数を1に固定します。幅広いChrome環境での互換性と、拡張ページの応答性を優先した初期設定です。

## 出力の扱い

- すべてのモデル出力は確定ではなく候補として表示する
- 入力文に存在しない表層はFindingにしない
- confidenceが閾値未満の候補は表示しない
- 高リスク・秘密情報保護・送信不可の判断はルールベースとPolicy Decisionを優先する
- エラー文言、診断メモ、ログにユーザー本文を含めない
- 本文、埋め込みベクトル、候補、placeholderMapを永続保存しない

## モデル変更時のチェックリスト

- WebLLMモデルは `prebuiltAppConfig.model_list` に存在する
- 元モデル、量子化モデル、model library、ONNX変換元を確認できる
- ライセンス、商用利用可否、再配布条件を確認する
- モデルファイル取得元をREADME、プライバシー方針、ストア掲載文で説明する
- 外部JavaScriptや外部WASMを実行しない
- WebGPU非対応、モデル取得失敗、保存容量不足でもルールベース検出が動く
- 実モデルをCIでロードせず、変換・プロトコル・失敗処理をモックでテストする
- 通常環境、低VRAM環境、CPUフォールバック、モデル取得失敗を実機で確認する

## 国産モデルについて

国産スクラッチ系モデルは今後の比較対象にできます。ただし、WebLLM prebuiltまたはTransformers.js向けONNXが安定提供され、ブラウザ内で現実的な容量と速度に収まり、ライセンスと配信元を継続して説明できることが採用条件です。国産であることだけを理由に、互換性や保守性を下げる選定は行いません。
