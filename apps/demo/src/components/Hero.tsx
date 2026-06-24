import { ArrowDown, Chrome, Github, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import type { DetectionSummary } from "@ai-mae-check/core";
import { createProductLaunchFlow } from "../lib/productLaunchFlow";
import { Button } from "./ui";

const proofItems = ["Chrome拡張が本体", "Chrome Web Store公開中", "本文は保存しない", "外部LLM APIなし"];

export function Hero({ summary }: { summary: DetectionSummary }) {
  const flow = createProductLaunchFlow();

  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-page-texture" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <a href="#" className="text-lg font-black tracking-normal text-ink" aria-label="AIまえチェック トップ">
          AIまえチェック
        </a>
        <div className="flex items-center gap-4 text-sm font-semibold text-muted">
          <a className="hover:text-ink" href="#install">
            導入手順
          </a>
          <a className="hover:text-ink" href="#demo">
            ミニデモ
          </a>
          <a className="hover:text-ink" href="#privacy">
            プライバシー
          </a>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-10 pt-8 md:grid-cols-[0.95fr_1.05fr] md:pb-24 md:pt-14">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-card border border-line bg-white/85 px-3 py-2 text-sm font-bold text-leaf shadow-soft">
            <Chrome size={16} aria-hidden="true" />
            本体は、AIサービス上で動くChrome拡張です。
          </p>
          <h1 className="text-5xl font-black leading-[1.02] tracking-normal text-ink md:text-7xl">
            Chrome拡張で、
            <br />
            そのまま貼らない。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            ChatGPT・Claude・Gemini・Perplexityに文章を貼る前に、個人情報・秘密情報・社内情報の消し忘れに気づくための確認レイヤーです。
            このページのデモは、拡張機能を入れる前に動きを試すための小さな体験版です。
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {proofItems.map((item) => (
              <span key={item} className="rounded-card border border-line bg-white/70 px-3 py-2 text-xs font-black text-ink shadow-soft">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={flow.primaryCta.href}>
              <Button variant="primary">
                <Chrome size={17} aria-hidden="true" />
                {flow.primaryCta.label}
              </Button>
            </a>
            <a href={flow.demoCta.href}>
              <Button variant="ghost">
                <ArrowDown size={17} aria-hidden="true" />
                {flow.demoCta.label}
              </Button>
            </a>
            <a href={flow.githubCta.href}>
              <Button variant="ghost">
                <Github size={17} aria-hidden="true" />
                {flow.githubCta.label}
              </Button>
            </a>
          </div>
        </div>

        <div className="hidden rounded-card border border-line bg-white/80 p-3 shadow-panel backdrop-blur md:block">
          <div className="overflow-hidden rounded-[6px] border border-ink/10 bg-[#f8faf8]">
            <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-black text-white/70">Chrome拡張の確認モーダル</span>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[1fr_0.86fr]">
              <div className="rounded-[6px] border border-line bg-white p-4">
                <p className="mb-3 text-xs font-black text-muted">ChatGPTへ貼る直前の文章</p>
                <div className="space-y-2 text-sm leading-6 text-ink">
                  <p>佐藤様向けの提案メモを要約してください。</p>
                  <p className="rounded-[6px] bg-cloud px-2 py-1 font-mono text-xs">GITHUB_TOKEN=ghp_...</p>
                  <p>来月の契約更新と年間120万円の条件も含めます。</p>
                </div>
              </div>
              <div className="rounded-[6px] border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black text-muted">貼り付け前チェック</p>
                  <span className="rounded-card bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">要確認</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[6px] bg-rose-50 p-3">
                    <p className="text-xs font-bold text-rose-700">高</p>
                    <p className="text-2xl font-black text-rose-800">{summary.high}</p>
                  </div>
                  <div className="rounded-[6px] bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-800">中</p>
                    <p className="text-2xl font-black text-amber-900">{summary.medium}</p>
                  </div>
                  <div className="rounded-[6px] bg-sky-50 p-3">
                    <p className="text-xs font-bold text-sky-800">低</p>
                    <p className="text-2xl font-black text-sky-900">{summary.low}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-[6px] border border-dashed border-line p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black">
                    <Sparkles size={16} className="text-leaf" aria-hidden="true" />
                    AI文脈チェック
                  </div>
                  <p className="text-xs leading-5 text-muted">
                    顧客名・案件名・採用情報など、ルールだけでは拾いにくい候補をブラウザ内で確認します。
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-line bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
                <span className="inline-flex items-center gap-1 text-leaf">
                  <LockKeyhole size={14} aria-hidden="true" />
                  対象サイト上で動作
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={14} aria-hidden="true" />
                  設定だけ保存
                </span>
                <span>本文ログなし</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
