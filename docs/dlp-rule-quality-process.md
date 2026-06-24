# DLP評価fixtureとルールカタログ追加基準

AIまえチェックでは、検出ルールを増やすたびに、検出精度、誤検出、公開リポジトリ安全性、Chrome Web Store説明への影響を確認します。この文書は、新しい同梱ルールまたは署名付き配信ルールを追加するときの運用チェックリストです。

## 基本方針

- 実在する個人情報、実APIキー、実token、実顧客名、実社内URLをfixtureやIssueへ入れない
- テストデータは必ずダミー値にする
- WebLLMではなく、確定的に拾える値はルールベース検出を優先する
- ルール追加は「検出できる」だけでなく、「過検出しすぎない」ことも確認する
- リモートルールとして配信する場合も、署名、version、rollback、ストア説明への影響を確認する

## 新しい同梱ルールを追加する基準

同梱ルールに向くもの:

- メール、電話番号、APIキー風文字列のように、形式が比較的安定している
- WebLLMなしでも高確度に検出できる
- 誤検出した場合のUI説明が分かりやすい
- Chrome Web Store再提出してでも、全ユーザーに常時適用したい

同梱前に確認すること:

- `packages/core/src/detectors/` の適切なカテゴリへ追加したか
- `DEFAULT_DETECTOR_RULE_ORDER` に追加したか
- `placeholderByRuleId` にplaceholder prefixを追加したか
- `docs/detection-rule-authoring.md` の同梱ルールカタログへ追加したか
- `packages/core/tests/detect.test.ts` またはカテゴリ別テストへ正常系と過検出系を追加したか
- `pnpm qa:rule-catalog` が通るか

## 新しい署名付き配信ルールを追加する基準

リモートルールに向くもの:

- 新しいサービスのtoken形式など、運用で早く追加したい
- まず小さく配信し、誤検出や表現を観察したい
- 拡張の再提出を待たずに検出対象へ追加したい
- 同梱ルール化する前にfixtureとロールバック運用を試したい

リモート配信前に確認すること:

- `id`、`label`、`riskLevel`、`category`、`placeholderPrefix`、`pattern`、`message`、`confidence` がガイドに合っている
- patternがReDoSにつながりにくい
- `payload.version` を上げた
- `generatedAt` と `expiresAt` が妥当
- 緊急停止が必要な場合は、署名済みpayloadの `deliveryStatus: "paused"` で停止できる
- `pnpm test:worker` と `pnpm qa:rules:production` の確認手順をPRに残す

## fixture追加基準

新しいルールまたは大きな判定変更では、最低限次の観点を用意します。

| fixture種別 | 目的 | 例 |
| --- | --- | --- |
| positive | 想定どおり検出できること | ダミーtoken、ダミーURL、ダミー金額 |
| false_positive | 似ているが検出すべきでない値を避けること | 短すぎるID、公開サンプル、説明文 |
| mixed_japanese | 日本語文中で検出できること | 日本語の依頼文にダミー値を混ぜる |
| overlap | 既存ルールとの重複解決が壊れないこと | URLとBasic認証URL、IDと.env secret |
| policy | PolicyDecisionが期待するactionになること | high/criticalは `sanitize_required` |

既存fixtureは `fixtures/dlp/` に置きます。新しいfixtureを追加した場合は、`pnpm eval:dlp` の出力で検出件数、最高危険度、policy actionを確認します。

## false positive / false negative確認

最低条件:

- positiveだけでなく、似た文字列を含むfalse_positiveを1つ以上確認する
- 日本語文と英数字が混在する入力で確認する
- 既存ルールとの重複時に、より高リスクまたは長い範囲が残ることを確認する
- 低confidenceまたは曖昧なものは、WebLLM候補またはmedium以下として扱うか検討する

検出漏れを完全になくすことは目的にしません。目的は、外部AIや外部フォームへ送る前に、消し忘れに気づく補助をすることです。

## PRチェックリスト

ルール追加PRでは、本文に次を記録します。

- 追加/変更したルールID
- 同梱ルールかリモートルールか
- riskLevelとcategoryの理由
- 使用したダミー値
- false_positive確認内容
- ReDoS観点
- 更新したドキュメント
- 実行したコマンド
- Chrome Web Store説明やプライバシー説明への影響有無

実データをPR本文、Issue、スクリーンショット、ログへ貼らないでください。

## 実行コマンド

```bash
pnpm test:core
pnpm eval:dlp
pnpm qa:rule-catalog
pnpm qa:public-repo
pnpm qa:privacy-regression
```

リモートルール配信を更新する場合:

```bash
pnpm test:worker
pnpm qa:rules:production
```

## 完了条件

- ルールカタログ、fixture、テスト、QAがそろっている
- publicリポジトリに実秘密情報や実個人情報が入っていない
- 本文、検出結果、placeholderMapを保存しない方針が維持されている
- 追加ルールが「完全な安全」を保証するものではないことが説明上も守られている
