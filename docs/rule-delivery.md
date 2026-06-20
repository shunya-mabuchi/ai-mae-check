# ルール配信・署名検証サーバー

AIまえチェックでは、ユーザー本文をサーバーへ送らずに、検出ルールだけを安全に更新できる仕組みを追加しています。

0.1.0では、拡張ZIPに埋め込まれた公開鍵に対応する `privateJwk` が手元に残っていないため、署名付きルール配信の本番有効化は見送っています。0.1.1で鍵ペアを再発行し、Cloudflare Production Secretへ反映する予定です。詳細は [release-0.1.1-rule-delivery-plan.md](./release-0.1.1-rule-delivery-plan.md) と [rule-delivery-operations.md](./rule-delivery-operations.md) を参照してください。

## 方針

- サーバーへユーザーの貼り付け本文、送信本文、添付ファイル本文、検出結果、placeholderMapを送らない
- ルール配信APIは署名付きルールバンドルだけを返す
- 拡張側は署名検証できたルールだけを追加ルールとして使う
- 署名検証に失敗した場合、ネットワークエラーの場合、URL未設定の場合は同梱ルールだけで動く
- リモートルールは初期実装ではメモリ上だけで使い、永続保存しない

## API仕様

### `GET /api/rules/latest`

最新の署名付きルールバンドルを返します。

リクエスト本文は使いません。拡張側もGETだけを行い、本文や検出対象テキストを送信しません。

レスポンス例:

```json
{
  "alg": "ECDSA-P256-SHA256",
  "keyId": "ai-mae-check-demo-rules-2026-06",
  "payload": {
    "schemaVersion": 1,
    "version": "2026.06.16.1",
    "generatedAt": "2026-06-16T00:00:00.000Z",
    "minExtensionVersion": "0.1.0",
    "rules": [
      {
        "id": "slack_webhook_url",
        "label": "Slack webhook URL風文字列",
        "riskLevel": "high",
        "category": "secret",
        "placeholderPrefix": "WEBHOOK_URL",
        "pattern": "https://hooks\\.slack\\.com/services/[A-Za-z0-9/_-]+",
        "flags": "g",
        "message": "Webhook URLは外部へ送る前に確認したい秘密情報です。",
        "confidence": 0.96
      }
    ]
  },
  "signature": "base64url-signature"
}
```

### `GET /health`

ヘルスチェック用です。

```json
{ "ok": true }
```

## 署名方式

- 方式: ECDSA P-256 + SHA-256
- 署名対象: `alg`, `keyId`, `payload` を安定JSON化した文字列
- 署名形式: base64url
- 実装場所: `packages/core/src/remoteRules.ts`

`payload`だけでなく`alg`と`keyId`も署名対象に含め、署名方式や鍵IDの差し替えを検出できるようにしています。

## 鍵管理方針

- 公開鍵: 拡張機能に埋め込む
- 秘密鍵: Cloudflare Workersの環境変数またはsecretとして管理する
- 本番用秘密鍵はリポジトリに置かない
- `apps/worker/.dev.vars.example` はプレースホルダーであり、そのまま本番利用しない

鍵生成:

```bash
pnpm rules:keygen
```

出力された `publicJwk` を拡張側の公開鍵へ反映し、`privateJwk` をWorkerの `RULE_SIGNING_PRIVATE_JWK` に設定します。

## 拡張側フロー

1. `VITE_RULE_DELIVERY_URL` が未設定なら、リモート取得を行わず同梱ルールだけで検出する
2. URLが設定されている場合、Content Script起動時に `GET /api/rules/latest` を実行する
3. レスポンスを `verifySignedRemoteRuleBundle` で検証する
4. 検証OKなら `detectSensitiveText(input, { extraRules })` に追加ルールとして渡す
5. 検証NG、通信失敗、形式不正の場合は空の追加ルールとして扱い、同梱ルールへフォールバックする

Chrome Web Store提出用のZIPは `apps/extension/config/rule-delivery.release.json` を基準に組み立てます。`pnpm package:extension` は、本番URL・`keyId`・公開JWKがそろっていない場合は失敗します。

このフローにユーザー本文は含まれません。リモートルールはメモリ上でのみ利用し、`chrome.storage.local` には保存しません。

## ローカル開発

WorkerはCloudflare Workersを想定しています。

```bash
pnpm build:worker
pnpm test:worker
```

Wranglerで動かす場合は、`apps/worker/.dev.vars.example` を `.dev.vars` にコピーし、`pnpm rules:keygen` で生成した秘密鍵へ差し替えてください。

## 制限

- 初期実装ではリモートルールを永続キャッシュしません
- 正規表現ルールの安全性は署名者がレビューする前提です
- 署名検証に失敗したルールは使いません
- ルール配信サーバーが落ちても、同梱ルールベース検出は継続します
