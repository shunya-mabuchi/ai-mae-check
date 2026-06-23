import { PublicPageLayout } from "./PublicPageLayout";

const supportItems = [
  "対象サイトは初期状態でChatGPT、Claude、Geminiです。",
  "AI文脈チェックはWebGPU対応環境で利用できます。",
  "WebLLMの初回利用時はモデルファイルの取得に時間がかかる場合があります。",
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
        </section>
        <section>
          <h2 className="text-lg font-black text-ink">確認している制限</h2>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-muted">
            {supportItems.map((item) => (
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
