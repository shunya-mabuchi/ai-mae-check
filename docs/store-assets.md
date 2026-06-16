# Chrome Web Store / ポートフォリオ用ブランド資産

このドキュメントは、AIまえチェックの公開前提画像を管理するためのメモです。画像内の文章とデータはすべて実在しないダミーです。

## 参照した公式要件

Chrome for Developers の Store listing documentation では、Graphic assets として次の画像が案内されています。

- ストアアイコン: 128x128 px
- スクリーンショット: 1280x800 px、少なくとも1枚、最大5枚
- 小プロモタイル: PNG または JPEG、440x280 px
- マルキープロモタイル: PNG または JPEG、1400x560 px

参照: <https://developer.chrome.com/docs/webstore/cws-dashboard-listing#graphic-assets>

## 生成コマンド

```bash
pnpm assets:brand
```

生成スクリプト:

```text
scripts/generate-brand-assets.mjs
```

## 拡張アイコン

Chrome拡張のmanifestに次のアイコンを設定しています。

```text
apps/extension/public/icon/16.png
apps/extension/public/icon/32.png
apps/extension/public/icon/48.png
apps/extension/public/icon/128.png
```

## ストア掲載用画像案

```text
docs/assets/store/icon-128.png
docs/assets/store/screenshot-01-lp.png
docs/assets/store/screenshot-02-demo.png
docs/assets/store/screenshot-03-extension-modal.png
docs/assets/store/screenshot-04-options.png
docs/assets/store/promo-small-440x280.png
docs/assets/store/promo-marquee-1400x560.png
```

## 掲載意図

- `screenshot-01-lp.png`: ファーストビューでプロダクト名と価値を伝える
- `screenshot-02-demo.png`: 検出とマスク対象選択を見せる
- `screenshot-03-extension-modal.png`: 拡張機能の送信前確認を見せる
- `screenshot-04-options.png`: 設定、対象サイト、本文を保存しない設計を見せる
- `promo-small-440x280.png`: 一覧で短く価値を伝える
- `promo-marquee-1400x560.png`: 大きな訴求枠用の横長画像

## 注意

- 画像内には実在の個人情報、実APIキー、実トークンを入れない
- 本文を保存しない設計と、WebLLMモデル取得が発生する場合があることは、ストア説明文でも別途明記する
- ストア提出時にはDeveloper Dashboard上の最新バリデーションに従って最終確認する
