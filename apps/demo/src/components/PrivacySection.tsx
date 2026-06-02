import { BadgeCheck, CloudOff, DatabaseZap, ServerOff } from "lucide-react";
import { SectionHeading, Surface } from "./ui";

const points = [
  { label: "本文は保存しない", icon: DatabaseZap },
  { label: "外部LLM APIに送らない", icon: ServerOff },
  { label: "アカウント不要", icon: BadgeCheck },
  { label: "モデル取得だけ発生する場合あり", icon: CloudOff }
];

export function PrivacySection() {
  return (
    <section id="privacy" className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="プライバシー"
          title="本文を保存しない設計"
          description="貼り付け本文は永続保存しません。設定だけをブラウザ内に保存します。"
        />
        <Surface className="grid gap-0 overflow-hidden md:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-line bg-ink p-6 text-white md:border-b-0 md:border-r">
            <p className="text-sm font-bold text-white/70">Privacy Promise</p>
            <h3 className="mt-3 text-3xl font-black leading-tight">外に送る前に、ブラウザ内で気づく。</h3>
            <p className="mt-5 text-sm leading-7 text-white/70">
              検出とAI文脈チェックはユーザーのブラウザ内で実行されます。WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合があります。
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.label} className="rounded-card bg-cloud p-4">
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
