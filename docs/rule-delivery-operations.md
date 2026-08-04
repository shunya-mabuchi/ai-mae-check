# 署名付き追加ルール運用

## 原則

- 追加ルールは `rules/latest.json` でGit管理する。
- 配信はGitHub Pages上の署名付き静的JSON `GET /rules/latest.json` だけとし、ユーザー本文を受け取らない。
- `privateJwk` はGitHub Environment Secretに保存し、Git、Issue、PR、CIログ、チャット、スクリーンショットへ残さない。
- 拡張は署名を検証できないルールを採用せず、同梱ルールへフォールバックする。
- `deliveryStatus: paused` を使って追加ルールだけを停止できるようにする。

## 通常更新

1. [検出ルール作成ガイド](detection-rule-authoring.md) に従って `rules/latest.json` を更新する。
2. DLP評価fixtureへtrue positive、false_positive、境界値を追加する。
3. `payload.version` と `generatedAt` を更新する。
4. `pnpm qa:rule-catalog`、`pnpm eval:dlp`、`pnpm test:core`、`pnpm test:pages` を実行する。
5. PRとCIを通して `main` へmergeする。
6. GitHub Pages workflowの成功を確認する。
7. `pnpm qa:rules:production` で本番の `keyId`、署名、payloadを検証する。

品質基準は [DLPルール品質評価プロセス](dlp-rule-quality-process.md) を参照します。

## ロールバック

1. 問題のあるルールのversionを特定する。
2. `deliveryStatus` を `paused` にするか、直前の正常なGit定義へrevertする。
3. fixtureと `pnpm test:pages` を通す。
4. PR経由で `main` へmergeする。
5. GitHub Pagesの再デプロイ後、`pnpm qa:rules:production` を実行する。

## 鍵ローテーション

1. `pnpm rules:keygen` で新しいP-256鍵ペアを生成する。
2. 新しい公開鍵と `keyId` を拡張へ追加する。
3. 新旧公開鍵を許可した拡張バージョンを先に公開する。
4. GitHub Environment Secret `RULE_SIGNING_PRIVATE_JWK` を新しい秘密鍵へ更新する。
5. `rules/latest.json` と拡張設定の `keyId` を一致させる。
6. `pnpm build:extension`、`pnpm package:extension`、`pnpm qa:extension:manifest`、`pnpm qa:chrome-store`、`pnpm qa:rules:production` を実行する。
7. 移行完了後、古い公開鍵を次の拡張リリースで削除する。

秘密鍵漏えいの疑いがある場合は、既存Secretを直ちに更新し、新鍵を信頼する拡張バージョンを公開します。秘密鍵自体は復元・共有しません。

## 旧URLの廃止

配信先は `/rules/latest.json` に限定します。APIサーバーではなく、GitHub Pagesの静的成果物として扱います。

旧URLは、次の条件をすべて満たしたPRで削除します。

1. `/rules/latest.json` を参照する拡張バージョンがChrome Web Storeで一般公開済みである。
2. `rules/latest.json` の `minExtensionVersion` がその新しい拡張バージョン以上へ更新されている。
3. 新URLの本番署名検証と、旧版が同梱ルールへ安全にフォールバックすることを確認している。
4. README、プライバシー方針、公開QAから互換URLの説明を同じPRで削除する。

## 障害時の挙動

- ネットワークエラー: 検証済みキャッシュまたは同梱ルール
- 署名不一致: リモートルールを破棄して同梱ルール
- `deliveryStatus: paused`: 追加ルールを使わず同梱ルール
- GitHub Pages停止: ルールベース検出とローカルAI補助は継続

この運用はルール配信の可用性を補うものであり、ユーザー本文を収集する監視基盤は作りません。
