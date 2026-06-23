# Cloudflare Pages 公開手順

AIまえチェックの紹介LP兼デモサイトは、Cloudflare Pagesで静的サイトとして公開します。本文の検出処理はブラウザ内で行い、Cloudflare Pagesや独自バックエンドへ貼り付け本文を送信しません。

## 公開URL

- LP: <https://ai-mae-check.pages.dev/>
- プライバシーポリシー: <https://ai-mae-check.pages.dev/privacy>
- サポート: <https://ai-mae-check.pages.dev/support>

Chrome Web Storeの掲載URLも、上記のプライバシーポリシーとサポートページを使います。

## Cloudflare Pages 設定

Cloudflare Dashboardで「Workers & Pages」からPagesプロジェクトを作成し、GitHubリポジトリ `shunya-mabuchi/ai-mae-check` を接続します。

| 項目 | 設定値 |
| --- | --- |
| Project name | `ai-mae-check` |
| Production branch | `main` |
| Root directory | `.` |
| Build command | `pnpm build:demo` |
| Build output directory | `apps/demo/dist` |
| Environment variable | `NODE_VERSION=22` |
| Environment variable | `PNPM_VERSION=10.12.1` |

## 事前確認

```bash
pnpm install
pnpm test
pnpm build:demo
pnpm test:e2e
```

Cloudflare Pagesはトップ階層に `404.html` がない場合、ReactなどのSPAとして扱い、存在しないパスをrootへ渡します。この標準挙動を利用するため、`_redirects` に `/* /index.html 200` は置きません。Cloudflare側で無限ループ扱いの警告になるためです。

## 公開後の確認

1. <https://ai-mae-check.pages.dev/> を開き、LPが表示されることを確認する。
2. <https://ai-mae-check.pages.dev/privacy> を直接開き、プライバシーポリシーが表示されることを確認する。
3. <https://ai-mae-check.pages.dev/support> を直接開き、GitHub Issuesへのリンクが表示されることを確認する。
4. LPのデモでサンプル文の挿入、ルールベース検出、マスキング後テキスト表示を確認する。
5. Chrome Web Store Developer DashboardのサポートURLとプライバシーポリシーURLに、上記Pages URLを入力する。
6. LPの主CTA「Chrome Web Storeで追加」が公開済みストアページへ遷移することを確認する。

## 運用メモ

- GitHubの `main` にマージするとCloudflare Pagesが自動デプロイします。
- Pull RequestごとにプレビューURLが作られるため、公開前にLPやプライバシーページを確認できます。
- 0.1.0公開後は、LP上でChrome Web Store公開中であることを表示し、ストア追加を主導線にします。
- Analyticsやトラッキングは入れません。
- デモ本文は永続保存しません。
- WebLLMの初回利用時には、ローカル推論用モデルファイルを取得する場合があります。

## Production / Preview 運用

### Production

`main` ブランチへのマージでProduction deployが作成されます。Production URLは次です。

- <https://ai-mae-check.pages.dev/>
- <https://ai-mae-check.pages.dev/privacy>
- <https://ai-mae-check.pages.dev/support>
- <https://ai-mae-check.pages.dev/api/rules/latest>

ProductionはChrome Web Store掲載URLと拡張機能のルール配信URLとして使うため、CIとCloudflare Pagesの必須チェックが通ったPRだけをマージします。

### Preview

Pull RequestごとにPreview deployが作成されます。Preview URLはPR確認用で、Chrome Web Store、README、公開SNS、サポート導線には使いません。

Previewで確認すること:

- LPのヒーロー、導入導線、ミニデモが崩れていない
- `/privacy` と `/support` が直接開ける
- `/api/rules/latest` が想定するレスポンスを返す
- ルール配信の変更がある場合、署名付きJSONの `version`、`keyId`、`signature` が期待どおりか確認する

## 環境変数とSecret

Cloudflare PagesのProduction環境では次を使います。

| 名前 | 種別 | 用途 | 注意 |
| --- | --- | --- | --- |
| `NODE_VERSION` | Plain text | Cloudflare buildで使うNode.jsのバージョン | `22` |
| `PNPM_VERSION` | Plain text | Cloudflare buildで使うpnpmのバージョン | `10.12.1` |
| `RULE_KEY_ID` | SecretまたはPlain text | 署名付きルールJSONの `keyId` | 拡張側設定と一致させる |
| `RULE_SIGNING_PRIVATE_JWK` | Secret | ルール配信用ECDSA秘密鍵 | Git、Issue、PR、ログへ出さない |

`RULE_SIGNING_PRIVATE_JWK` はユーザー本文の処理には使いません。Cloudflare Pages Functionsが返すルールJSONに署名するためだけに使います。

Secretを追加・更新した場合は、既存Production deployではなく、Secret保存後に作成されたProduction deployで確認します。保存直後に `/api/rules/latest` が古い `keyId` を返す、または503を返す場合は、Production再デプロイが反映されているか確認します。

## ロールバック手順

### LPだけを戻す場合

1. Cloudflare Dashboard > Workers & Pages > `ai-mae-check` > Deploymentsを開く。
2. 直前に成功していたProduction deployを選ぶ。
3. そのdeployの内容とcommitを確認する。
4. RollbackまたはPromote to productionを実行する。
5. <https://ai-mae-check.pages.dev/>、`/privacy`、`/support` を確認する。

LPだけのロールバックでは、ユーザーの貼り付け本文や送信本文は関係しません。

### ルール配信APIを戻す場合

1. 影響範囲を確認する。`/api/rules/latest` の `version`、`keyId`、`rules`、`signature` を見る。
2. 壊れたルールが原因なら、Gitで直前の安全なルール内容へ戻すPRを作る。
3. `payload.version` を上げるか、ロールバック理由をPRに明記する。
4. `pnpm test:worker` と `pnpm qa:chrome-store` を確認する。
5. mainへマージしてProduction deployを作る。
6. 本番 `/api/rules/latest` の署名検証を確認する。

緊急時でも、署名なしJSONや署名検証できないJSONを「とりあえず配信する」運用はしません。拡張側は署名検証に失敗した場合、同梱ルールへフォールバックします。

## Build logsで見ること

- `pnpm install --frozen-lockfile` が成功している
- `pnpm build:demo` が成功している
- Pages Functionsのbundleでエラーが出ていない
- Secret値がログへ出ていない
- WebLLM chunk size warningは既知の警告として扱い、ビルド失敗ではない限りリリースブロッカーにしない

## LP更新とAPI更新の影響範囲

- LP、`/privacy`、`/support` の変更は、Chrome Web Store掲載URLやポートフォリオ導線に影響する
- `/api/rules/latest` の変更は、拡張機能の追加ルール取得に影響する
- どちらの場合も、ユーザー本文、送信本文、添付ファイル本文、検出結果、placeholderMapはCloudflareへ送らない
- API変更では、拡張側の同梱ルールへフォールバックできることを前提にする
