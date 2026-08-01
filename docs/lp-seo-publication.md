# 公開LPのSEO・OGP・ドメイン方針

AIまえチェックの公開LPは、Chrome拡張が本体であることを伝える紹介ページ兼ミニデモです。SNS、GitHub、Chrome Web Storeから遷移したときに、拡張機能への導線が伝わるように管理します。

## 現在の公開URL

- LP: <https://shunya-mabuchi.github.io/ai-mae-check/>
- プライバシー方針: <https://shunya-mabuchi.github.io/ai-mae-check/privacy/>
- サポート: <https://shunya-mabuchi.github.io/ai-mae-check/support/>
- Chrome Web Store: <https://chrome.google.com/webstore/detail/idedmkfplfieijdcflcogkngplhkkecc>

## OGP/SEO設定

`apps/site/index.html` でtitle、description、canonical、OGP、Twitter Card、favicon、web manifestを設定します。`robots.txt` と `sitemap.xml` もGitHub PagesのURLへそろえます。OGP画像は `apps/site/public/ogp.png` を使います。

## カスタムドメイン方針

2026-07-29時点の判断では、GitHub Pagesの `github.io` ドメインを使います。公開リポジトリと標準Actions runnerの範囲で月額費用を増やさず、Cloudflareとの二重運用を避けるためです。

独自ドメインとGoogle Search Console導入は現時点では見送ります。導入する場合は、DNS、GitHub Pages Custom domain、Chrome Web Store掲載URL、README、canonical、OGP、sitemapを同じPRで更新します。

## Google Search Console

Chrome Web Store提出には必須ではありません。検索流入を継続的に分析する段階、または独自ドメインを導入する段階で再判断します。

## 確認コマンド

```bash
pnpm qa:demo:seo
pnpm qa:github-pages
pnpm build:demo
```

## 手動確認

- ファーストビューからChrome Web Storeへの導線が分かる
- `/privacy/` と `/support/` を直接開ける
- 1440pxと390pxで文字やボタンが重ならない
- URL共有時のタイトル、説明、画像が意図どおり表示される
