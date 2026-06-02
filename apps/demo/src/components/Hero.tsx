import { ArrowDown, Github, ShieldCheck, Sparkles } from "lucide-react";
import type { DetectionSummary } from "@harumae/core";
import { Button } from "./ui";

export function Hero({ summary }: { summary: DetectionSummary }) {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-page-texture" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <a href="#" className="text-lg font-black tracking-normal text-ink" aria-label="貼るまえ トップ">
          貼るまえ
        </a>
        <div className="flex items-center gap-4 text-sm font-semibold text-muted">
          <a className="hover:text-ink" href="#demo">
            デモ
          </a>
          <a className="hover:text-ink" href="#privacy">
            プライバシー
          </a>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-6 md:grid-cols-[1fr_0.86fr] md:pb-20 md:pt-12">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-card border border-line bg-white/80 px-3 py-2 text-sm font-bold text-leaf shadow-soft">
            <ShieldCheck size={16} aria-hidden="true" />
            AIに貼る前に、消し忘れを見つける。
          </p>
          <h1 className="text-5xl font-black leading-[1.04] tracking-normal text-ink md:text-7xl">そのまま貼らない。</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            ChatGPTや外部フォームに文章を貼る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内でチェックします。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demo">
              <Button variant="primary">
                <ArrowDown size={17} aria-hidden="true" />
                デモで試す
              </Button>
            </a>
            <a href="https://github.com/shunya-mabuchi/harumae">
              <Button variant="ghost">
                <Github size={17} aria-hidden="true" />
                GitHubを見る
              </Button>
            </a>
          </div>
        </div>

        <div className="rounded-card border border-line bg-white/80 p-3 shadow-panel backdrop-blur">
          <div className="rounded-[6px] border border-line bg-ink p-3 text-white">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold">貼り付け前チェック</span>
              <span className="rounded-card bg-white/10 px-2 py-1 text-xs font-bold">ブラウザ内処理</span>
            </div>
            <div className="space-y-2 rounded-[6px] bg-white p-3 text-ink">
              <div className="flex items-center justify-between rounded-[6px] bg-rose-50 px-3 py-2">
                <span className="text-sm font-bold text-rose-700">高リスク</span>
                <span className="text-2xl font-black text-rose-800">{summary.high}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[6px] bg-amber-50 px-3 py-2">
                  <p className="text-xs font-bold text-amber-800">中リスク</p>
                  <p className="text-xl font-black text-amber-900">{summary.medium}</p>
                </div>
                <div className="rounded-[6px] bg-slate-100 px-3 py-2">
                  <p className="text-xs font-bold text-slate-600">低リスク</p>
                  <p className="text-xl font-black text-slate-800">{summary.low}</p>
                </div>
              </div>
              <div className="rounded-[6px] border border-dashed border-line p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Sparkles size={16} className="text-leaf" aria-hidden="true" />
                  マスク候補プレビュー
                </div>
                <div className="space-y-2 font-mono text-xs text-muted">
                  <p>メール: マスク候補</p>
                  <p>電話: マスク候補</p>
                  <p>社内URL: マスク候補</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
