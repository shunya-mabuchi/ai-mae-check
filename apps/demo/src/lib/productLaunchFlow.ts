export type LaunchCtaKind = "primary" | "ghost";

export interface LaunchCta {
  label: string;
  href: string;
  kind: LaunchCtaKind;
}

export interface ProductLaunchStep {
  title: string;
  body: string;
}

export interface ProductLaunchFlow {
  status: {
    label: string;
    description: string;
  };
  primaryCta: LaunchCta;
  postApprovalCta: LaunchCta;
  demoCta: LaunchCta;
  githubCta: LaunchCta;
  installSteps: ProductLaunchStep[];
  demoRole: string;
}

export function createProductLaunchFlow(): ProductLaunchFlow {
  return {
    status: {
      label: "Chrome Web Store審査中",
      description: "現在はGitHubからローカル読み込みで確認できます。ストア公開後は主ボタンをChrome Web Store追加リンクへ差し替えます。"
    },
    primaryCta: {
      label: "拡張機能の導入手順を見る",
      href: "#install",
      kind: "primary"
    },
    postApprovalCta: {
      label: "Chrome Web Storeで追加",
      href: "https://chromewebstore.google.com/detail/idedmkfplfieijdcflcogkngplhkkecc",
      kind: "primary"
    },
    demoCta: {
      label: "ミニデモで先に試す",
      href: "#demo",
      kind: "ghost"
    },
    githubCta: {
      label: "GitHubで見る",
      href: "https://github.com/shunya-mabuchi/ai-mae-check",
      kind: "ghost"
    },
    installSteps: [
      {
        title: "GitHubでコードを見る",
        body: "公開前はリポジトリのREADME、プライバシー方針、Chrome Web Store公開準備ドキュメントから設計意図を確認できます。"
      },
      {
        title: "ローカルで拡張を読み込む",
        body: "`pnpm build:extension` 後、Chromeの拡張機能画面から `apps/extension/.output/chrome-mv3` を読み込みます。"
      },
      {
        title: "ChatGPT / Claude / Geminiで試す",
        body: "対象サイトでダミー文を貼り付ける、または送信しようとすると、確認モーダルと安全化の流れを確認できます。"
      }
    ],
    demoRole: "このミニデモは補助体験です。検出と安全化の考え方を先に試せますが、本体はChrome拡張として対象サイト上で動く確認レイヤーです。"
  };
}
