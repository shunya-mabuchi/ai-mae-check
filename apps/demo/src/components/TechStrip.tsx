import { SectionHeading } from "./ui";

const technologies = [
  "TypeScript",
  "React",
  "WXT",
  "Manifest V3",
  "Content Script",
  "WebLLM",
  "WebGPU",
  "Web Worker",
  "chrome.storage.local",
  "Vitest",
  "Playwright"
];

export function TechStrip() {
  return (
    <section className="px-5 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="技術" title="フロントエンドだけで動く構成" />
        <div className="flex flex-wrap justify-center gap-2">
          {technologies.map((technology) => (
            <span key={technology} className="rounded-card border border-line bg-white/80 px-3 py-2 text-sm font-bold text-ink shadow-soft">
              {technology}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
