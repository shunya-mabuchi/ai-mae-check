import { BrainCircuit, Chrome, LockKeyhole, MousePointerClick, ShieldCheck } from "lucide-react";
import { SectionHeading, Surface } from "./ui";

const steps = [
  {
    label: "1. 拡張を入れる",
    title: "Chrome拡張として利用",
    text: "AIまえチェックの本体は、ChatGPT・Claude・Gemini上で動くChrome拡張です。",
    icon: Chrome
  },
  {
    label: "2. 貼り付ける",
    title: "対象サイトでpasteを検知",
    text: "入力欄へ文章を貼り付ける直前に、確認モーダルを表示します。",
    icon: MousePointerClick
  },
  {
    label: "3. 見つける",
    title: "確定情報はルールで検出",
    text: "メール、電話番号、APIキー、認証付きURLなどはブラウザ内のルールで検出します。",
    icon: ShieldCheck
  },
  {
    label: "4. 補助する",
    title: "文脈リスクはAI候補に",
    text: "WebLLMで顧客名や契約前情報などの候補を補助的に確認します。",
    icon: BrainCircuit
  },
  {
    label: "5. 選んで貼る",
    title: "ユーザーが最終判断",
    text: "どれをマスクするか、貼り付けを続けるかはユーザーが選べます。",
    icon: LockKeyhole
  }
];

export function StepCards() {
  return (
    <section id="extension" className="px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Chrome拡張としての使い方"
          title="本体は、AIサービス上で動く貼り付け前チェックです。"
          description="紹介ページのデモは体験用です。実際には対象サイトの入力欄に貼り付ける瞬間に、確認とマスキングの選択肢を表示します。"
        />
        <div className="grid gap-3 md:grid-cols-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Surface key={step.title} className="relative overflow-hidden p-4">
                <div className="absolute left-0 top-0 h-1 w-full bg-leaf/40" />
                <p className="mb-3 text-xs font-black text-leaf">{step.label}</p>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-card bg-cloud text-ink">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-black text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
              </Surface>
            );
          })}
        </div>
      </div>
    </section>
  );
}
