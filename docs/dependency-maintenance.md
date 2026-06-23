# 依存関係アップデートとライセンス確認

AIまえチェックは、Chrome拡張、紹介LP、WebLLM、Cloudflare Pages Functionsを含むmonorepoです。依存関係の更新は、機能追加と同じくIssueとPRで管理します。

## 基本方針

- 依存関係の更新は1つのPRに詰め込みすぎない
- Chrome拡張の権限、CSP、bundleサイズ、Chrome Web Store提出物へ影響する更新は個別PRにする
- `@mlc-ai/web-llm`、WXT、Vite、React、Playwright、Wranglerは、更新時に実機またはE2E観点を明記する
- WebLLMモデルはnpm依存とは別に、モデルライセンスと配信元を確認する
- `pnpm-lock.yaml` の差分を必ず確認する
- 実APIキー、private JWK、ローカル生成物、ZIP、ログを依存更新PRへ含めない

## 定期確認コマンド

依存更新前に、次を確認します。

```bash
pnpm install --frozen-lockfile
pnpm outdated
pnpm licenses list --json
pnpm audit
```

`pnpm outdated` と `pnpm audit` はネットワークとnpm registryに依存するため、CIの必須条件にはしていません。ローカルまたはメンテナンスPRで確認し、結果をPR本文へ要約します。

## ライセンス確認

確認対象:

- npm依存ライブラリ
- `@mlc-ai/web-llm`
- WebLLMが取得するモデルファイル
- Chrome Web Store用画像やREADME掲載画像
- Cloudflare Workers/Pages関連ツール

確認コマンド:

```bash
pnpm licenses list --json
```

現在確認している主なライセンス種別:

- MIT
- Apache-2.0
- BSD-2-Clause / BSD-3-Clause
- ISC
- MPL-2.0
- 0BSD
- CC-BY-4.0
- 複数ライセンス表記

MPL-2.0、CC-BY-4.0、GPLを含む複数ライセンス表記などは、利用箇所と配布形態を確認します。Chrome拡張の提出物に含まれる依存と、開発時だけ使う依存は分けて考えます。

## 更新PRのチェックリスト

- [ ] 依存更新の目的を書いた
- [ ] `pnpm-lock.yaml` の差分を確認した
- [ ] `pnpm licenses list --json` の結果で新しいライセンス種別を確認した
- [ ] `pnpm audit` の結果を確認した
- [ ] `pnpm test` が通った
- [ ] `pnpm build` が通った
- [ ] `pnpm package:extension` が通った
- [ ] `pnpm qa:public-repo` が通った
- [ ] `pnpm qa:public-docs` が通った
- [ ] `pnpm qa:webllm-model-policy` が通った
- [ ] `pnpm qa:extension:size` が通った
- [ ] `pnpm qa:extension:manifest` が通った
- [ ] `pnpm qa:chrome-store` が通った
- [ ] WebLLM、WXT、Vite、React、Playwright、Wranglerの更新時は、影響範囲をPR本文に書いた
- [ ] Chrome拡張の権限、CSP、対象サイト、WebLLM bridge、ルール配信URLに意図しない差分がない

## 更新を急がないケース

- Chrome Web Store審査中のZIPに影響する
- WebLLMのモデルロード、WebGPU対応環境、CSPに不確実性がある
- 対象サイトadapterの送信前検知に影響しそうだが、実サイト確認ができていない
- ライセンスや商用利用条件が確認できていない

この場合は、Issueへ理由を残し、セキュリティ修正や審査対応と混ぜずに後続対応にします。

## 関連ドキュメント

- [ライセンスと素材利用方針](license-policy.md)
- [WebLLMモデル選定とライセンス確認](webllm-model-policy.md)
- [拡張ZIPとbundleサイズ予算](extension-size-budget.md)
- [publicリポジトリ安全監査](public-repo-safety.md)
