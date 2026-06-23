# バージョニングとリリース運用

AIまえチェックはChrome拡張がプロダクト本体です。GitHub Release、CHANGELOG、Chrome Web Store提出、Cloudflare Pagesの公開状態を分けて管理します。

## バージョンの基準

- Chrome Web Store提出バージョンは root `package.json` と `apps/extension/package.json` の `version` を基準にします。
- `apps/demo`、`packages/core`、`packages/llm`、`apps/worker` はprivate packageとして扱い、npm公開バージョンではありません。
- ただし、拡張の提出に含まれる挙動が変わる場合は、rootとextensionのversionを更新します。

## リリース前の順序

0.1.1のChrome Web Store再アップロードは、残Issueをすべて解消してから行います。ZIPを先にアップロードしません。

1. 対象IssueをIssueごとにPR化してmainへマージする
2. `CHANGELOG.md` の `Unreleased` を更新する
3. root `package.json` と `apps/extension/package.json` のversionを確認する
4. `pnpm install --frozen-lockfile` を確認する
5. `pnpm test` を実行する
6. `pnpm typecheck` を実行する
7. `pnpm build` を実行する
8. `pnpm package:extension` でZIPを作成する
9. 公開前QAをすべて実行する
10. Chrome Web StoreへZIPをアップロードする
11. 審査通過後にGit tagとGitHub Releaseを作成する

公開前QA:

```bash
pnpm qa:public-repo
pnpm qa:public-docs
pnpm qa:privacy-regression
pnpm qa:webllm-model-policy
pnpm qa:dependency-policy
pnpm qa:demo:seo
pnpm qa:portfolio-case-study
pnpm qa:extension:size
pnpm qa:extension:manifest
pnpm qa:chrome-store
```

## GitHub Release

GitHub Releaseは、Chrome Web Storeで該当バージョンが公開された後に作成します。審査前にReleaseだけ先に出しません。

Release本文には次を含めます。

- Chrome Web Store公開URL
- 主な変更
- プライバシー設計
- WebLLMモデル取得に関する注意
- 既知の制限
- 手動確認した対象サイト
- 署名付きルール配信の状態

0.1.0のRelease下書きは [docs/releases/v0.1.0.md](releases/v0.1.0.md) にあります。

## 0.1.1の扱い

0.1.1では、`ai-mae-check-rules-2026-06-v2` の公開鍵を拡張へ埋め込み、Cloudflare Pages Functions側のSecretと一致させます。

ただし、0.1.1 ZIPはすでに一度作成済みでも、残Issueをすべて解消してから作り直します。最終提出候補のZIPは、その時点のmainから `pnpm package:extension` で再生成します。

## リリース後の確認

- Chrome Web Store公開URLが表示される
- LPの主CTAが公開済みストアへ遷移する
- `/privacy`、`/support` が開ける
- `/api/rules/latest` が本番の `keyId` と署名付きpayloadを返す
- GitHub Release本文がCHANGELOGと矛盾していない
- READMEの公開ステータス、スクリーンショット、ストアURLが最新

## 差し戻し時

Chrome Web Storeで差し戻された場合は、ZIPを再提出する前にIssue化します。差し戻し理由、対象画面、修正範囲、再確認コマンドを記録し、PRで修正してから再提出します。
