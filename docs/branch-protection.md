# mainブランチ保護とPR運用

AIまえチェックはChrome Web Storeで公開している拡張機能を含むため、`main` へ直接変更を入れず、PRとCIを通して更新します。

## 設定状況

2026-06-23時点で、GitHubの `main` ブランチ保護を有効化しています。

- PR経由の更新を必須にする
- 必須ステータスチェックを有効にする
- 必須チェックは `Typecheck, test, build, and release QA` と `Cloudflare Pages`
- 最新の `main` と同期した状態でチェックを通す
- 管理者にもブランチ保護を適用する
- force pushを許可しない
- ブランチ削除を許可しない
- conversation resolutionを必須にする
- PRレビュー承認数は0にする

1人開発のためレビュー承認数は0にしていますが、PR自体は必須にして、CIとCloudflare Previewを通してからmergeします。将来共同開発に移る場合は、承認数を1以上に上げます。

## 必須チェック

### `Typecheck, test, build, and release QA`

GitHub Actionsで次を確認します。

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm package:extension`
- `pnpm qa:public-repo`
- `pnpm qa:extension:manifest`
- `pnpm qa:chrome-store`

### `Cloudflare Pages`

LP、プライバシーポリシー、サポートページ、Pages FunctionsのPreview deploymentが作成できることを確認します。

## CI失敗時の扱い

- CIが失敗したPRはmergeしない
- Chrome拡張のZIP生成やChrome Web Store QAが失敗した場合は、ストア提出物を作り直さない
- WebLLM chunk size warningのような既知のwarningは、ビルド失敗ではない限りPR本文やIssueに記録して扱う
- Cloudflare Pagesが失敗した場合は、LPだけでなく `/privacy`、`/support`、`/api/rules/latest` の影響も確認する
- Secret scanning / public repo safety QAが失敗した場合は、原因がダミーか実secretかを確認し、実secretの可能性があれば履歴修正と鍵ローテーションを優先する

## Chrome Web Store提出物を壊さないための運用

- `pnpm package:extension` と `pnpm qa:chrome-store` が通ったZIPだけを提出候補にする
- 審査中または公開済みのZIPを差し替える場合は、IssueとPRに変更理由を残す
- ルール配信の `keyId` と拡張側公開JWKが一致していることをQAで確認する
- 0.1.0公開後の修正は、0.1.1以降のバージョンとして提出する

## 設定確認コマンド

```bash
gh api repos/shunya-mabuchi/ai-mae-check/branches/main/protection
```

必須チェック名や保護ルールを変えた場合は、このドキュメントとIssueに理由を残します。
