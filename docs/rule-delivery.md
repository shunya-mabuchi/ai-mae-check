# 署名付き追加ルール配信

AIまえチェックは、同梱ルールを必ず使える状態にしたうえで、GitHub Pagesから署名付き追加ルールを取得できます。ユーザー本文、検出結果、placeholderMapは送信しません。

## エンドポイント

### `GET /api/rules/latest.json`

本番URLは `https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json` です。リクエスト本文はありません。レスポンスは `schema`、`keyId`、`payload`、`signature` を持つ静的JSONです。

## 生成

1. `rules/latest.json` をPRで変更する。
2. CIでschema、正規表現、fixture、公開リポジトリ安全性を検証する。
3. `main` のGitHub Pages workflowがEnvironment Secretの秘密鍵で署名する。
4. 署名済みJSONをPages artifactへ含める。
5. 拡張が埋め込み公開鍵で署名を検証する。

秘密鍵をリポジトリや成果物へ含めません。署名できない場合はデプロイ自体を失敗させます。

## 拡張側

Content Script起動時に `GET /api/rules/latest.json` を実行し、次を満たす場合だけ採用します。

- `keyId` が許可された公開鍵に対応する
- ECDSA P-256署名を検証できる
- schema、期限、最小拡張バージョンが有効
- 正規表現とrule定義を安全に変換できる

取得失敗、署名不一致、期限切れ、`deliveryStatus: paused` の場合は、検証済みキャッシュまたは同梱ルールへフォールバックします。リモート障害で拡張全体を止めません。

## ルール作成

ルールの詳細は [検出ルール作成ガイド](detection-rule-authoring.md)、品質評価は [DLPルール品質評価プロセス](dlp-rule-quality-process.md)、運用は [ルール配信運用](rule-delivery-operations.md) を参照してください。

```bash
pnpm test:core
pnpm test:pages
pnpm qa:rule-catalog
pnpm qa:github-pages
```
