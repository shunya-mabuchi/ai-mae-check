# CHANGELOG

AIまえチェックの変更履歴です。Chrome Web Storeへ提出する拡張バージョンは、root `package.json` と `apps/extension/package.json` のversionを基準にします。

## Unreleased

- AI文脈チェックで明確な業務語句とモデル分類が競合した場合、具体的な語句候補を優先して誤分類と重複表示を抑えるよう改善
- CPU/WASMローカルAIの固有表現候補、業務文脈語、候補統合、モデル実行、分析制御を責務別モジュールへ分離し、設計文書を現行構成へ同期

## 0.2.0 - 提出候補 (2026-08-02)

- 公開サイトをVite MPAへ再構築し、静的HTMLを基本にReactミニデモだけを操作可能なアイランドとして実装
- 公開サイト、Options Page、拡張モーダルへReact Aria Componentsと共通デザイントークンを導入
- Tailwind CSS 4へ移行し、Biomeを段階導入してUI実装とコード品質の基準を統一
- AI文脈チェックをTransformers.js + ONNX Runtime WebのCPU/WASM経路へ一本化し、ルールベース検出を先に表示する構成へ改善
- PolicyDecision、サイトAdapter、ContextBuilder、ローカルDLP評価fixtureとQAを整理
- 対応するテキスト系ファイルの添付前チェックと、対象外ファイルを安全判定済みにしない制御を追加
- 署名付き追加ルールの正規URLを、静的配信であることが明確な `/rules/latest.json` に統一
- ChatGPT / Claude / Gemini / Perplexity adapterのE2E、サイズ予算、公開文書、ストア提出物のQAを強化
- AI文脈チェックの採用・人事情報を医療情報と分離し、安全化時に `[人事情報]` と表示するよう修正
- 日本語NERによる固有表現抽出とRuri-v3-30mによる文脈分類を分離し、片方が失敗しても利用可能な候補とルールベース結果を維持するよう改善
- WebGPU、生成LLM、E5への実行時依存とモデル選択UIを削除し、固定モデルの役割と取得容量を設定画面へ明記

## 0.1.2 - 2026-08-01

- 紹介LP、プライバシー方針、サポートページをGitHub Pagesへ移行
- 署名付き追加ルールをGitHub Actionsでビルド時に生成し、静的JSONとして配信
- GitHub Pages移行用の署名鍵と拡張側公開鍵を更新
- Cloudflare Worker / Pages Functionsの実行時依存を削除

## 0.1.1 - 2026-07-03

- Chrome Web StoreでAIまえチェック 0.1.1を一般公開
- 署名付きルール配信の本番APIを有効化
- 0.1.1では署名付きルール配信の本番鍵を `ai-mae-check-rules-2026-06-v2` に更新する
- 公開前QAとして、public repo safety、public docs sync、WebLLM model policy、dependency policy、extension size budget、manifest、Chrome Web Store readinessをCIで確認する
- Chrome拡張E2Eハーネスを追加し、paste / submit / 安全化の最小フローをCIで検証する
- 検証済みリモートルールの短期キャッシュ、TTL、緊急停止フラグ `deliveryStatus: "paused"` に対応する

## 0.1.0 - 2026-06-20

- Chrome Web StoreでAIまえチェックを一般公開
- ChatGPT / Claude / Geminiでの貼り付け前チェックを実装
- 送信ボタンclick、Enter送信前の確認を実装
- メールアドレス、電話番号、JWT、AWS Access Key風文字列、GitHub token風文字列、秘密鍵、`.env` 形式の秘密情報、Basic認証URL、クレジットカード風番号などのルールベース検出を実装
- 高リスクまたは秘密情報保護対象の安全化なし送信抑止を実装
- 日本語ラベルによるマスク/安全化を実装
- WebLLMによるブラウザ内AI文脈チェックを実装
- Options Pageで対象サイト、検出ルール、WebLLM設定を変更できるようにした
- Cloudflare Pages上の紹介LP、プライバシーポリシー、サポートページを公開
- 0.1.0では署名付きルール配信の本番有効化は見送り、同梱ルールへのフォールバックを前提にした
