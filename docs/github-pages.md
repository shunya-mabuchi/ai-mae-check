# GitHub Pages 公開・運用手順

AIまえチェックの紹介LP、公開文書、署名付き追加ルールはGitHub Pagesで配信します。ユーザー本文の検出はブラウザ内で完結し、GitHub Pagesへ本文を送信しません。

## 公開URL

- LP: <https://shunya-mabuchi.github.io/ai-mae-check/>
- プライバシー方針: <https://shunya-mabuchi.github.io/ai-mae-check/privacy/>
- サポート: <https://shunya-mabuchi.github.io/ai-mae-check/support/>
- 署名付き追加ルール: <https://shunya-mabuchi.github.io/ai-mae-check/rules/latest.json>

## 無料運用の前提

- publicリポジトリを使う
- `github.io`の標準ドメインを使う
- GitHub Actionsは標準のpublic repository runnerを使う
- 外部LLM API、有料DB、有料OCR、独自バックエンドを使わない

この条件では現時点で月額費用なしで運用できます。ただし、GitHubの料金・上限変更、ActionsやPagesの利用上限、モデル配信元の変更まで永久に保証するものではありません。

## デプロイ

`.github/workflows/github-pages.yml` は `main` 更新時に次を実行します。

1. `pnpm install --frozen-lockfile`
2. `pnpm build:pages`
3. GitHub Pages artifactをアップロード
4. `actions/deploy-pages` でデプロイ

`pnpm build:pages` はViteビルド後、`/privacy/`、`/support/`、`404.html`、`.nojekyll` を準備し、署名付き静的JSON `rules/latest.json` を生成します。公開中0.1.2との互換用として、同じ内容を `api/rules/latest.json` にも一時配置します。

## Secret

GitHubリポジトリのEnvironment `github-pages` に次を登録します。

| 名前 | 種別 | 用途 |
| --- | --- | --- |
| `RULE_SIGNING_PRIVATE_JWK` | Environment secret | 追加ルールJSONのビルド時署名 |

秘密鍵はGit、Issue、PR、CIログ、チャット、スクリーンショットへ残しません。ワークフローへ渡すのは署名ジョブだけです。公開鍵と `keyId` は `apps/extension/config/rule-delivery.release.json` で管理します。

## 確認

```bash
pnpm qa:github-pages
pnpm qa:rules:production
```

公開後は4つのURLを直接開き、`latest.json` の `keyId`、`payload.version`、`signature` を確認します。拡張側の公開鍵で署名検証できない場合、そのルールは採用せず同梱ルールへフォールバックします。

## ロールバック

1. 問題のあるルール変更をGitでrevertする。
2. CIと `pnpm test:pages` を通す。
3. `main` へPR経由でマージする。
4. GitHub ActionsのPagesデプロイ完了を待つ。
5. `pnpm qa:rules:production` で本番署名を再確認する。

サイト全体に問題がある場合は、GitHub Pages workflowの直前の正常コミットをrevertします。秘密鍵を漏えいした可能性がある場合は、鍵ペアを再発行し、拡張側公開鍵を更新した新バージョンを公開します。

## Cloudflare停止

2026-07-30にCloudflare Pagesプロジェクトを削除し、GitHub Pagesへ完全移行しました。併存期間は設けていません。旧0.1.1は旧URLからのリモートルール取得に失敗しても、検証済みキャッシュまたは同梱ルールでルールベース検出を継続できます。
