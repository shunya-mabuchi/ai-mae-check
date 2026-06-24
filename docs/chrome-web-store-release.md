# Chrome Web Store 公開・運用メモ

このドキュメントは、AIまえチェックをChrome Web Storeへ提出・運用するためのメモです。紹介LPとミニデモは補助体験であり、ストア掲載ではChrome拡張としての貼り付け前・送信前確認を主役にします。

## 現在のステータス

- 0.1.0はChrome Web Storeで一般公開済みです。
- 公開URL: <https://chrome.google.com/webstore/detail/idedmkfplfieijdcflcogkngplhkkecc>
- ルール配信APIはCloudflare Pages Functionsで実装済みです。0.1.1では `keyId` を `ai-mae-check-rules-2026-06-v2` へ更新し、本番署名付きルールJSONを拡張側公開鍵で検証できる状態にしています。
- 署名付きルール配信の鍵ローテーションとロールバック手順は [release-0.1.1-rule-delivery-plan.md](./release-0.1.1-rule-delivery-plan.md) と [rule-delivery-operations.md](./rule-delivery-operations.md) にまとめています。

## 参照する公式ドキュメント

- Chrome Web Store: Publish in the Chrome Web Store  
  <https://developer.chrome.com/docs/webstore/publish>
- Chrome Web Store: Create a store listing  
  <https://developer.chrome.com/docs/webstore/cws-dashboard-listing>
- Chrome Web Store: Privacy practices  
  <https://developer.chrome.com/docs/webstore/cws-dashboard-privacy>

## manifest確認

現在の公開前提:

- 拡張名: `AIまえチェック`
- 説明: `AIに貼る前・送る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。`
- Manifest: V3
- 権限: `storage`
- 対象サイト:
  - `https://chatgpt.com/*`
  - `https://chat.openai.com/*`
  - `https://claude.ai/*`
  - `https://gemini.google.com/*`
  - `https://www.perplexity.ai/*`
  - `https://perplexity.ai/*`
- `<all_urls>` は要求しない

## Chrome Web Store掲載文

Developer Dashboardへ入力する掲載情報の原本は [chrome-web-store-listing.json](./chrome-web-store-listing.json) で管理します。審査画面へそのまま貼り付けるための最終版は [chrome-web-store-submission-copy.md](./chrome-web-store-submission-copy.md) にまとめています。

掲載カテゴリは `ツール`、言語は `日本語` です。ホームページURL、サポートURL、プライバシーポリシーURLは以下を使います。

- ホームページ: <https://ai-mae-check.pages.dev/>
- サポート: <https://ai-mae-check.pages.dev/support>
- プライバシーポリシー: <https://ai-mae-check.pages.dev/privacy>

## 権限理由

### `storage`

拡張機能の有効/無効、対象サイトごとのON/OFF、検出ルールごとのON/OFF、WebLLMモデル設定など、ユーザーが選択した設定をブラウザ内に保存するために使用します。貼り付け本文、送信本文、検出結果、マスキング用のplaceholderMapは保存しません。

### Host permissions

ChatGPT、Claude、Gemini、Perplexity上の入力欄で貼り付け操作や送信前操作を検知し、ユーザーに確認画面を表示するために使用します。対象サイトは対応サイトに限定し、`<all_urls>` は要求しません。

## Privacy practices入力方針

### Single purpose

AIまえチェックは、ChatGPT、Claude、Gemini、Perplexityなどに文章を貼り付ける前・送信する前に、個人情報、秘密情報、APIキーなどの消し忘れをブラウザ内で確認し、安全化候補を提示するための拡張機能です。貼り付け本文や送信本文は永続保存せず、外部LLM APIや開発者のサーバーへ本文を送信しません。

### Remote code

「いいえ、リモートコードを使用していません」を選択します。

拡張機能のロジックとして外部から任意のコードを取得して実行しません。WebLLMの初回利用時にはローカル推論用のモデルファイルを取得する場合がありますが、これは推論用モデルデータであり、ユーザー本文を外部LLM APIへ送信するものではありません。ルール配信を有効にしている場合も、取得するのは `GET /api/rules/latest` の署名付きルールJSONのみで、リクエスト本文は使用しません。

### Data usage

Chrome Web Storeのフォームでは、拡張機能が入力欄テキストをブラウザ内で検査するため、以下を開示します。

チェックするカテゴリ:

- 個人を特定できる情報
- 財務状況や支払いに関する情報
- 認証に関する情報
- 個人的コミュニケーション
- ウェブサイトのコンテンツ

チェックしないカテゴリ:

- 健康に関する情報
- 位置情報
- ウェブ履歴
- ユーザーのアクティビティ

表明する内容:

- 承認されている以外の用途で第三者にユーザーデータを販売、転送しない
- アイテムの唯一の目的と関係のない目的でユーザーデータを使用または転送しない
- 信用力を判断する目的または融資目的でユーザーデータを使用または転送しない

## 画像アセット

画像要件と生成手順は [store-assets.md](./store-assets.md) にまとめています。アップロード順と用途の最終セットは [chrome-web-store-assets.json](./chrome-web-store-assets.json) で管理します。

提出する画像:

- `docs/assets/store/icon-128.png`
- `docs/assets/store/screenshot-01-real-paste-modal.png`
- `docs/assets/store/screenshot-02-real-send-modal.png`
- `docs/assets/store/screenshot-03-real-context-modal.png`
- `docs/assets/store/promo-small-440x280.png`
- `docs/assets/store/promo-marquee-1400x560.png`

READMEでは、実機確認時の拡張モーダルをトリミングした `docs/assets/readme/` 配下の画像だけを掲載しています。Chrome Web Store提出時は、Developer Dashboardの画像サイズ要件に合わせた `docs/assets/store/` 配下の画像を使います。

## ビルドとZIP作成

通常の提出前に実行するコマンド:

```bash
pnpm test
pnpm typecheck
pnpm build:extension
pnpm package:extension
pnpm qa:public-repo
pnpm qa:public-docs
pnpm qa:privacy-regression
pnpm qa:webllm-model-policy
pnpm qa:dependency-policy
pnpm qa:release-policy
pnpm qa:demo:seo
pnpm qa:portfolio-case-study
pnpm qa:extension:size
pnpm qa:extension:manifest
pnpm qa:chrome-store
```

0.1.0公開後に新しいZIPを作成した場合でも、Developer Dashboardへアップロードするのは0.1.1の修正計画と確認項目が固まってからにします。

## 手動チェックリスト

公開後:

- [x] Chrome Web Store公開URLを確認する
- [x] サポートURLとプライバシーポリシーURLが開けることを確認する
- [x] LPの主CTAをChrome Web Store追加リンクへ差し替える
- [x] 0.1.1でルール配信署名を有効化し、本番APIの署名付きJSONを確認する

次バージョン提出前:

- [ ] `pnpm test` が通る
- [ ] `pnpm typecheck` が通る
- [ ] `pnpm build:extension` が通る
- [ ] `pnpm package:extension` でZIPを作成できる
- [ ] `pnpm qa:public-repo` が通る
- [ ] `pnpm qa:public-docs` が通る
- [ ] `pnpm qa:privacy-regression` が通る
- [ ] `pnpm qa:webllm-model-policy` が通る
- [ ] `pnpm qa:webllm-compatibility` が通る
- [ ] `pnpm qa:rule-catalog` が通る
- [ ] `pnpm qa:extension:e2e-harness` が通る
- [ ] `pnpm qa:dependency-policy` が通る
- [ ] `pnpm qa:release-policy` が通る
- [ ] `pnpm qa:demo:seo` が通る
- [ ] `pnpm qa:portfolio-case-study` が通る
- [ ] `pnpm qa:extension:size` が通る
- [ ] `pnpm qa:extension:manifest` が通る
- [ ] `pnpm qa:chrome-store` が通る
- [ ] `apps/extension/.output/chrome-mv3/manifest.json` の名称・説明・権限を確認する
- [ ] 権限・CSP・依存関係監査 [extension-security-audit.md](extension-security-audit.md) を確認する
- [ ] `<all_urls>` を要求していない
- [ ] 対象サイトがChatGPT / Claude / Gemini / Perplexityに限定されている
- [ ] READMEとプライバシー方針に、本文を保存・送信しないことが書かれている
- [ ] WebLLMモデル取得が発生する場合があることを書いている
- [ ] 外部LLM APIを使わないことを書いている
- [ ] 画像に実在の個人情報・実APIキー・実トークンが含まれていない
- [ ] ストア掲載文に過度な安全保証や検出率を断言する誇大表現がない

実機確認:

- [ ] ChatGPTでpaste検知を確認する
- [ ] Claudeでpaste検知を確認する
- [ ] Geminiでpaste検知を確認する
- [ ] Perplexityでpaste検知を確認する
- [ ] 送信前確認モーダルを確認する
- [ ] high / critical / 秘密情報保護の対象が安全化なしでは送信不可になることを確認する
- [ ] mediumが詳細確認から許可可能であることを確認する
- [ ] WebLLMが使えない環境でもルールベース検出が使えることを確認する
- [ ] モデル取得失敗時の日本語メッセージを確認する
- [ ] [WebLLM対応環境とモデル互換性マトリクス](webllm-compatibility-matrix.md) に、OS、Chrome、WebGPU状態、エラー分類を本文なしで記録する
- [ ] 拡張E2Eハーネス方針 [extension-e2e-harness.md](extension-e2e-harness.md) に従い、リリース用manifestへE2E専用host permissionが混入していないことを確認する

## 公開後の対応

1. Chrome Web Store公開URLをREADMEとLPに反映する。
2. LPの主CTAが「Chrome Web Storeで追加」になっていることを確認する。
3. 公開されたバージョンに対応するGit tagとGitHub Releaseを作成する。
4. 0.1.1以降の再提出では、該当Issue、検証コマンド、ZIPハッシュ、既知の制限をRelease本文へ記録する。

## 差し戻し時の対応

原因別の確認表、Issueテンプレート、リモートコードやWebLLMモデル取得の説明文は [chrome-web-store-rejection-playbook.md](./chrome-web-store-rejection-playbook.md) にまとめています。

1. Googleの指摘内容をIssueへ転記する。実本文や実キーが含まれる場合はマスクする。
2. 仕様・権限・説明文・プライバシー申告・リモートコード扱いのどれが原因か切り分ける。
3. 修正PRを作成する。
4. CIと公開前QAを通す。
5. `main` から新しいZIPを作成し、再提出する。

## Test instructionsドラフト

Chrome Web Store審査向けのテスト手順ドラフトです。

1. 拡張機能をインストールします。
2. `https://chatgpt.com/` を開きます。
3. 通常の入力欄に、ダミーのメールアドレス、電話番号、APIキー風文字列を含む文章を貼り付けます。
4. 貼り付け前または送信前の確認モーダルが表示されることを確認します。
5. 「安全化して貼り付け」「安全化して送信」などのマスク系操作で、検出箇所が日本語ラベルのプレースホルダーに置き換わることを確認します。
6. Options Pageを開き、対象サイトや検出ルールのON/OFF設定が保存されることを確認します。

テストデータには実在の個人情報や実APIキーを使わないでください。
