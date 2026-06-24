# 検出ルール作成ガイドとルールカタログ

AIまえチェックの検出ルールは、メールアドレスやAPIキー風文字列のように確定的に拾いやすい情報を、ブラウザ内で素早く検出するためのものです。WebLLMは文脈上の注意候補を補助する役割であり、高リスク情報や秘密情報保護対象の一次判定はルールベース検出を優先します。

この文書では、新しい検出ルールを追加するときの命名、危険度、placeholder、テスト、署名付き配信前レビューをまとめます。

## ルールの種類

### 同梱ルール

- 実装場所: `packages/core/src/detectors/`
- 集約場所: `packages/core/src/rules.ts`
- helper: `packages/core/src/ruleHelpers.ts`
- カテゴリ別detector:
  - `packages/core/src/detectors/pii.ts`
  - `packages/core/src/detectors/secret.ts`
  - `packages/core/src/detectors/business.ts`
  - `packages/core/src/detectors/technical.ts`
- 利用方法: `detectSensitiveText(input)` で常に利用される
- 変更方法: コード変更、テスト、拡張の再ビルド、Chrome Web Store再提出が必要

同梱ルールは、安定性と説明可能性を重視します。誤検出が強いものや運用で微調整したいものは、いきなり同梱せず、配信ルールや実験用fixtureで検証します。

### 同梱ルールのカテゴリ構成

`packages/core/src/rules.ts` は公開API向けの集約だけを担当し、実際の検出器はカテゴリ別ファイルに置きます。

| ファイル | 主な責務 | 例 |
| --- | --- | --- |
| `detectors/pii.ts` | 個人情報や本人識別につながりやすい値 | メールアドレス、電話番号、クレジットカード風番号、マイナンバー風文字列、郵便番号 |
| `detectors/secret.ts` | 認証情報、token、秘密鍵、接続文字列 | JWT、AWS Access Key風文字列、GitHub token風文字列、秘密鍵、`.env`形式の秘密情報、Basic認証URL |
| `detectors/business.ts` | 業務文脈で注意したい値や行 | 金額、社外秘・注意語を含む文、社内URLっぽいもの |
| `detectors/technical.ts` | 技術的な識別子や補助的な値 | URL、IPv4アドレス、日付、長いID風文字列 |

検出順序は `detectors/index.ts` の `DEFAULT_DETECTOR_RULE_ORDER` で固定しています。カテゴリ内の実装場所を変えても、重複解決やマスキング結果の挙動が変わらないようにするためです。

### 署名付き配信ルール

- schema: `RemoteDetectorRuleDefinition`
- 取得API: `GET /api/rules/latest`
- 検証: `verifySignedRemoteRuleBundle`
- 合流方法: `detectSensitiveText(input, { extraRules })`
- ruleId: 拡張側では `remote:<id>` になる
- 保存方針: 初期実装ではメモリ上だけで使い、`chrome.storage.local` へ永続保存しない

配信ルールは、拡張を再提出せずに検出対象を更新するためのものです。ただし、署名済みであっても壊れた正規表現や誤検出が強いルールはユーザー体験を悪化させるため、レビューとロールバック方針を必須にします。

## ルールID命名規則

### 同梱ルール

- 小文字英数字と `_` を使う
- 既存ルールとの意味の衝突を避ける
- 意味が変わる場合は既存IDを再利用せず、新しいIDを作る
- placeholder prefixは `packages/core/src/ruleHelpers.ts` の `placeholderByRuleId` に追加する

例:

- `email`
- `github_token`
- `basic_auth_url`
- `internal_url`

### 配信ルール

`RemoteDetectorRuleDefinition.id` はschemaで次の形式に制限しています。

```text
^[a-z0-9][a-z0-9_-]{1,62}$
```

配信後に拡張側で使われるruleIdは `remote:<id>` になります。

例:

- `slack_webhook_url`
- `stripe_secret_key`
- `openai_api_key`
- `npm_token`

## フィールド設計

### `label`

- UIに出るため、日本語で短く具体的に書く
- 「危険」「漏洩」など不安を煽る語を乱用しない
- 例: `Slack webhook URL風文字列`、`Stripe secret key風文字列`

### `riskLevel`

| riskLevel | 判断基準 | 例 |
| --- | --- | --- |
| `critical` | 安全化なしでは送信させない最重度の重大情報。0.2系の再評価後も独立したblockではなく、`sanitize_required` の最重度として扱う。 | 本番秘密鍵、復旧不能な高権限token |
| `high` | そのまま送る前に安全化が必要な情報。秘密情報保護の対象になり得る。 | APIキー、秘密鍵、JWT、認証情報URL、Webhook URL、クレジットカード風番号、マイナンバー風文字列 |
| `medium` | 文脈によって注意が必要。詳細確認後にユーザー判断を許す。 | URL、社内URL、金額、社外秘文、社内文脈 |
| `low` | 補助的な注意対象。単体では送信不可にしない。 | 日付、郵便番号、長いID風文字列 |

迷った場合は、次を基準にします。

- 認証・署名・支払い・個人連絡先は原則 `high`
- 業務文脈や公開範囲に依存するものは原則 `medium`
- 単体では秘密性が低く、他情報と組み合わさると意味を持つものは `low`
- 誤検出が強いが放置すると危険なものは、まず `medium` または配信ルールで検証する

### `category`

配信ルールでは `DlpCategory` を指定できます。

代表例:

- `secret`: APIキー、Webhook、token、秘密鍵
- `email`: メールアドレス
- `phone`: 電話番号
- `financial`: 金額、請求、契約金額
- `legal`: 契約、NDA、法務
- `url`: URL、社内URL
- `id`: ID、トークン風文字列
- `other`: 判断が難しい補助カテゴリ

カテゴリはrisk scoreやPolicyDecisionの材料になるため、迷った場合はPRで理由を書きます。

### `placeholderPrefix`

配信ルールでは `placeholderPrefix` を指定します。同梱ルールでは `placeholderByRuleId` でprefixを管理します。

ルール:

- 大文字英数字と `_` を使う
- schema上は `^[A-Z0-9_]{2,40}$`
- UI上で意味が伝わる名前にする
- 末尾番号はマスキング処理が付けるため、prefixに `_1` を含めない

例:

- `SLACK_WEBHOOK`
- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`
- `NPM_TOKEN`

### `message`

- ユーザー向けに短い日本語で書く
- 「100%危険」「絶対漏洩」など断定しない
- 何を確認すべきかを書く

例:

```text
Webhook URLは外部へ送る前に確認したい秘密情報です。
```

### `confidence`

- 0から1の数値
- 正規表現で確度が高い場合は `0.9` 以上
- 誤検出があり得る場合は `0.7` から `0.85` 程度で扱う
- `confidence` はUIや並び順の補助であり、安全判定を断言するものではない

## 同梱ルールカタログ

| ruleId | label | riskLevel | placeholder例 | 備考 |
| --- | --- | --- | --- | --- |
| `email` | メールアドレス | `high` | `[EMAIL_1]` | 個人連絡先として高リスク |
| `phone` | 日本の電話番号 | `high` | `[PHONE_1]` | 日本の固定/携帯/フリーダイヤル風番号 |
| `jwt` | JWT | `high` | `[JWT_1]` | token風の3セグメント文字列 |
| `aws_access_key` | AWS Access Key風文字列 | `high` | `[AWS_KEY_1]` | `AKIA` / `ASIA` で始まる20文字程度 |
| `github_token` | GitHub token風文字列 | `high` | `[GITHUB_TOKEN_1]` | `ghp_`、`github_pat_` など |
| `slack_token` | Slack token風文字列 | `high` | `[SLACK_TOKEN_1]` | `xoxb-` などのSlack token風prefix |
| `stripe_secret_key` | Stripe secret key風文字列 | `high` | `[STRIPE_KEY_1]` | `sk_` / `rk_` のsecret/restricted key風文字列 |
| `openai_api_key` | OpenAI API key風文字列 | `high` | `[OPENAI_API_KEY_1]` | `sk-` / `sk-proj-` 形式 |
| `npm_token` | npm token風文字列 | `high` | `[NPM_TOKEN_1]` | `npm_` 形式 |
| `oauth_client_secret` | OAuth client secret風文字列 | `high` | `[OAUTH_CLIENT_SECRET_1]` | `client_secret=` / `clientSecret:` 形式 |
| `private_key` | 秘密鍵 | `high` | `[PRIVATE_KEY_1]` | PEM形式の秘密鍵 |
| `env_secret` | `.env`形式の秘密情報 | `high` | `[ENV_SECRET_1]` | KEY名にSECRET/TOKEN/API_KEY等を含む行 |
| `basic_auth_url` | Basic認証情報を含むURL | `high` | `[BASIC_AUTH_URL_1]` | `https://user:password@example.com` 形式 |
| `webhook_url` | Webhook URL風文字列 | `high` | `[WEBHOOK_URL_1]` | Slack / Discord webhook URL風文字列 |
| `database_url` | DATABASE_URL風接続文字列 | `high` | `[DATABASE_URL_1]` | DB接続URIにユーザー名とパスワードを含むもの |
| `credit_card` | クレジットカード風番号 | `high` | `[CARD_1]` | Luhnチェックあり |
| `my_number` | マイナンバー風文字列 | `high` | `[MY_NUMBER_1]` | 同じ行に「マイナンバー」または「個人番号」がある場合だけ検出 |
| `url` | URL | `medium` | `[URL_1]` | 外部共有前に文脈確認 |
| `ip_address` | IPv4アドレス | `medium` | `[IP_ADDRESS_1]` | 内部IPかどうかは文脈依存 |
| `amount` | 金額 | `medium` | `[AMOUNT_1]` | 見積/給与/契約文脈に注意 |
| `confidential_text` | 社外秘・注意語を含む文 | `medium` | `[CONFIDENTIAL_TEXT_1]` | 行単位で検出 |
| `internal_url` | 社内URLっぽいもの | `medium` | `[INTERNAL_URL_1]` | `internal`、`corp`、`staging`等 |
| `date` | 日付 | `low` | `[DATE_1]` | 単体では低リスク |
| `postal_code` | 郵便番号 | `low` | `[POSTAL_CODE_1]` | 住所と組み合わさると注意 |
| `long_id` | 長いID風文字列 | `low` | `[ID_1]` | 英数字混在16文字以上 |

## 配信ルールJSON例

```json
{
  "id": "slack_webhook_url",
  "label": "Slack webhook URL風文字列",
  "riskLevel": "high",
  "category": "secret",
  "placeholderPrefix": "SLACK_WEBHOOK",
  "pattern": "https://hooks\\.slack\\.com/services/[A-Za-z0-9/_-]+",
  "flags": "g",
  "message": "Webhook URLは外部へ送る前に確認したい秘密情報です。",
  "confidence": 0.96
}
```

## 誤検出と過検出を避ける観点

- ルールは「拾えること」だけでなく「拾いすぎないこと」を確認する
- 汎用的すぎる単語だけのルールを避ける
- 日本語文中で自然に出る単語を高リスクにしない
- URL系は `basic_auth_url` や `internal_url` と重なった場合の優先順位を考える
- `.env`系は行頭/KEY名/区切りを確認し、普通の文章を巻き込まない
- token系はprefix、長さ、利用される文字種をできるだけ絞る
- クレジットカード風番号はLuhnチェックのような追加条件を置く
- ReDoSにつながるネストした量指定子や極端なバックトラックを避ける
- 誤検出が強いルールは、最初から `high` にせず `medium` または `enabled: false` の検証候補にする

## ルール追加時のテスト観点

同梱ルールを追加する場合:

- `packages/core/tests/detect.test.ts` または専用テストに検出成功ケースを追加する
- 誤検出しないケースを追加する
- 重複範囲がある場合、より高リスク/長い範囲/早いstart/辞書順の優先順位を確認する
- `placeholderByRuleId` のprefixと連番を確認する
- `maskSensitiveText` で後ろから置換され、indexずれしないことを確認する
- READMEやこのカタログを更新する

配信ルールを追加する場合:

- `packages/core/tests/remoteRuleSchema.test.ts` でschemaに通ることを確認する
- `packages/core/tests/remoteRules.test.ts` で署名検証後に `detectSensitiveText(input, { extraRules })` へ合流できることを確認する
- `payload.version` を上げる
- ユーザー本文や実secretをfixtureへ入れない
- `pnpm test:core` と `pnpm test:worker` を実行する
- プレビューAPIで `alg`、`keyId`、`payload.version`、`signature` を確認する

## 署名付き配信前レビュー

1. ルールID、label、riskLevel、category、placeholderPrefix、messageがこのガイドに合っているか確認する
2. patternがschema上の長さ制限とflags制限に合っているか確認する
3. 誤検出しそうな一般文、URL、ダミーsecret、空文字、長文で試す
4. ReDoSにつながる表現がないか確認する
5. `payload.version` と `generatedAt` が更新されているか確認する
6. `minExtensionVersion` を上げる場合は理由をPRに書く
7. `pnpm qa:rule-catalog`、`pnpm test:core`、`pnpm test:worker` を実行する
8. Cloudflare Pages Previewで署名付きレスポンスを確認する
9. mainへマージ後、Productionの `/api/rules/latest` を確認する

## ロールバック基準

次の場合は、配信停止または修正ルール配信を優先します。

- 主要サイトで無関係な文章を大量に検出する
- `riskLevel` を高くしすぎて、通常利用を過度に止める
- 署名は正しいがpatternが意図しない範囲を巻き込む
- placeholderやlabelがユーザーに誤解を与える
- schema変更により古い拡張で期待どおりfallbackできない

ロールバック手順は [rule-delivery-operations.md](rule-delivery-operations.md) に従います。迷った場合は、壊れたルールを無理に返すより、同梱ルールへフォールバックする状態を優先します。
