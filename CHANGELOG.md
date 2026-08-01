# CHANGELOG

AIまえチェックの変更履歴です。Chrome Web Storeへ提出する拡張バージョンは、root `package.json` と `apps/extension/package.json` のversionを基準にします。

## Unreleased

- ChatGPT / Claude / Gemini / Perplexity adapterの実サイト継続QA
- Chrome拡張E2EハーネスのCI安定化
- ルールカタログと署名付きルール配信の継続運用
- 拡張モーダルのプロダクトUI再設計、ローカルDLPランタイム再設計、PolicyDecision分離などは、IssueごとのPRで扱う

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
