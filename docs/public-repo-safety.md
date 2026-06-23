# publicリポジトリ安全監査

AIまえチェックはpublicリポジトリとして公開するため、実APIキー、実トークン、秘密鍵、ローカル生成物、ログ、不要な提出物が混入しないように確認します。

## 基本方針

- 実APIキー、実トークン、実個人情報をコミットしない
- テストデータとスクリーンショットはダミー情報だけを使う
- `privateJwk` はCloudflare Secretに保存し、Git、Issue、PR、CIログ、チャットへ残さない
- 拡張ZIP、`.output`、`dist`、ログ、Playwright出力、ローカル秘密鍵ファイルはGit管理しない
- READMEやChrome Web Store素材に載せる検出例は、実在しない情報かマスク済みの情報だけにする

## 自動チェック

公開前、リリース前、PR作成前に以下を実行します。

```bash
pnpm qa:public-repo
```

このコマンドはGitで追跡されているファイルだけを対象に、次を確認します。

- `.output`、`dist`、`artifacts`、ログ、ZIP、private JWKファイル候補が追跡されていないこと
- `privateJwk` の `d` フィールド実値らしきものがないこと
- GitHub token、AWS Access Key、OpenAI形式キー、Slack token風文字列が、許可済みダミー以外で混入していないこと
- 秘密鍵PEM風文字列が、検出ルールのテストfixture以外に混入していないこと

## 手動確認

- GitHub Settings > Code security で Secret scanning と Push protection の有効化状況を確認する
- 2026-06-23時点では、GitHub API上で `secret_scanning=enabled`、`secret_scanning_push_protection=enabled` を確認済み
- `secret_scanning_non_provider_patterns` は同日時点で `disabled` のため、独自のダミー判定や生成物混入は `pnpm qa:public-repo` でも補助確認する
- Chrome Web Store用スクリーンショットは、実メール、実電話番号、実顧客名、実プロジェクト名、実トークンを含めない
- `docs/assets/store` の画像は見た目だけでなく、写り込む本文がダミーまたはマスク済みであることを確認する
- Cloudflare PagesやWranglerのログをIssueやPRへ貼る場合、Secret値やOAuth URLの不要なクエリを含めない
- ローカルに残した `*.private.jwk.json` はCloudflare Secret設定後に削除する

## 既知の許可済みダミー

- `AKIAIOSFODNN7EXAMPLE`
- `ghp_dummyDummyDummyDummyDummyDummy123456`
- `REPLACE_WITH_PRIVATE_D`

これらは検出ロジックとUI確認用のダミーです。新しいダミーを追加する場合も、実サービスで発行された値を流用しないでください。
