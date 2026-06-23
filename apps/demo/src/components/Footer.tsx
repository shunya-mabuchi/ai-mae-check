import { chromeWebStoreUrl } from "../lib/productLaunchFlow";

export function Footer() {
  return (
    <footer id="footer" className="border-t border-line/70 bg-cloud/80 px-5 py-10">
      <div className="mx-auto grid max-w-7xl gap-6 text-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-xs font-black text-leaf">Chrome拡張が本体です</p>
          <p className="mt-2 text-lg font-black text-ink">AIまえチェック</p>
          <p className="mt-2 max-w-2xl leading-6 text-muted">
            ChatGPT・Claude・Geminiへ貼る前に、ブラウザ内で消し忘れを確認するためのツールです。
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <a
            href={chromeWebStoreUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-card border border-ink bg-ink px-4 text-sm font-black text-white transition hover:bg-[#343638]"
          >
            Chrome Web Storeで追加
          </a>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-semibold text-muted md:justify-end">
            <a href="/#extension" className="transition hover:text-ink">
              拡張機能の使い方
            </a>
            <a href="/#demo" className="transition hover:text-ink">
              ミニデモ
            </a>
            <a href="https://github.com/shunya-mabuchi/ai-mae-check" className="transition hover:text-ink">
              GitHub
            </a>
            <a href="https://github.com/shunya-mabuchi/ai-mae-check#readme" className="transition hover:text-ink">
              README
            </a>
            <a href="https://github.com/shunya-mabuchi/ai-mae-check/blob/main/docs/portfolio-case-study.md" className="transition hover:text-ink">
              ケーススタディ
            </a>
            <a href="/privacy" className="transition hover:text-ink">
              プライバシー方針
            </a>
            <a href="/support" className="transition hover:text-ink">
              サポート
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
