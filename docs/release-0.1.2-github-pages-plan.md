# 0.1.2 GitHub Pages移行計画

## 目的

0.1.2では、紹介LP、公開文書、署名付き追加ルール配信をCloudflareからGitHub Pagesへ完全移行します。移行後にCloudflare Pagesプロジェクトを停止し、二重運用は行いません。

## 公開構成

- LP: `https://shunya-mabuchi.github.io/ai-mae-check/`
- プライバシー方針: `https://shunya-mabuchi.github.io/ai-mae-check/privacy/`
- サポート: `https://shunya-mabuchi.github.io/ai-mae-check/support/`
- 署名付き追加ルール: `https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json`

## 署名鍵

- `privateJwk` はGitHub Environment `github-pages` のSecret `RULE_SIGNING_PRIVATE_JWK`だけに保存する。
- 公開鍵と `keyId` は拡張のリリース設定へ埋め込む。
- Secret値をGit、Issue、PR、CIログ、チャット、スクリーンショットへ残さない。

## 完了条件

1. `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm qa:github-pages` が通る。
2. GitHub Pagesで4つの公開URLを確認する。
3. `pnpm qa:rules:production` で本番JSONの署名検証が通る。
4. 0.1.2用ZIPを作成し、Chrome Web Storeへ提出する。
5. 0.1.2の公開を確認後、Chrome Web Store、README、GitHub ReleaseのURLをそろえる。
6. GitHub Pagesの公開を確認後、Cloudflare Pagesを停止する。

0.1.1が旧URLへアクセスできない場合も、検証済みキャッシュまたは同梱ルールへフォールバックし、ルールベース検出を継続します。
