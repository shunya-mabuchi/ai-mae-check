# Chrome Web Store 掲載文 最終版

このファイルは、Chrome Web Store Developer Dashboardへ貼り付けるための最終入力文です。

現時点の公開URLとして、Cloudflare Pages上のサポートページとプライバシーポリシーページを使います。サポートページ内の問い合わせ先としてGitHub Issuesを案内します。

## Store listing

### 拡張名

AIまえチェック

### 短い説明

AIに送る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。

### 詳細説明

AIまえチェックは、ChatGPT、Claude、Geminiなどに文章を貼る前・送る前に、個人情報・秘密情報・APIキー・社外秘に近い内容の消し忘れに気づくためのChrome拡張です。

メールアドレス、電話番号、APIキー、秘密鍵、.env形式の秘密情報、Basic認証URL、クレジットカード風番号、社外秘に近い注意語などをブラウザ内で検出します。

高リスク情報や秘密情報保護の対象が含まれる場合は、そのまま送信せず、安全化した内容を確認してから送れるようにします。中リスクの内容は、詳細を確認したうえでユーザーが送信可否を判断できます。

WebLLMを利用したAI文脈チェックにより、正規表現では拾いにくい顧客名候補、人名候補、会社名候補、案件名候補、契約・採用・給与・法務などの文脈リスク候補を確認できます。AI文脈チェックは補助的な候補提示であり、最終的な安全判定を断言するものではありません。

貼り付け本文や送信本文は永続保存しません。外部LLM APIや開発者サーバーへ本文を送信しません。設定のみChromeのローカル保存領域に保存します。

WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合があります。モデル取得後はブラウザキャッシュやブラウザ管理下の保存領域を利用します。

本拡張は情報漏洩を完全に防ぐものではありません。検出漏れや誤検出が発生する可能性があります。最終的に送信するかどうかはユーザーが判断してください。

### カテゴリ

仕事効率化

### 言語

日本語

### サポートURL

https://ai-mae-check.pages.dev/support

### プライバシーポリシーURL

https://ai-mae-check.pages.dev/privacy

### Mature content

無効

## Privacy practices

### Single purpose

AIに文章を送る前に、個人情報・秘密情報・APIキーなどの消し忘れをブラウザ内で確認し、安全化候補を提示する。

### Permission justification: storage

拡張機能の有効/無効、対象サイトごとのON/OFF、検出ルールごとのON/OFF、WebLLMモデルIDなどの設定を、ユーザーのブラウザ内に保存するために使います。貼り付け本文や送信本文は保存しません。

### Permission justification: host permissions

ChatGPT、Claude、Gemini上の通常入力欄で貼り付け操作や送信前操作を検知し、ユーザーに確認画面を表示するために使います。初期対象サイトに限定し、<all_urls> は要求しません。

対象サイト:

- https://chatgpt.com/*
- https://chat.openai.com/*
- https://claude.ai/*
- https://gemini.google.com/*

### Remote code

No, I am not using remote code.

拡張機能のロジックとして外部から任意コードを取得して実行しません。WebLLMの初回利用時にはローカル推論用のモデルファイルを取得する場合がありますが、これは推論用モデルデータであり、ユーザー本文を外部LLM APIへ送るものではありません。

### Data usage

貼り付け本文、送信本文、検出結果、マスキング用placeholderMap、送信履歴は収集・販売・共有しません。本文は永続保存せず、設定のみ chrome.storage.local に保存します。

Dashboard上のデータ収集欄では、AIまえチェックが開発者サーバーへ送信・収集するユーザーデータはない、という方針で入力します。本文はユーザーのブラウザ内で検出・変換に使われますが、開発者が取得するデータとしては扱いません。

## スクリーンショットアップロード順

1. `docs/assets/store/screenshot-01-real-paste-modal.png`
2. `docs/assets/store/screenshot-02-real-send-modal.png`
3. `docs/assets/store/screenshot-03-real-context-modal.png`

アイコンとプロモーション画像:

- `docs/assets/store/icon-128.png`
- `docs/assets/store/promo-small-440x280.png`
- `docs/assets/store/promo-marquee-1400x560.png`

## Test instructions

1. 拡張機能をインストールします。
2. https://chatgpt.com/ を開きます。
3. 通常の入力欄に、実在しないダミーのメールアドレス、電話番号、APIキー風文字列を含む文章を貼り付けます。
4. 貼り付け前または送信前の確認モーダルが表示されることを確認します。
5. 安全化して貼り付け、または安全化して送信で、検出箇所が日本語ラベルのプレースホルダーに置き換わることを確認します。
6. Options Pageを開き、対象サイトや検出ルールのON/OFF設定が保存されることを確認します。

テストデータには実在の個人情報や実APIキーを使わないでください。

## 手動で差し替える可能性がある項目

- プライバシーポリシーURL: `https://ai-mae-check.pages.dev/privacy` を使う。
- Homepage URL: `https://ai-mae-check.pages.dev/` を使う。
- Official URL: Google Search Consoleで所有確認が済んだ後に設定する。
