import { BadgeCheck, CloudOff, DatabaseZap, ServerOff } from "lucide-react";
import { SectionHeading, Surface } from "./ui";

const points = [
  { label: "貼り付け本文は保存しない", icon: DatabaseZap },
  { label: "外部LLM APIへ送らない", icon: ServerOff },
  { label: "アカウント不要", icon: BadgeCheck },
  { label: "モデル取得時だけ通信が発生する場合あり", icon: CloudOff }
];

export function PrivacySection() {
  return (
    <section id="privacy" className="px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="プライバシー設計"
          title="Chrome拡張として使っても、本文を保存しない設計です。"
          description="設定と検証済みルールキャッシュだけをブラウザ内に保存します。貼り付け本文やマスキング用の対応表は永続保存しません。"
        />
        <Surface className="grid gap-0 overflow-hidden md:grid-cols-[0.86fr_1.14fr]">
          <div className="border-b border-line bg-ink p-6 text-white md:border-b-0 md:border-r md:p-8">
            <p className="text-sm font-bold text-white/70">拡張機能のプライバシー</p>
            <h3 className="mt-3 text-3xl font-black leading-tight">AIに貼る前の確認を、ブラウザ内で。</h3>
            <p className="mt-5 text-sm leading-7 text-white/70">
              検出とAI文脈チェックはユーザーのブラウザ内で実行されます。WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合がありますが、
              貼り付け本文を外部LLM APIへ送ることはありません。
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.label} className="rounded-card border border-line bg-cloud p-4">
                  <Icon size={20} className="mb-4 text-leaf" aria-hidden="true" />
                  <p className="font-black text-ink">{point.label}</p>
                </div>
              );
            })}
          </div>
        </Surface>
      </div>
    </section>
  );
}
