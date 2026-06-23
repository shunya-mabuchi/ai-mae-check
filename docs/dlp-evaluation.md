# DLP評価fixture

AIまえチェックは、ユーザー本文、検出結果、placeholderMap、送信履歴を収集しません。
その代わりに、実在しないダミーデータだけで構成した評価fixtureを使い、ルールベース検出、ポリシー判定、安全化結果を継続確認します。

## 目的

- 実ユーザーデータを使わずに検出品質を確認する。
- ルールベース検出の意図しない退行を早く見つける。
- 誤検出しやすい表現を明示的に持つ。
- WebLLM実モデルロードなしでCIでも軽く実行できる品質ゲートにする。

## fixture構成

fixtureは `fixtures/dlp/*.json` に置きます。現時点では次のカテゴリを用意しています。

| fixture | 目的 |
| --- | --- |
| `safe` | 公開済みの一般説明文で検出なしを確認する |
| `pii` | メールアドレス、電話番号、郵便番号を確認する |
| `secrets` | ダミーのAPIキー、トークン、Basic認証URL、`.env`形式を確認する |
| `business_confidential` | NDA、関係者限り、金額、社内URLを確認する |
| `hr` | 採用・給与文脈のうち、ルールで取れる金額と日付を確認する |
| `legal` | 契約、NDA、口外禁止、金額、URL、日付を確認する |
| `false_positive` | 値として成立しない表現を検出しないことを確認する |

すべて実在しないダミー文です。公開リポジトリで安全に扱えるよう、実秘密情報や実個人情報は入れません。

## 評価コマンド

```bash
pnpm eval:dlp
```

このコマンドはVitest上で `packages/core/src` を読み込み、次を検証します。

- 検出件数
- riskLevelごとの件数
- 含まれるべき `ruleId`
- 含まれてはいけない `ruleId`
- `evaluateDlpPolicy` の `action` / `severity` / `canSendRaw` / `requiresSanitization`
- `transformText(..., "generalize")` の安全化結果
- `transformText(..., "mask")` のplaceholder結果

WebLLMの実モデルロードは行いません。文脈候補の品質評価は別の評価系で扱う想定です。

## CIでの扱い

GitHub ActionsのCIで `pnpm eval:dlp` を実行します。
これにより、ユーザー本文を収集しない設計を保ったまま、ルールベースDLPエンジンの退行を検知できます。

## fixture追加時の注意

- 実在する個人情報、APIキー、秘密鍵、顧客名、社内URLを入れない。
- 秘密鍵PEMなど、公開リポジトリ安全QAが検出する形式はfixtureに入れない。
- 実値に近いダミー文字列を追加する場合は、`scripts/check-public-repo-safety.mjs` の許可値と整合させる。
- 期待値をゆるくしすぎず、退行検知に役立つ粒度で書く。
