# 0.1.1 ルール配信署名対応計画

0.1.0の公開済みZIPは触りません。署名付きルール配信の本番有効化は、0.1.1で鍵ペアを再発行して対応します。

## 背景

- 0.1.0の拡張ZIPには、`apps/extension/config/rule-delivery.release.json` の公開鍵が埋め込まれています。
- その公開鍵に対応する `privateJwk` は手元に残っていません。
- 秘密鍵は公開鍵から復元できないため、Cloudflare Secretへ既存鍵として設定することはできません。
- 現在の本番API `https://ai-mae-check.pages.dev/api/rules/latest` は、署名鍵未設定時に本文なしのエラーJSONを返します。
- 拡張側は通信失敗・署名検証失敗時に同梱ルールへフォールバックする設計です。

## 0.1.1でやること

1. `pnpm rules:keygen -- --key-id ai-mae-check-rules-2026-06-v2 --private-out <git管理外の一時ファイル>` で新しいECDSA P-256鍵ペアを生成する。
2. 生成した `publicJwk` と `keyId` を `apps/extension/config/rule-delivery.release.json` へ反映する。
3. 生成した `privateJwk` をCloudflare Pages Production Secret `RULE_SIGNING_PRIVATE_JWK` に設定する。
4. `https://ai-mae-check.pages.dev/api/rules/latest` が署名付きルールJSONを返すことを確認する。
5. 残Issueをすべて解消してから、最終提出候補のZIPを作り直す。
6. `pnpm build:extension`、`pnpm package:extension`、`pnpm qa:public-repo`、`pnpm qa:public-docs`、`pnpm qa:privacy-regression`、`pnpm qa:webllm-model-policy`、`pnpm qa:dependency-policy`、`pnpm qa:release-policy`、`pnpm qa:demo:seo`、`pnpm qa:extension:size`、`pnpm qa:extension:manifest`、`pnpm qa:chrome-store` を実行する。
7. Chrome Web Storeへ0.1.1として新しいZIPを提出する。

鍵ローテーション、壊れたルール配信時のロールバック、旧 `keyId` の扱いは [rule-delivery-operations.md](./rule-delivery-operations.md) に従います。

0.1.1で使う `keyId` は `ai-mae-check-rules-2026-06-v2` です。

## やらないこと

- 0.1.0公開済みZIPの差し替え
- 既存公開鍵から秘密鍵を復元しようとすること
- ユーザー本文や検出結果をルール配信Workerへ送ること
- 外部LLM APIへのフォールバック

## Cloudflare Secret設定

Cloudflare Dashboardで設定する場合:

1. Workers & Pages > `ai-mae-check` > 設定 > 変数とシークレットを開く。
2. Production環境にSecretとして `RULE_SIGNING_PRIVATE_JWK` を追加する。
3. 値には `--private-out` で保存した `privateJwk` JSONを1行のJSON文字列として入れる。
4. Production環境の `RULE_KEY_ID` を `ai-mae-check-rules-2026-06-v2` に設定する。
5. 保存後にProduction deployを実行する。

Wranglerで設定する場合は、Cloudflareログイン状態と対象プロジェクトを確認してから行います。秘密鍵の値はGit、Issue、PR、CIログ、PowerShell履歴、スクリーンショット、チャット、レビューコメントへ残さない運用にします。`privateJwk` はマスク済みであってもログ出力しません。

Secretを保存しただけでは、既存のProduction deploymentに反映されない場合があります。Secret設定後はProduction再デプロイを実行し、その後に本番APIの署名付きレスポンスを確認します。`RULE_KEY_ID` が拡張側の `keyId` と一致しない場合、署名自体が正しくても拡張側では採用されません。

## 検証

本番API確認:

```bash
Invoke-RestMethod -Uri https://ai-mae-check.pages.dev/api/rules/latest
```

期待する状態:

- `alg` が `ECDSA-P256-SHA256`
- `keyId` が拡張側設定と一致
- `payload.rules` が配列
- `signature` が空でない文字列

拡張側確認:

- ビルド済みContent Script内に本番URL、`keyId`、公開JWKの `x` / `y` が含まれる
- 署名検証に成功した場合だけ追加ルールが使われる
- 署名検証、通信、JSON形式、署名欠落、`keyId` 不一致のいずれかに失敗した場合は同梱ルールで動く

## Issue

- #287: 0.1.1でルール配信署名鍵を再発行してCloudflare本番Secretへ反映する

