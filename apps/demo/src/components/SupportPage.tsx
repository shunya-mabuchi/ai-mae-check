import { PublicPageLayout } from "./PublicPageLayout";

const supportItems = [
  "対象サイトは初期状態でChatGPT、Claude、Geminiです。",
  "AI文脈チェックはWebGPU対応環境で利用できます。",
  "WebLLMの初回利用時はモデルファイルの取得に時間がかかる場合があります。",
  "本文は永続保存されず、設定のみブラウザ内に保存されます。"
];

export function SupportPage() {
  return (
    <PublicPageLayout
      title="サポート"
      description="AIまえチェックの不具合報告、利用相談、Chrome Web Store審査時の確認先をまとめています。"
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-black text-ink">問い合わせ先</h2>
          <p className="mt-2 text-sm leading-7 text-muted">不具合報告や相談はGitHub Issuesで受け付けます。</p>
          <a
            href="https://github.com/shunya-mabuchi/ai-mae-check/issues"
            className="mt-4 inline-flex min-h-11 items-center rounded-card border border-ink bg-ink px-4 text-sm font-bold text-white hover:bg-[#343638]"
          >
            GitHub Issuesを開く
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
