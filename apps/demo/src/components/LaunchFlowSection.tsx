import { Chrome, Github, PackageCheck } from "lucide-react";
import { createProductLaunchFlow } from "../lib/productLaunchFlow";
import { Button, SectionHeading, Surface } from "./ui";

const icons = [Chrome, Github, PackageCheck] as const;

export function LaunchFlowSection() {
  const flow = createProductLaunchFlow();

  return (
    <section id="install" className="px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="拡張機能として使う"
          title="まずはChrome Web Storeから追加してお試しください。"
          description="このページは紹介とミニデモです。実際のプロダクト価値は、ChatGPT・Claude・Gemini・Perplexityの入力欄で送信前に止まる拡張機能として確認できます。"
        />

        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <Surface className="p-5">
            <p className="inline-flex rounded-card bg-cloud px-3 py-2 text-xs font-black text-leaf">
              {flow.status.label}
            </p>
            <h3 className="mt-5 text-2xl font-black leading-tight text-ink">通常の導入は、Chrome Web Storeから。</h3>
            <p className="mt-4 text-sm leading-7 text-muted">{flow.status.description}</p>
            <p className="mt-4 text-sm leading-7 text-muted">{flow.demoRole}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={flow.primaryCta.href}>
                <Button variant="primary">
                  <Chrome size={17} aria-hidden="true" />
                  {flow.primaryCta.label}
                </Button>
              </a>
              <a href={flow.githubCta.href}>
                <Button variant="ghost">
                  <Github size={17} aria-hidden="true" />
                  {flow.githubCta.label}
                </Button>
              </a>
              <a href="#demo">
                <Button variant="ghost">{flow.demoCta.label}</Button>
              </a>
            </div>
          </Surface>

          <div className="grid gap-3">
            {flow.installSteps.map((step, index) => {
              const Icon = icons[index] ?? PackageCheck;
              return (
                <Surface key={step.title} className="grid gap-4 p-5 md:grid-cols-[auto_1fr]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-card bg-ink text-white">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-leaf">STEP {index + 1}</p>
                    <h3 className="mt-1 text-lg font-black text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted">{step.body}</p>
                  </div>
                </Surface>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
