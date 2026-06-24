# Issue / PR運用

AIまえチェックはpublicリポジトリとして、Issue作成、PR作成、CI通過、マージの流れで管理します。

## 基本ルール

- mainへ直接pushしない
- 変更はIssueごとにブランチを切る
- PR本文に関連Issue、変更内容、検証結果を書く
- 実APIキー、実トークン、貼り付け本文、顧客名、案件名、個人情報をIssueやPRへ書かない
- Chrome Web StoreへZIPをアップロードするのは、対象Issueをすべて解消してからにする

## Issueテンプレート

- 不具合報告: `.github/ISSUE_TEMPLATE/bug_report.md`
- 実装タスク: `.github/ISSUE_TEMPLATE/task.md`
- ドキュメント修正: `.github/ISSUE_TEMPLATE/docs.md`

## PRテンプレート

`.github/pull_request_template.md` を使います。

PRでは、少なくとも次を記録します。

- 関連Issue
- 変更内容
- 実行した検証コマンド
- プライバシー・セキュリティ確認
- 残る制限や手動確認が必要な点

## GitHubメタデータQA

IssueやPRのタイトル、本文もpublicリポジトリのポートフォリオとして読まれます。作業後や公開前の棚卸しでは、次のコマンドで文字化け、英語prefix、英語テンプレート見出し、内部表記の残りを確認します。

```bash
pnpm qa:github-metadata
```

このQAはGitHub CLIを使うため、実行前に `gh auth status` で認証状態を確認します。技術用語としての `WebLLM`、`Chrome Web Store`、`SiteAdapter` などは許容し、`docs:`、`feat:`、`Summary`、`Validation` のようなテンプレート由来の英語を修正対象にします。本文、実APIキー、実トークン、顧客名、案件名、個人情報はIssueやPRへ書きません。

## ラベル運用

推奨ラベル:

- `type:bug`
- `type:task`
- `type:docs`
- `type:chore`
- `area:extension`
- `area:core`
- `area:llm`
- `area:demo`
- `area:worker`
- `area:release`
- `area:docs`
- `priority:high`
- `priority:medium`
- `priority:low`
- `status:blocked`
- `status:needs-review`

既存のGitHub標準ラベルは残します。必要に応じて、上記ラベルを追加してIssue一覧を見やすくします。

## マイルストーン運用

最小限のマイルストーン:

- `0.1.1`: 署名付きルール配信と公開前QA整備
- `0.2.0`: ローカルDLPランタイム再設計、PolicyDecision分離、WebLLM改善
- `post-0.2`: Perplexity adapter、非テキストファイル検査、ポートフォリオ強化

マイルストーンは、Chrome Web Store提出バージョンと連動させます。提出しない調査Issueは、無理にリリースマイルストーンへ入れません。
