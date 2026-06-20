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

## 運用メモ

- GitHubの `main` にマージするとCloudflare Pagesが自動デプロイします。
- Pull RequestごとにプレビューURLが作られるため、公開前にLPやプライバシーページを確認できます。
- Analyticsやトラッキングは入れません。
- デモ本文は永続保存しません。
- WebLLMの初回利用時には、ローカル推論用モデルファイルを取得する場合があります。
