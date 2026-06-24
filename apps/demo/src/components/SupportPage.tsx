import { PublicPageLayout } from "./PublicPageLayout";

const faqItems = [
  {
    question: "本文は保存されますか？",
    answer:
      "保存しません。貼り付け本文、送信本文、添付前に読み取ったテキスト本文、検出結果、placeholderMap、送信履歴は永続保存しません。保存するのは拡張機能の設定だけです。"
  },
  {
    question: "本文は開発者のサーバーへ送信されますか？",
    answer:
      "送信しません。ルールベース検出はブラウザ内で実行します。AI文脈チェックもWebLLMを使い、ユーザーのブラウザ内で実行します。"
  },
  {
    question: "WebLLMが動かないのはなぜですか？",
    answer:
      "WebGPU非対応、GPUドライバやDawn backendの制限、シークレットモードの保存容量制限、モデル配信元への接続ブロック、初回モデル取得の失敗などが主な理由です。WebLLMが失敗してもルールベース検出は利用できます。"
  },
  {
    question: "初回ロードが長いのはなぜですか？",
    answer:
      "外部LLM APIを使わずブラウザ内で推論するため、初回利用時にローカル推論用モデルファイルを取得する場合があります。モデル取得後はブラウザキャッシュやブラウザ管理下の保存領域を利用します。"
  },
  {
    question: "対応サイトはどこですか？",
    answer:
      "現在の対象サイトはChatGPT、Claude、Gemini、Perplexityです。すべてのサイトへ無条件に介入する権限は要求せず、対象サイトに限定して動作します。"
  },
  {
    question: "不具合報告に本文を貼ってもよいですか？",
    answer:
      "貼らないでください。公開IssueやPRには、実在の本文、実APIキー、実トークン、実個人情報、顧客名、案件名を書かず、ダミー情報で再現してください。"
  }
];

const knownLimitations = [
  "対象サイトはChatGPT、Claude、Gemini、Perplexityです。",
  "AI文脈チェックはWebGPU対応環境で利用できます。",
  "WebLLMの初回利用時はモデルファイルの取得に時間がかかる場合があります。",
  "WebLLMの実機確認では、OS、Chromeバージョン、WebGPU状態、エラー分類だけを記録し、本文は記録しません。",
  "本文は永続保存されず、設定のみブラウザ内に保存されます。",
  "保存済み設定はOptions Pageの「設定を初期化」から削除できます。貼り付け本文や検出結果は保存していないため、削除対象には含まれません。",
  "ファイル添付前チェックはテキスト系ファイルのみが対象です。PDF、docx、xlsx、画像OCRは解析しません。",
  "対象サイト独自のドラッグ&ドロップ添付やクリップボード経由のファイル添付は動作保証の対象外です。"
];

export function SupportPage() {
  return (
    <PublicPageLayout
      title="サポート"
      description="AIまえチェックの不具合報告、利用相談、Chrome Web Store公開後の確認先をまとめています。"
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-black text-ink">問い合わせ先</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            不具合報告や改善相談はGitHub Issuesで受け付けます。個別連絡が必要な場合は、Chrome Web Store掲載ページに表示されるデベロッパー連絡先を利用してください。
          </p>
          <a
            href="https://github.com/shunya-mabuchi/ai-mae-check/issues"
            className="mt-4 inline-flex min-h-11 items-center rounded-card border border-ink bg-ink px-4 text-sm font-bold text-white hover:bg-[#343638]"
          >
            GitHub Issuesを開く
          </a>
        </section>
        <section className="rounded-card border border-line bg-white/75 p-5 shadow-soft">
          <h2 className="text-lg font-black text-ink">問い合わせ前のお願い</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            公開Issueや問い合わせには、貼り付け本文、送信本文、実APIキー、実トークン、実個人情報、顧客名、案件名を書かないでください。再現には実在しないダミー情報を使ってください。
          </p>
        </section>
        <section className="rounded-card border border-line bg-cloud/70 p-5">
          <h2 className="text-lg font-black text-ink">脆弱性や秘密情報を含む相談</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            セキュリティ相談では、貼り付け本文、実APIキー、実トークン、実個人情報、顧客名、案件名を公開Issueへ書かないでください。本文を含まない概要だけを書き、必要に応じてChrome Web Store掲載ページのデベロッパー連絡先を利用してください。
          </p>
          <a
            href="https://github.com/shunya-mabuchi/ai-mae-check/blob/main/SECURITY.md"
            className="mt-4 inline-flex min-h-11 items-center rounded-card border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-white/70"
          >
            セキュリティポリシーを見る
          </a>
        </section>
        <section>
          <h2 className="text-lg font-black text-ink">報告時にあると助かる情報</h2>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-muted">
            <li>利用している対象サイト</li>
            <li>発生した操作と表示されたメッセージ</li>
            <li>ChromeのバージョンとOS</li>
            <li>AI文脈チェックの場合はWebGPUの利用可否</li>
          </ul>
          <a
            href="https://github.com/shunya-mabuchi/ai-mae-check/blob/main/docs/webllm-compatibility-matrix.md"
            className="mt-4 inline-flex min-h-11 items-center rounded-card border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-cloud"
          >
            WebLLM確認項目を見る
          </a>
        </section>
        <section>
          <h2 className="text-lg font-black text-ink">よくある質問</h2>
          <div className="mt-4 divide-y divide-line rounded-card border border-line bg-white/80">
            {faqItems.map((item) => (
              <details key={item.question} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-black text-ink">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
          <a
            href="https://github.com/shunya-mabuchi/ai-mae-check/blob/main/docs/support-faq.md"
            className="mt-4 inline-flex min-h-11 items-center rounded-card border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-cloud"
          >
            詳細FAQを見る
          </a>
        </section>
        <section>
          <h2 className="text-lg font-black text-ink">確認している制限</h2>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-muted">
            {knownLimitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <a href="/" className="inline-flex min-h-11 items-center rounded-card border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-cloud">
          トップへ戻る
        </a>
      </div>
    </PublicPageLayout>
  );
}
