# Chrome Web Store / ポートフォリオ用ブランド資産

このドキュメントは、AIまえチェックの公開前提画像を管理するためのメモです。画像内の文章とデータはすべて実在しないダミーです。プロダクト本体はChrome拡張であり、READMEやストア掲載では拡張機能の画面を先に見せます。

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
docs/assets/store/screenshot-03-extension-modal.png
docs/assets/store/screenshot-04-options.png
docs/assets/store/screenshot-01-lp.png
docs/assets/store/screenshot-02-demo.png
docs/assets/store/promo-small-440x280.png
docs/assets/store/promo-marquee-1400x560.png
```

## README掲載用の実機クロップ画像

READMEでは、実際にChatGPT上で拡張機能を動かしたスクリーンショットを、モーダル部分だけにトリミングして掲載します。ブラウザ上部、ChatGPTのサイドバー、アカウント表示、チャット履歴は写らないようにしています。

```text
docs/assets/readme/extension-paste-modal.png
docs/assets/readme/extension-send-modal.png
docs/assets/readme/extension-context-modal.png
```

## 掲載意図

- `screenshot-03-extension-modal.png`: Chrome拡張の貼り付け前確認モーダルを見せる。READMEではこの画像を先頭に掲載する
- `screenshot-04-options.png`: 拡張機能の設定、対象サイト、AI文脈チェック、本文を保存しない設計を見せる
- `screenshot-01-lp.png`: Chrome拡張が本体であることと、プロダクト価値をファーストビューで伝える
- `screenshot-02-demo.png`: 拡張を入れる前に、検出とマスク対象選択の流れを試せるミニデモとして見せる
- `extension-paste-modal.png`: 実機上の貼り付け前安全化モーダルを見せる
- `extension-send-modal.png`: 実機上の送信前安全化モーダルを見せる
- `extension-context-modal.png`: ルール検出なしでAI文脈チェックへ進む実機モーダルを見せる
- `promo-small-440x280.png`: 一覧で短く価値を伝える
- `promo-marquee-1400x560.png`: 大きな訴求枠用の横長画像

## 注意

- 画像内には実在の個人情報、実APIキー、実トークンを入れない
- 本文を保存しない設計と、WebLLMモデル取得が発生する場合があることは、ストア説明文でも別途明記する
- READMEとストア掲載のスクリーンショット順は、Chrome拡張の画面を優先し、LP/ミニデモは補助体験として後ろに置く
- README用の実機クロップ画像は、Chrome Web Storeの1280x800要件を満たすための画像ではない。ストア提出時はDeveloper Dashboardの要件に合わせて別途最終調整する
- ストア提出時にはDeveloper Dashboard上の最新バリデーションに従って最終確認する
