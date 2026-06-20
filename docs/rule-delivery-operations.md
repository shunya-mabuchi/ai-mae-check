# ルール配信Worker 運用メモ

ルール配信Workerは、ユーザー本文を受け取らず、署名付きルールJSONだけを返すための補助サーバーです。0.1.0では本番署名鍵が未設定のため、同梱ルールへフォールバックする状態です。0.1.1で鍵ペアを再発行して有効化します。

## 運用方針

- ユーザー本文、送信本文、検出結果、placeholderMap、送信履歴をWorkerへ送らない
- Worker APIは `GET /api/rules/latest` のみを使う
- リクエスト本文は使用しない
- 署名済みルールだけを拡張側で採用する
- 署名検証失敗、通信失敗、形式不正では同梱ルールだけで動く
- 秘密鍵はCloudflare Secretに保存し、Gitへ置かない

## 鍵管理

鍵ペア生成:

```bash
pnpm rules:keygen
```

保存先:

- `publicJwk`: `apps/extension/config/rule-delivery.release.json`
- `privateJwk`: Cloudflare Pages Production Secret `RULE_SIGNING_PRIVATE_JWK`

注意:

- `privateJwk` は再表示できる前提で扱わない
- 紛失した場合は鍵ペアを再発行し、拡張側公開鍵も更新する
- 公開済み拡張に埋め込まれた公開鍵は後から変えられないため、鍵変更には新バージョン提出が必要

## ルール更新手順

1. 追加したいルールを `functions/api/rules/latest.ts` のルールバンドルへ反映する。
2. 正規表現が過剰検出やReDoSに寄らないかレビューする。
3. `pnpm test:worker` を実行する。
4. Cloudflare PagesのプレビューでAPIレスポンスを確認する。
5. mainへマージしてProductionへデプロイする。
6. 本番 `GET /api/rules/latest` の `version`、`keyId`、`signature` を確認する。

## ロールバック

- 問題のあるルールを削除したPRを作成し、mainへマージする。
- Cloudflare Pagesのデプロイ履歴から直前の正常デプロイへ戻す。
- 秘密鍵流出が疑われる場合は、鍵ペアを再発行し、0.1.1以降の新バージョンとして提出する。

## 障害時の見え方

- Workerが落ちている場合: 拡張側は同梱ルールへフォールバックする
- Secret未設定の場合: APIは署名設定なしのエラーを返す
- 署名不一致の場合: 拡張側はリモートルールを採用しない

いずれの場合も、ルールベースの同梱検出は継続します。ユーザー本文は障害調査ログへ含めません。

