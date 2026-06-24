# Chrome Web Store差し戻し対応プレイブック

Chrome Web Storeの審査で差し戻しが発生した場合の原因分類、確認ファイル、説明テンプレート、再提出手順をまとめます。

審査中のバージョンがある場合は、承認または差し戻しの結果が出るまでZIPを差し替えません。差し戻しが出た場合は、先にIssue化し、PRで修正し、CIと公開前QAを通してから新しいZIPを作ります。

## 基本方針

- Googleからの指摘文を省略せずIssueへ転記する
- 指摘文にユーザー本文や実キーが含まれている場合は、public Issueへ貼る前にマスクする
- 原因を分類して、修正範囲を小さくする
- PRなしでZIPだけ作り直さない
- 既存公開版の説明、LP、プライバシーポリシー、Chrome Web Store入力内容を矛盾させない
- 再提出ZIPは、その時点の `main` から作成する

## 差し戻しIssueテンプレート

```md
## 差し戻し概要

- 対象バージョン:
- Googleからの指摘カテゴリ:
- 対象タブ:
- 指摘日時:
- 再提出期限や補足:

## Googleからの指摘文

> ここに指摘文を貼る。
> ユーザー本文、実APIキー、実トークン、実個人情報が含まれる場合はマスクする。

## 想定原因

- [ ] 権限
- [ ] ホスト権限
- [ ] プライバシー申告
- [ ] リモートコード扱い
- [ ] WebLLMモデル取得の説明
- [ ] 説明文・画像・メタデータ
- [ ] テスト手順
- [ ] その他

## 修正対象

- [ ] manifest / WXT設定
- [ ] Chrome Web Store掲載文
- [ ] プライバシーポリシー
- [ ] LP / support / README
- [ ] テスト手順
- [ ] コード
- [ ] QAコマンド

## 再確認

- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm qa:extension:manifest`
- [ ] `pnpm qa:chrome-store`
- [ ] `pnpm package:extension`
- [ ] 新しいZIPをDeveloper Dashboardへアップロード
```

## 原因別の確認表

| 指摘カテゴリ | まず見るファイル | 確認すること |
| --- | --- | --- |
| 権限 | `apps/extension/wxt.config.ts`, `docs/chrome-web-store-submission-copy.md` | `storage` などの権限理由が単一用途と一致しているか |
| ホスト権限 | `apps/extension/wxt.config.ts`, `docs/extension-site-qa.md` | ChatGPT / Claude / Gemini / Perplexity以外を不要に要求していないか |
| リモートコード | `apps/extension/wxt.config.ts`, `packages/llm`, `docs/chrome-web-store-release.md` | 外部から任意コードを取得して実行していない説明になっているか |
| WebLLMモデル取得 | `docs/chrome-web-store-submission-copy.md`, `docs/privacy-policy.md`, `README.md` | モデルファイル取得と本文非送信の説明が分かれているか |
| プライバシー申告 | `docs/privacy-policy.md`, `docs/chrome-web-store-submission-copy.md` | 収集データ、保存データ、送信しないデータの表現が一致しているか |
| データ使用 | Developer Dashboard, `docs/privacy-policy.md` | Webサイトのコンテンツなど必要なカテゴリを正しく申告しているか |
| 説明文 | `docs/chrome-web-store-listing.json`, `docs/chrome-web-store-submission-copy.md` | 「完全に安全」「100%検出」などの誇大表現がないか |
| 画像 | `docs/chrome-web-store-assets.json`, `docs/assets/store/` | 実在情報、実APIキー、アルファ付きPNG、サイズ違反がないか |
| テスト手順 | `docs/chrome-web-store-release.md` | 審査担当者がダミー情報で主要動作を確認できるか |

## 権限指摘時の確認項目

- `permissions` に単一用途と関係ない権限がない
- 初期実装で `<all_urls>` を要求していない
- host permissionsが対象サイトに限定されている
- `storage` は設定保存と検証済みリモートルールキャッシュだけに使う説明になっている
- ルール配信を使う場合も、送るのは `GET /api/rules/latest` だけで本文を送らない
- E2E専用host permissionやlocalhost設定がリリースmanifestへ混入していない

## プライバシー申告指摘時の確認項目

- 貼り付け本文、送信本文、添付前に読み取ったテキスト本文を永続保存しない
- 検出結果、placeholderMap、送信履歴を永続保存しない
- 開発者サーバーや外部LLM APIへ本文を送信しない
- 設定と検証済みリモートルールキャッシュだけを `chrome.storage.local` に保存する
- WebLLMモデル取得と本文送信を混同しない表現になっている
- Chrome Web Storeのデータ使用申告、LP、README、プライバシーポリシーが矛盾していない

## リモートコード指摘時の説明テンプレート

```text
この拡張機能は、拡張機能のロジックとして外部から任意のコードを取得して実行しません。

WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合があります。これは推論用モデルデータであり、ユーザーの貼り付け本文や送信本文を外部LLM APIへ送信するものではありません。

ルール配信を有効にしている場合も、取得するのは署名付きルールJSONのみです。拡張機能は公開鍵で署名を検証し、ユーザー本文、検出結果、placeholderMap、送信履歴をルール配信Workerへ送信しません。
```

## WebLLMモデル取得の説明テンプレート

```text
AI文脈チェックではWebLLMを利用し、検出と推論はユーザーのブラウザ内で実行されます。初回利用時にはローカル推論用のモデルファイルを取得する場合があります。モデル取得後はブラウザキャッシュやブラウザ管理下の保存領域を利用します。

モデルファイル取得は、貼り付け本文を外部LLM APIや開発者サーバーへ送信する処理ではありません。WebGPU非対応環境、シークレットモードの保存容量制限、プロキシやセキュリティソフトの制限により、AI文脈チェックを利用できない場合があります。その場合もルールベース検出は引き続き利用できます。
```

## 再提出手順

1. 差し戻しIssueを作成する
2. 原因カテゴリを決める
3. 修正ブランチを作る
4. コード、docs、LP、掲載文のうち必要な範囲だけを修正する
5. PRを作成する
6. CIと必要なローカルQAを通す
7. PRをmergeする
8. `main` を最新化する
9. `pnpm package:extension` で提出用ZIPを作る
10. `pnpm qa:chrome-store` を実行する
11. Developer Dashboardへ新しいZIPと必要な説明差分を反映する
12. 再提出する

## 再提出前チェックリスト

- [ ] 差し戻しIssueにGoogleの指摘と修正方針が残っている
- [ ] 修正PRがmerge済み
- [ ] `pnpm test` が通っている
- [ ] `pnpm build` が通っている
- [ ] `pnpm qa:extension:manifest` が通っている
- [ ] `pnpm qa:chrome-store` が通っている
- [ ] 新しいZIPは `main` から作成している
- [ ] ストア説明文、権限理由、プライバシー申告、LP、READMEが矛盾していない
- [ ] 実在の個人情報、実APIキー、実トークンをスクリーンショットや説明へ含めていない
