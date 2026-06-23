# Chrome拡張 権限・CSP・依存関係監査チェックリスト

AIまえチェックをChrome Web Storeへ継続的に出すための、権限、CSP、web accessible resources、依存関係、WebLLMモデル説明の監査チェックリストです。

バージョンアップ前、権限変更時、WebLLMや依存関係の更新時、Chrome Web Store差し戻し時に使います。

## 監査の原則

- `<all_urls>` を無条件に要求しない
- 対象サイトは ChatGPT / Claude / Gemini に限定する
- Perplexityは後続adapterとして扱い、初期host permissionには含めない
- 権限は単一用途に必要な範囲だけにする
- 外部LLM APIを使わない
- ユーザー本文、送信本文、検出結果、placeholderMapを開発者サーバーへ送らない
- 外部から任意コードを取得して実行しない
- WebLLMモデルファイル取得とリモートコードを混同しない説明にする
- 依存関係とモデルのライセンス説明をREADME、LP、ストア掲載文と矛盾させない

## manifest監査

対象:

- `apps/extension/wxt.config.ts`
- `apps/extension/.output/chrome-mv3/manifest.json`
- `scripts/check-extension-manifest.mjs`
- `scripts/check-chrome-store-readiness.mjs`

チェック:

- [ ] `manifest_version` が3である
- [ ] `permissions` が `storage` のみに収まっている
- [ ] `host_permissions` が `https://chatgpt.com/*`, `https://chat.openai.com/*`, `https://claude.ai/*`, `https://gemini.google.com/*` に限定されている
- [ ] `<all_urls>` が入っていない
- [ ] `localhost` や `127.0.0.1` がリリースmanifestに入っていない
- [ ] Perplexityのhost permissionが初期リリースに混入していない
- [ ] `content_scripts.matches` がhost permissionsと同じ対象サイトに収まっている
- [ ] `web_accessible_resources` はWebLLM bridgeやworkerなど必要なファイルだけを公開している
- [ ] アイコン、名称、説明がChrome Web Store掲載文と一致している

確認コマンド:

```bash
pnpm build:extension
pnpm qa:extension:manifest
pnpm qa:chrome-store
```

## CSP監査

対象:

- `apps/extension/wxt.config.ts`
- ビルド後の `manifest.json`

チェック:

- [ ] `content_security_policy.extension_pages` が必要最小限である
- [ ] `script-src` に不要な外部originがない
- [ ] `worker-src` がWebLLM Worker実行に必要な範囲だけである
- [ ] `wasm-unsafe-eval` など、WebLLM実行上必要な指定がある場合は理由をPR本文に書く
- [ ] 外部から任意JavaScriptを取得して実行する実装がない
- [ ] CSP変更時はChrome Web Storeのリモートコード説明も確認する

## web accessible resources監査

対象:

- `llm-bridge.html`
- `llm-worker.js`
- `apps/extension/entrypoints`

チェック:

- [ ] content scriptから必要なbridge/workerだけにアクセスできる
- [ ] ユーザー本文や検出結果を静的ファイルとして出力していない
- [ ] テスト専用HTMLやローカル検証ファイルが公開対象に混入していない
- [ ] bridge iframeは対象ページ側のCSPに巻き込まれにくい説明になっている

## リモートコード扱いの監査

チェック:

- [ ] 拡張ロジックとして外部JavaScriptを取得して実行していない
- [ ] ルール配信は署名付きJSONだけを取得し、公開鍵で検証する
- [ ] ルール配信へユーザー本文、検出結果、placeholderMapを送っていない
- [ ] WebLLMモデルファイルは推論用モデルデータとして説明し、本文送信ではないことを明記する
- [ ] Chrome Web Store掲載文、プライバシーポリシー、README、LPで説明が一致している

関連:

- [chrome-web-store-rejection-playbook.md](chrome-web-store-rejection-playbook.md)
- [rule-delivery.md](rule-delivery.md)
- [privacy-policy.md](privacy-policy.md)

## 依存関係監査

対象:

- `package.json`
- `pnpm-lock.yaml`
- `apps/extension/package.json`
- `packages/core/package.json`
- `packages/llm/package.json`
- [dependency-maintenance.md](dependency-maintenance.md)
- [license-policy.md](license-policy.md)

チェック:

- [ ] Chrome拡張本体に不要なフロントエンド/開発用依存が混入していない
- [ ] 新規依存のライセンスが商用利用と公開配布に支障ない
- [ ] GPLなど配布条件が重いライセンスを含む場合は利用箇所を明確にする
- [ ] WebLLMモデルや推論関連の依存は、モデルライセンスと別に確認する
- [ ] `pnpm-lock.yaml` の差分が意図した依存更新だけである
- [ ] 依存更新PRに、権限、CSP、bundle size、Chrome Web Store説明への影響を書いている

確認コマンド:

```bash
pnpm qa:dependency-policy
pnpm qa:extension:size
pnpm build:extension
```

## WebLLMモデルとライセンス監査

対象:

- [webllm-model-policy.md](webllm-model-policy.md)
- [webllm-compatibility-matrix.md](webllm-compatibility-matrix.md)
- `packages/llm`

チェック:

- [ ] 標準モデルIDがREADMEと実装で一致している
- [ ] モデル配信元に依存する可能性を説明している
- [ ] 外部LLM APIを使わない説明になっている
- [ ] WebGPU非対応時もルールベース検出が使える
- [ ] モデルライセンス、商用利用可否、WebLLM prebuilt対応を確認している
- [ ] 実機確認メモに本文を含めていない

確認コマンド:

```bash
pnpm qa:webllm-model-policy
pnpm test:llm
```

## Chrome Web Store掲載文との整合性

対象:

- [chrome-web-store-listing.json](chrome-web-store-listing.json)
- [chrome-web-store-submission-copy.md](chrome-web-store-submission-copy.md)
- [chrome-web-store-release.md](chrome-web-store-release.md)
- [privacy-policy.md](privacy-policy.md)
- README

チェック:

- [ ] 単一用途が「AIへ送る前・送信前のDLP補助」に収まっている
- [ ] `storage` の理由が設定保存に限定されている
- [ ] host permissionsの理由が対象サイト上の貼り付け/送信前確認に限定されている
- [ ] 「完全に安全」「100%検出」「すべて防ぐ」などの表現がない
- [ ] 本文非保存、外部LLM API不使用、WebLLMモデル取得の説明が矛盾していない
- [ ] 画像に実在の個人情報、実APIキー、実トークンが含まれていない

確認コマンド:

```bash
pnpm qa:public-docs
pnpm qa:chrome-store
pnpm qa:public-repo
```

## バージョンアップ前チェック

- [ ] IssueとPRで変更理由を残している
- [ ] `pnpm test` が通っている
- [ ] `pnpm build` が通っている
- [ ] `pnpm package:extension` が通っている
- [ ] `pnpm qa:extension:manifest` が通っている
- [ ] `pnpm qa:extension:size` が通っている
- [ ] `pnpm qa:chrome-store` が通っている
- [ ] `pnpm qa:public-repo` が通っている
- [ ] `pnpm qa:public-docs` が通っている
- [ ] `pnpm qa:privacy-regression` が通っている
- [ ] 生成したZIPをGit管理していない
- [ ] Chrome Web Storeへ再提出する前に、残Issueとリリース対象を確認している

## 運用メモ

この監査はChrome Web Store公式審査の代替ではありません。審査で追加指摘が出た場合は、[chrome-web-store-rejection-playbook.md](chrome-web-store-rejection-playbook.md) に従ってIssue化し、PRで修正してから再提出します。
