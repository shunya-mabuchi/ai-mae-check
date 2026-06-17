# Chrome Web Store 公開準備

このドキュメントは、AIまえチェックをChrome Web Storeへ提出するための公開前チェックリストです。紹介LPとミニデモは補助体験であり、ストア掲載ではChrome拡張としての貼り付け前・送信前確認を主役にします。

## 参照した公式ドキュメント

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
- `<all_urls>` は要求しない
- Perplexityは後続adapter扱い

## Chrome Web Store掲載文ドラフト

Developer Dashboardへ入力する掲載情報の原本は [chrome-web-store-listing.json](./chrome-web-store-listing.json) で管理します。このセクションは人間が読みやすい確認用のドラフトです。

### 拡張名

AIまえチェック

### 短い説明

AIに貼る前・送る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。

### 詳細説明

AIまえチェックは、ChatGPT、Claude、Geminiなどに文章を貼る前・送る前に、個人情報・秘密情報・APIキー・社外秘に近い内容の消し忘れに気づくためのChrome拡張です。

メールアドレス、電話番号、APIキー、秘密鍵、`.env`形式の秘密情報、Basic認証URL、クレジットカード風番号、社外秘に近い注意語などをブラウザ内で検出します。

また、WebLLMを利用したAI文脈チェックにより、正規表現では拾いにくい顧客名候補、人名候補、会社名候補、案件名候補、契約・採用・給与・法務などの文脈リスク候補を確認できます。

貼り付け本文や送信本文は永続保存しません。外部LLM APIや開発者サーバーへ本文を送信しません。設定のみChromeのローカル保存領域に保存します。

本拡張は、情報漏洩を完全に防ぐものではありません。検出漏れや誤検出が発生する可能性があります。最終的に送信するかどうかはユーザーが判断してください。

### カテゴリ候補

仕事効率化

### 言語

日本語

### サポートURL候補

GitHub Issues:

<https://github.com/shunya-mabuchi/ai-mae-check/issues>

### プライバシーポリシーURL候補

GitHub PagesまたはCloudflare Pagesで `docs/privacy-policy.md` を公開したURLを設定します。公開URLが確定するまでは、Chrome Web Store提出前チェックリストで未完了扱いにします。

## 権限理由ドラフト

### `storage`

拡張機能の有効/無効、対象サイトごとのON/OFF、検出ルールごとのON/OFF、WebLLMモデルIDなどの設定を、ユーザーのブラウザ内に保存するために使います。貼り付け本文や送信本文は保存しません。

### Host permissions

対象サイト上の通常入力欄で、貼り付け操作や送信前操作を検知し、ユーザーに確認画面を表示するために使います。初期対象はChatGPT、Claude、Geminiのみです。`<all_urls>` は要求しません。

対象:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`
- `https://gemini.google.com/*`

## Privacy practices入力方針

Chrome Web Store Developer DashboardのPrivacy practicesでは、次の方針で入力します。

### Single purpose

AIに文章を送る前に、個人情報・秘密情報・APIキーなどの消し忘れをブラウザ内で確認し、安全化候補を提示する。

### Permission justification

上記の「権限理由ドラフト」を利用します。

### Remote code

拡張機能のロジックとして外部から任意コードを取得して実行しません。

WebLLMの初回利用時にはローカル推論用のモデルファイルを取得する場合がありますが、これは推論用モデルデータであり、ユーザー本文を外部LLM APIへ送るものではありません。提出時にはDeveloper Dashboardの最新項目に合わせて、この説明を正確に記載します。

### Data usage

ユーザー本文、検出結果、マスキング用placeholderMap、送信履歴は収集・販売・共有しません。設定のみ `chrome.storage.local` に保存します。

## 画像アセット

画像要件と生成手順は [store-assets.md](./store-assets.md) にまとめています。

Chrome Web Storeの掲載情報では、128x128アイコン、1280x800スクリーンショット、440x280プロモーション画像、必要に応じて1400x560マーキー画像を使います。提出前QAでは、下記ファイルの存在とPNG寸法を確認します。

提出候補:

- `docs/assets/store/icon-128.png`
- `docs/assets/store/screenshot-03-extension-modal.png`
- `docs/assets/store/screenshot-04-options.png`
- `docs/assets/store/screenshot-01-lp.png`
- `docs/assets/store/screenshot-02-demo.png`
- `docs/assets/store/promo-small-440x280.png`
- `docs/assets/store/promo-marquee-1400x560.png`

スクリーンショットは、Chrome拡張の確認モーダルとOptions Pageを先頭にします。LPとミニデモは、拡張機能を入れる前に価値を理解するための補助画像として扱います。

READMEでは、実機確認時の拡張モーダルをトリミングした `docs/assets/readme/` 配下の画像だけを掲載しています。Chrome Web Store提出時は、Developer Dashboardの画像サイズ要件に合わせて `docs/assets/store/` 配下の生成画像案または実機スクリーンショットを最終調整します。

## ビルドとZIP作成

```bash
pnpm package:extension
```

このコマンドは、core / llm をビルドした後、WXTの `wxt zip` でChrome Web Store提出用ZIPを作成します。

提出前に少なくとも次を実行します。

```bash
pnpm test
pnpm typecheck
pnpm build:extension
pnpm package:extension
pnpm qa:extension:manifest
pnpm qa:chrome-store
```

`pnpm qa:chrome-store` は、提出用ZIP、掲載JSON、プライバシーポリシー、ストア画像寸法、誇大表現の混入をまとめて確認します。Developer Dashboardへの入力前に実行してください。

## 手動チェックリスト

提出前:

- [ ] `pnpm test` が通る
- [ ] `pnpm typecheck` が通る
- [ ] `pnpm build:extension` が通る
- [ ] `pnpm package:extension` でZIPを作成できる
- [ ] `pnpm qa:extension:manifest` が通る
- [ ] `pnpm qa:chrome-store` が通る
- [ ] `apps/extension/.output/chrome-mv3/manifest.json` の名称・説明・権限を確認する
- [ ] `storage` 以外の不要な権限が増えていない
- [ ] `<all_urls>` を要求していない
- [ ] 対象サイトがChatGPT / Claude / Geminiに限定されている
- [ ] READMEとプライバシー方針に、本文を保存・送信しないことが書かれている
- [ ] WebLLMモデル取得が発生する場合があることを書いている
- [ ] 外部LLM APIを使わないことを書いている
- [ ] 画像に実在の個人情報・実APIキー・実トークンが含まれていない
- [ ] ストア掲載文に「完全に安全」「100%検出」などの誇大表現がない

実機確認:

- [ ] ChatGPTでpaste検知を確認する
- [ ] Claudeでpaste検知を確認する
- [ ] Geminiでpaste検知を確認する
- [ ] 送信前確認モーダルを確認する
- [ ] high / critical / 秘密情報保護の対象が安全化なしでは送信不可になることを確認する
- [ ] mediumが詳細確認から許可可能であることを確認する
- [ ] WebLLMが使えない環境でもルールベース検出が使えることを確認する
- [ ] モデル取得失敗時の日本語メッセージを確認する

Developer Dashboard:

- [ ] ZIPをアップロードする
- [ ] Store listingを入力する
- [ ] Privacy practicesを入力する
- [ ] Distributionを設定する
- [ ] Test instructionsを入力する
- [ ] 公開前にプレビュー表示を確認する

## Test instructionsドラフト

Chrome Web Store審査向けのテスト手順ドラフトです。

1. 拡張機能をインストールします。
2. `https://chatgpt.com/` を開きます。
3. 通常の入力欄に、ダミーのメールアドレス、電話番号、APIキー風文字列を含む文章を貼り付けます。
4. 貼り付け前または送信前の確認モーダルが表示されることを確認します。
5. 「安全化して貼り付け」「安全化して送信」などのマスク系操作で、検出箇所がプレースホルダーに置き換わることを確認します。
6. Options Pageを開き、対象サイトや検出ルールのON/OFF設定が保存されることを確認します。

テストデータには実在の個人情報や実APIキーを使わないでください。
