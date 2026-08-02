# WebLLMモデル選定とライセンス確認

AIまえチェックでは、WebLLMを「文脈上の注意候補を補助的に出す」ために使います。外部LLM APIは使わず、メールアドレス、APIキー、秘密鍵、`.env` などの確定的な検出は `packages/core` のルールベース検出を主役にし、WebLLMの出力だけで安全・危険を断定しません。

## 現在の標準モデル

標準モデルは `Llama-3.2-1B-Instruct-q4f32_1-MLC` です。

選定理由:

- WebLLMのprebuiltモデルとして扱える前提で実装しやすい
- 1B級で、ブラウザ内実行と文脈候補抽出のバランスを取りやすい
- `q4f32_1` は、過去に使っていた `q4f16_1` より環境差分の影響を受けにくい想定で扱う
- AIまえチェックは会話品質より「顧客名候補、案件名候補、契約・採用・給与・法務などの注意候補」を出す用途なので、軽量モデルを優先する
- WebLLMが失敗してもルールベース検出を継続できる設計と相性がよい

このモデルを選ぶ理由は、「日本語能力が最高だから」ではありません。日本語の人名や案件名はWebLLMだけに依存させず、敬称つき人名や `Project ...` 形式などのローカル補助候補でも補います。

## LLM出力の扱い

WebLLMの出力は確定情報ではなく、ユーザーが確認する候補として扱います。入力文に存在しない `surface`、confidenceが閾値未満の候補、長すぎる `surface`、会社名・顧客名・案件名カテゴリで一般名詞だけの候補はFindingにしません。

JSONを読み取れない場合やGPU実行を完了できない場合も、アプリ全体を落とさず、ルールベース検出とローカル補助候補を維持します。エラー文言や診断メモには、貼り付け本文や送信本文を含めません。

## ライセンス確認

`Llama-3.2-1B-Instruct-q4f32_1-MLC` はMLC形式の量子化モデルIDです。元モデルのライセンス確認では、少なくとも以下を確認します。

- 元モデル: `meta-llama/Llama-3.2-1B-Instruct`
- ライセンス: Llama 3.2 Community License
- 確認元: <https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct>
- 注意: Apache-2.0やMITではありません。商用利用を検討する場合も、MetaのLlama 3.2 Community LicenseとAcceptable Use Policy、再配布条件、表示義務、月間アクティブユーザー条件を確認します。

このリポジトリのMIT Licenseは、第三者モデルのライセンスを上書きしません。

## fallbackモデル

fallback候補は `SmolLM2-360M-Instruct-q4f32_1-MLC` です。

位置づけ:

- 標準モデルがWebLLM prebuilt一覧にない環境での低VRAM fallback
- 標準モデルがGPUメモリ不足またはGPUデバイス喪失で停止した場合に限る、1回だけの実行時fallback
- 元モデル `HuggingFaceTB/SmolLM2-360M-Instruct` はApache-2.0
- 確認元: <https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct>
- ただし、モデルカード上も主に英語理解・生成を中心とした軽量モデルとして説明されているため、日本語文脈チェックの精度を期待しすぎない

WebGPUアダプタ自体を取得できない場合は、低VRAMモデルへ変更しても推論できないため再試行しません。実行時fallbackでも失敗した場合は、ルールベース検出とローカル補助候補を表示し、AI文脈チェックが完了していないことを明示します。

## WebLLM prebuilt確認

WebLLMは通常のHugging Faceモデルをそのまま任意に読み込む仕組みではなく、WebLLMが扱えるMLC形式のモデルとmodel libraryが必要です。

確認元:

- WebLLM README: <https://github.com/mlc-ai/web-llm>
- WebLLMのbuilt-in models説明では、利用可能モデルは `prebuiltAppConfig.model_list` から確認できると案内されています。

実装では、`packages/llm/src/model.ts` の `resolveModelId` が、実行時にWebLLMのprebuilt一覧を見て次の順に選びます。

1. ユーザー設定のモデルID
2. 標準モデル `Llama-3.2-1B-Instruct-q4f32_1-MLC`
3. 互換軽量モデル `Llama-3.2-1B-Instruct-q4f32_1-MLC`
4. 低VRAM fallback `SmolLM2-360M-Instruct-q4f32_1-MLC`
5. prebuilt一覧中で最もVRAM要求が低いInstruct/Chat系モデル

## モデル変更時のチェックリスト

モデルを追加・変更する場合は、PRで次を確認します。

- WebLLMの `prebuiltAppConfig.model_list` に存在する、またはMLC形式で安全に追加できる
- 元モデル、量子化モデル、model libraryの配布元が確認できる
- ライセンス、Acceptable Use Policy、再配布条件、商用利用可否を確認する
- モデルファイル取得時の配信元をREADME、プライバシー方針、ストア掲載文で説明する
- WebGPU非対応、モデル取得失敗、保存容量不足でもルールベース検出が動く
- エラー表示、診断メモ、ログにユーザー本文を含めない
- 実機で、通常環境、低VRAM環境、シークレットモード、モデル取得失敗時の表示を確認する

## 国産モデルについて

国産スクラッチ系モデルは安心感がありますが、AIまえチェックでは次の条件を満たす必要があります。

- WebLLMで現実的に動く軽量サイズである
- MLC形式とmodel libraryが用意できる
- Chrome拡張上で初回ロードとGPUメモリが許容範囲に収まる
- 商用利用や再配布条件を説明できる

そのため、国産モデルは今後の検証対象にできますが、0.1.xの標準モデルは動作実績とWebLLM prebuilt互換性を優先します。
