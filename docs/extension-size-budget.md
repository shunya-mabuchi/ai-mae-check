# 拡張ZIPとbundleサイズ予算

AIまえチェックはWebLLM bridgeを含むため、通常の小さなChrome拡張よりJavaScript bundleが大きくなります。Chrome Web Storeの上限だけを基準にすると肥大化に気づきにくいため、公開前QAとして内部予算を置きます。

## 現在の予算

| 対象 | 予算 | 理由 |
| --- | ---: | --- |
| Chrome Web Store提出ZIP | 20MB以下 | 現在の0.1.1 ZIPは約9MB。倍以上の余裕を持ちつつ、急な肥大化を検知します。 |
| 展開後の `chrome-mv3` | 35MB以下 | WebLLM workerやchunksを含めた実体サイズの肥大化を見るためです。 |
| 単一JavaScriptファイル | 8MB以下 | WebLLM由来の大きなchunkを許容しつつ、意図しない依存混入を検知します。 |
| content script | 300KB以下 | 対象サイトへ常時注入されるため、軽さを優先します。 |
| CSS | 150KB以下 | モーダルUIとOptions Pageのスタイル肥大化を抑えます。 |

## 確認コマンド

```bash
pnpm package:extension
pnpm qa:extension:size
```

`pnpm qa:extension:size` は `apps/extension/.output/chrome-mv3` と提出ZIPを確認します。出力がない場合は、先に `pnpm package:extension` を実行してください。

## 予算を超えた場合

- WebLLM関連chunkが増えた場合は、重複bundleやworker読み込み経路を確認する
- content scriptが増えた場合は、ページへ常時注入する責務と、必要時だけ動く処理を分ける
- Options PageやLP由来の依存が拡張本体へ混ざっていないか確認する
- 予算を上げる場合は、PR本文に理由、増加量、ユーザー体験への影響を書き、READMEとこの文書も更新する

## Chrome Web Storeへの提出との関係

このQAはChrome Web Storeの公式審査条件そのものではありません。0.1.1のZIPは、残Issueをすべて解消してから作り直して提出します。提出前には `pnpm package:extension`、`pnpm qa:extension:size`、`pnpm qa:extension:manifest`、`pnpm qa:chrome-store` を通します。
