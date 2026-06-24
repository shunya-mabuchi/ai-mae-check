# QA/生成スクリプト保守方針

最終更新日: 2026-06-24

AIまえチェックでは、Chrome Web Store提出、公開文書同期、ブランド素材生成、ルール配信検証などを `scripts/` 配下の小さなNode.jsスクリプトで確認します。これらはプロダクトの本体機能ではありませんが、公開前品質を支えるため、テストと同じように責務が大きくなりすぎない状態を保ちます。

## 基本方針

- 1つのスクリプトは、1つのQA目的または1つの生成目的に絞る。
- ユーザー本文、検出文字列、placeholderMap、実APIキー、実トークンを出力しない。
- 外部サービスへ本文を送らない。
- 行数が増えた場合は、上限を上げる前に、設定、ファイル収集、検証、出力の責務を分けられないか確認する。
- 依存追加が必要な場合は、ライセンス、サイズ、CI実行時間を確認する。

## 2026-06-24時点の行数予算

| スクリプト | 現在の役割 | 上限 | 分割する場合の単位 |
| --- | --- | ---: | --- |
| `scripts/generate-brand-assets.mjs` | アイコン、ストア画像、README用画像の生成 | 380行 | canvas drawing / image sizing / file output |
| `scripts/check-chrome-store-readiness.mjs` | Chrome Web Store提出前のmanifest、素材、文書整合性確認 | 340行 | manifest checks / asset checks / store copy checks |
| `scripts/check-github-metadata.mjs` | Issue/PRタイトル・本文の日本語メタデータQA | 180行 | GitHub fetch / pattern checks / report output |

現時点では、上記スクリプトをすぐ物理分割しない判断にします。理由は、各スクリプトの目的がまだ1つに保たれており、分割によって読み手が追うファイル数だけ増える可能性があるためです。

ただし、予算を超えた場合は、上限を上げる前に責務分割を検討します。

## 確認コマンド

```bash
pnpm qa:script-maintenance
```

このQAはGit管理対象のスクリプトだけを確認します。依存キャッシュ、ビルド成果物、Chrome拡張の `.output` は対象にしません。
