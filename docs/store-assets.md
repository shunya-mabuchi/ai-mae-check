# Chrome Web Store / ポートフォリオ用ブランド資産

このドキュメントは、AIまえチェックの公開前提画像を管理するためのメモです。画像内の文章とデータはすべて実在しないダミーです。プロダクト本体はChrome拡張です。Chrome Web Storeでは、READMEに掲載している実機クロップ画像を1280x800へ整形した `docs/assets/store/` 配下の画像を最終セットとして使います。

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

## ストア掲載用最終セット

Chrome Web Storeへアップロードする画像の最終セットと順番は [chrome-web-store-assets.json](./chrome-web-store-assets.json) で管理します。READMEに掲載している実機スクリーンショットとは別物です。

```text
docs/assets/store/icon-128.png
docs/assets/store/screenshot-01-real-paste-modal.png
docs/assets/store/screenshot-02-real-send-modal.png
docs/assets/store/screenshot-03-real-context-modal.png
docs/assets/store/promo-small-440x280.png
docs/assets/store/promo-marquee-1400x560.png
```

スクリーンショットのアップロード順:

1. `screenshot-01-real-paste-modal.png`: 実機クロップ由来の貼り付け前安全化モーダル
2. `screenshot-02-real-send-modal.png`: 実機クロップ由来の送信前安全化モーダル
3. `screenshot-03-real-context-modal.png`: 実機クロップ由来のAI文脈チェック入口

スクリーンショットはChrome拡張本体の実機画面を優先します。アイコン、small promo、marquee promoはブランド訴求用の生成画像として扱います。

## README掲載用の実機クロップ画像

READMEでは、実際にChatGPT上で拡張機能を動かしたスクリーンショットを、モーダル部分だけにトリミングして掲載します。ブラウザ上部、ChatGPTのサイドバー、アカウント表示、チャット履歴は写らないようにしています。

```text
docs/assets/readme/extension-paste-modal.png
docs/assets/readme/extension-send-modal.png
docs/assets/readme/extension-context-modal.png
```

## 掲載意図

- `screenshot-01-real-paste-modal.png`: 実機上の貼り付け前安全化モーダルを1280x800に整形して見せる
- `screenshot-02-real-send-modal.png`: 実機上の送信前安全化モーダルを1280x800に整形して見せる
- `screenshot-03-real-context-modal.png`: ルール検出なしでAI文脈チェックへ進む実機モーダルを1280x800に整形して見せる
- `extension-paste-modal.png`: 実機上の貼り付け前安全化モーダルを見せる
- `extension-send-modal.png`: 実機上の送信前安全化モーダルを見せる
- `extension-context-modal.png`: ルール検出なしでAI文脈チェックへ進む実機モーダルを見せる
- `promo-small-440x280.png`: 一覧で短く価値を伝える
- `promo-marquee-1400x560.png`: 大きな訴求枠用の横長画像

## 注意

- 画像内には実在の個人情報、実APIキー、実トークンを入れない
- 本文を保存しない設計と、WebLLMモデル取得が発生する場合があることは、ストア説明文でも別途明記する
- READMEには実機クロップ画像だけを掲載し、ストア用1280x800画像は直接掲載しない
- ストア掲載のスクリーンショットは、Chrome拡張の実機画面を優先する
- README用の実機クロップ画像は、Chrome Web Storeの1280x800要件を満たすための画像ではない。ストア提出時はDeveloper Dashboardの要件に合わせて別途最終調整する
- ストア提出時にはDeveloper Dashboard上の最新バリデーションに従って最終確認する
