import { Building2, JapaneseYen, KeyRound, Link2, Mail, Phone, ScrollText } from "lucide-react";
import { SectionHeading, Surface } from "./ui";

const targets = [
  { label: "メールアドレス", detail: "連絡先の消し忘れ", icon: Mail },
  { label: "電話番号", detail: "個人番号や代表番号", icon: Phone },
  { label: "APIキー", detail: "トークン・秘密鍵", icon: KeyRound },
  { label: "社内URL", detail: "認証付きURLや内部環境", icon: Link2 },
  { label: "顧客名", detail: "提案・契約前の文脈", icon: Building2 },
  { label: "契約金額", detail: "見積・月額・初期費用", icon: JapaneseYen },
  { label: "社外秘の文章", detail: "NDA・関係者限り", icon: ScrollText }
];

export function DetectionTargetCards() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
      <SectionHeading
        eyebrow="Chrome拡張でチェックする対象"
        title="AIに貼る前、こんな情報が混ざっていませんか？"
        description="対象サイトの入力欄に貼り付ける直前に、消し忘れが起きやすい情報をブラウザ内で確認します。"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {targets.map((target) => {
          const Icon = target.icon;
          return (
            <Surface key={target.label} className="p-4 transition hover:-translate-y-0.5 hover:border-leaf/30 hover:shadow-panel">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-card bg-leaf/10 text-leaf">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-black text-ink">{target.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{target.detail}</p>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}
