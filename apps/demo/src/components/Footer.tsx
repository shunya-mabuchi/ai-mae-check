export function Footer() {
  return (
    <footer id="footer" className="px-5 pb-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white/70 px-5 py-5 text-sm shadow-soft">
        <p className="font-black text-ink">貼るまえ</p>
        <div className="flex flex-wrap gap-4 font-semibold text-muted">
          <a href="https://github.com/shunya-mabuchi/harumae" className="hover:text-ink">
            GitHub
          </a>
          <a href="https://github.com/shunya-mabuchi/harumae#readme" className="hover:text-ink">
            README
          </a>
          <a href="#privacy" className="hover:text-ink">
            プライバシー方針
          </a>
        </div>
      </div>
    </footer>
  );
}
