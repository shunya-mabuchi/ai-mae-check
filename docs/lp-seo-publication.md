# 公開LPのSEO・OGP・ドメイン方針

AIまえチェックの公開LPは、Chrome拡張が本体であることを伝える紹介ページ兼ミニデモです。SNS、チャット、GitHub、Chrome Web Storeから遷移されたときに、拡張機能への導線が伝わるようにメタ情報を管理します。

## 現在の公開URL

- LP: <https://ai-mae-check.pages.dev/>
- プライバシー方針: <https://ai-mae-check.pages.dev/privacy>
- サポート: <https://ai-mae-check.pages.dev/support>
- Chrome Web Store: <https://chrome.google.com/webstore/detail/idedmkfplfieijdcflcogkngplhkkecc>

## OGP/SEO設定

`apps/demo/index.html` で次を設定します。

- `title`
- `meta description`
- `canonical`
- `og:site_name`
- `og:type`
- `og:url`
- `og:title`
- `og:description`
- `og:image`
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`
- favicon
- web manifest
- `robots.txt`
- `sitemap.xml`

OGP画像は `apps/demo/public/ogp.png` を使います。元画像はChrome Web Store用のマーキープロモーションタイルで、LPとストア掲載の見え方をそろえるために再利用しています。

## カスタムドメイン方針

0.1.xでは `ai-mae-check.pages.dev` のまま運用します。理由は次の通りです。

- Chrome Web Store公開直後にURLを増やしすぎない
- プライバシーポリシーURL、サポートURL、README、ストア掲載文の差し替え範囲を小さく保つ
- Cloudflare Pagesの無料枠で安定して運用できる

独自ドメインを取得する場合は、0.2以降で次をIssue化してから行います。

- Cloudflare PagesのCustom Domains設定
- Google Search Consoleの所有確認
- Chrome Web StoreのホームページURL、サポートURL、プライバシーポリシーURL差し替え
- README、`docs/chrome-web-store-listing.json`、`apps/demo/src/lib/siteRoutes.ts` の同期
- 旧 `pages.dev` URLからの扱い

## Google Search Console

現時点では必須ではありません。独自ドメインを使う場合、または検索流入を継続的に見たい段階で登録します。Chrome Web Store提出に必要なURLは、現在の `pages.dev` で満たします。

## 確認コマンド

```bash
pnpm qa:demo:seo
pnpm build:demo
```

## 手動確認

- LPをブラウザで開き、Chrome Web Storeへの導線がファーストビューから分かる
- `/privacy` と `/support` に自然に移動できる
- Slack、Discord、XなどでURLを貼ったとき、タイトル・説明・画像が意図通り表示される
- Chrome Web Store掲載ページからLPへ戻れる
