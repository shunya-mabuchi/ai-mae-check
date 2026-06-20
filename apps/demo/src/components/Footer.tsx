export function Footer() {
  return (
    <footer id="footer" className="px-5 pb-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white/70 px-5 py-5 text-sm shadow-soft">
        <div>
          <p className="font-black text-ink">AIまえチェック</p>
          <p className="mt-1 text-xs font-semibold text-muted">Chrome拡張が本体の、貼り付け前チェックツールです。</p>
        </div>
        <div className="flex flex-wrap gap-4 font-semibold text-muted">
          <a href="/#install" className="hover:text-ink">
            導入手順
          </a>
          <a href="/#extension" className="hover:text-ink">
            拡張機能の使い方
          </a>
          <a href="/#demo" className="hover:text-ink">
            ミニデモ
          </a>
          <a href="https://github.com/shunya-mabuchi/ai-mae-check" className="hover:text-ink">
            GitHub
          </a>
          <a href="https://github.com/shunya-mabuchi/ai-mae-check#readme" className="hover:text-ink">
            README
          </a>
          <a href="/privacy" className="hover:text-ink">
            プライバシー方針
          </a>
          <a href="/support" className="hover:text-ink">
            サポート
          </a>
        </div>
      </div>
    </footer>
  );
}
