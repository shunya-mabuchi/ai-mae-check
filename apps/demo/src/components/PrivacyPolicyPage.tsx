import { PublicPageLayout } from "./PublicPageLayout";

const policySections = [
  {
    title: "収集しない情報",
    body: "貼り付け本文、送信本文、添付前チェックで読み取ったテキスト本文、検出結果、マスキング用の対応表、送信履歴は開発者のサーバーへ送信・収集しません。貼り付け本文やファイル本文は永続保存しません。"
  },
  {
    title: "保存する情報",
    body: "拡張機能の有効/無効、対象サイトごとのON/OFF、検出ルールごとのON/OFF、WebLLMモデルIDなどの設定だけを chrome.storage.local に保存します。"
  },
  {
    title: "AI文脈チェック",
    body: "検出とAI文脈チェックはユーザーのブラウザ内で実行されます。WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合があります。モデル取得後はブラウザキャッシュを利用します。"
  },
  {
    title: "外部LLM API",
    body: "OpenAI API、Claude API、Gemini APIなどの外部LLM APIへ貼り付け本文を送信しません。開発者の推論サーバーにも貼り付け本文を送信しません。"
  },
  {
    title: "ファイル添付前チェック",
    body: "MVPではテキスト系ファイルのみをブラウザ内で確認します。PDF、docx、xlsx、画像OCRは解析しません。対象サイト独自のドラッグ&ドロップ添付やクリップボード経由のファイル添付は、サイト実装に依存するため動作保証の対象外です。"
  },
  {
    title: "注意事項",
    body: "本ツールは情報漏洩を完全に防ぐものではありません。検出漏れや誤検出が発生する可能性があります。最終的に送信するかどうかはユーザーが判断してください。"
  }
];

export function PrivacyPolicyPage() {
  return (
    <PublicPageLayout
      title="プライバシーポリシー"
      description="AIまえチェックは、ChatGPT・Claude・Geminiへ文章を貼る前に、ブラウザ内で消し忘れを確認するChrome拡張です。本文を保存しない設計を前提にしています。"
    >
      <div className="space-y-6">
        {policySections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-black text-ink">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">{section.body}</p>
          </section>
        ))}
        <div className="rounded-card border border-line bg-cloud p-4 text-sm leading-7 text-muted">
          モデルファイルの取得は、WebLLMがローカル推論に必要なファイルを準備するためのものです。貼り付け本文を外部LLM APIへ送信するものではありません。
        </div>
        <a href="/" className="inline-flex min-h-11 items-center rounded-card border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-cloud">
          トップへ戻る
        </a>
      </div>
    </PublicPageLayout>
  );
}
