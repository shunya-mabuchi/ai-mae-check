export function Footer() {
  return (
    <footer id="footer" className="border-t border-line/70 px-5 py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm">
        <div>
          <p className="font-black text-ink">AIまえチェック</p>
          <p className="mt-1 text-xs font-semibold text-muted">Chrome拡張が本体の、貼り付け前チェックツールです。</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-semibold text-muted">
          <a href="/#install" className="transition hover:text-ink">
            導入手順
          </a>
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
          <a href="/privacy" className="transition hover:text-ink">
            プライバシー方針
          </a>
          <a href="/support" className="transition hover:text-ink">
            サポート
          </a>
        </div>
      </div>
    </footer>
  );
}
