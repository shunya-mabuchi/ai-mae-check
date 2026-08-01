# Biome段階導入方針

AIまえチェックでは、Biomeを一般的なコード品質検査とformatterの基盤として使います。一方、文字化け、ユーザー本文のログ出力禁止、公開リポジトリへ秘密情報を含めないことなどはプロダクト固有の要件であり、Biomeだけへ置き換えません。

## コマンド

```bash
pnpm lint
pnpm lint:report
pnpm format:check
pnpm format
```

- `pnpm lint`: CIとローカルで共通の必須検査です。Biomeのエラー、formatter対象、リポジトリ固有QAを確認します。
- `pnpm lint:report`: 段階的に解消するBiomeのwarningとinfoを含めて表示します。
- `pnpm format:check`: 現在formatter対象にしているファイルを変更せず確認します。
- `pnpm format`: 現在formatter対象にしているファイルだけを書き換えます。

## 初期対象

Biomeのlintは、追跡中のTypeScript、TSX、JavaScript、MJS、CJS、JSONを対象にします。次は生成物または別の検証責務を持つため除外します。

- `node_modules`、`dist`、`.output`、`.output-e2e`、`.wxt`
- `coverage`、`test-results`、`artifacts`
- `apps/site/public` の公開用生成物
- `fixtures` の評価データ
- `rules/latest.json` の署名付き配信物

Tailwind CSS 4の`@source`、`@theme`、`source(none)`を含むCSSは初期Biome対象から外し、`pnpm qa:tailwind4`で検証します。

## formatterの段階適用

初回は大量の無関係な差分を避けるため、`biome.json`、ルート`package.json`、小さく独立した`packages/design-tokens/src`をformatter対象にします。対象を広げる場合は、機能変更と混ぜず、ディレクトリ単位の独立PRで行います。

formatter対象は`.gitattributes`でLFへ固定します。Windowsでも対象ファイルの改行をGitとBiomeで一致させ、CIと同じ合否になることを優先します。

Biome Assistのimport整理も初回は無効です。既存コードを一括変換せず、警告件数と差分を確認しながら対象を広げます。

## 維持する独自QA

`scripts/check-static-lint.mjs`は次を引き続き検査します。

- 文字化けの可能性がある文字列
- 明示的な`any`と型検査の迂回
- 実行時コードのconsole出力
- `eslint-disable`、`biome-ignore`による検査回避
- Biomeの必須ルール、除外、コマンド設定
- CIで`pnpm lint`が実行されること

プライバシー設計の回帰は、さらに`pnpm qa:privacy-regression`で確認します。
