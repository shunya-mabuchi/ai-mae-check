import { BrainCircuit, Chrome, LockKeyhole, MousePointerClick, ShieldCheck } from "lucide-react";
import { SectionHeading, Surface } from "./ui";

const steps = [
  {
    label: "1. 貼る",
    title: "AIに貼る直前を検知",
    text: "ChatGPTやClaudeなどの対象サイトで、貼り付け操作をきっかけに確認します。",
    icon: MousePointerClick
  },
  {
    label: "2. 見つける",
    title: "確定情報はルールで検出",
    text: "メール、電話番号、APIキー、認証付きURLなどはブラウザ内のルールで検出します。",
    icon: ShieldCheck
  },
  {
    label: "3. 確認する",
    title: "文脈リスクはAI候補に",
    text: "WebLLMで顧客名や契約前情報などの候補を補助的に確認します。",
    icon: BrainCircuit
  },
  {
    label: "4. 選ぶ",
    title: "マスク対象を自分で選択",
    text: "検出項目ごとに、マスクするか、そのまま残すかをユーザーが決められます。",
    icon: LockKeyhole
  },
  {
    label: "5. 貼る",
    title: "Chrome拡張として利用",
    text: "バックエンドなしで動き、設定だけをブラウザ内に保存します。",
    icon: Chrome
  }
];

export function StepCards() {
  return (
    <section className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="仕組み"
          title="貼る前の確認を、ひとつの流れに。"
          description="不安を煽るセキュリティ製品ではなく、送信前に自分で確認するための小さなレイヤーです。"
        />
        <div className="grid gap-3 md:grid-cols-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Surface key={step.title} className="p-4">
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
