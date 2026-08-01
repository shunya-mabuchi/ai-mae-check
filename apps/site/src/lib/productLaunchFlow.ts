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
  demoCta: LaunchCta;
  githubCta: LaunchCta;
  installSteps: ProductLaunchStep[];
  demoRole: string;
}

export const chromeWebStoreUrl = "https://chrome.google.com/webstore/detail/idedmkfplfieijdcflcogkngplhkkecc";

export function createProductLaunchFlow(): ProductLaunchFlow {
  return {
    status: {
      label: "Chrome Web Store公開中",
      description: "現在はChrome Web Storeから追加できます。GitHubからのローカル読み込み手順も、開発者向けの確認導線として残しています。"
    },
    primaryCta: {
      label: "Chrome Web Storeで追加",
      href: chromeWebStoreUrl,
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
        title: "Chrome Web Storeから追加する",
        body: "通常の利用導線はChrome Web Storeです。拡張機能を追加すると、ChatGPT / Claude / Gemini / Perplexityの入力欄で確認できます。"
      },
      {
        title: "必要ならGitHubで実装を見る",
        body: "検出ルール、プライバシー設計、Chrome Web Store向けの説明文、ルール配信計画などはGitHubで確認できます。"
      },
      {
        title: "ChatGPT / Claude / Gemini / Perplexityで試す",
        body: "対象サイトでダミー文を貼り付ける、または送信しようとすると、確認モーダルと安全化の流れを確認できます。"
      }
    ],
    demoRole: "このミニデモは補助体験です。検出と安全化の考え方を先に試せますが、本体はChrome拡張として対象サイト上で動く確認レイヤーです。"
  };
}
