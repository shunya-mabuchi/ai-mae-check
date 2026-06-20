import type { ReactNode } from "react";
import { Footer } from "./Footer";

export function PublicPageLayout({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="page-shell min-h-screen text-ink">
      <header className="border-b border-line/70 px-5 py-5">
        <nav
          aria-label="公開ページ"
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-1 py-1"
        >
          <a href="/" className="text-base font-black text-ink">
            AIまえチェック
          </a>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
            <a href="/#install" className="transition hover:text-ink">
              拡張機能
            </a>
            <a href="/#demo" className="transition hover:text-ink">
              デモ
            </a>
            <a href="/privacy" className="transition hover:text-ink">
              プライバシー
            </a>
            <a href="/support" className="transition hover:text-ink">
              サポート
            </a>
          </div>
        </nav>
      </header>
      <main className="px-5 pb-16 pt-8 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-bold text-leaf">AIに貼る前の確認レイヤー</p>
          <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted md:text-lg">{description}</p>
          <div className="mt-8 rounded-card border border-line bg-white/90 p-5 shadow-panel md:p-8">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
