import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Database, ShieldCheck, Sparkles } from "lucide-react";
import { detectorRules } from "@ai-mae-check/core";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AiMaeCheckSettings, type LlmRunMode } from "../../src/lib/settings";
import { targetSites, type SiteId } from "../../src/lib/sites";

function Toggle({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-md border border-line bg-white p-4">
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="mt-1 block text-sm leading-6 text-stone-600">{description}</span>}
      </span>
      <input type="checkbox" className="mt-1 h-5 w-5 accent-leaf" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-paper p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function OptionsApp() {
  const [settings, setSettings] = useState<AiMaeCheckSettings>(DEFAULT_SETTINGS);
  const [savedMessage, setSavedMessage] = useState("設定を読み込んでいます。");

  useEffect(() => {
    void loadSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      setSavedMessage("設定は変更時に自動保存されます。");
    });
  }, []);

  const updateSettings = (updater: (current: AiMaeCheckSettings) => AiMaeCheckSettings) => {
    setSettings((current) => {
      const next = updater(current);
      void saveSettings(next).then(() => setSavedMessage("保存しました。"));
      return next;
    });
  };

  const updateSite = (siteId: SiteId, enabled: boolean) => {
    updateSettings((current) => ({
      ...current,
      sites: {
        ...current.sites,
        [siteId]: enabled
      }
    }));
  };

  const updateRule = (ruleId: string, enabled: boolean) => {
    updateSettings((current) => ({
      ...current,
      rules: {
        ...current.rules,
        [ruleId]: enabled
      }
    }));
  };

  const updateLlmMode = (mode: LlmRunMode) => {
    updateSettings((current) => ({
      ...current,
      llm: {
        ...current.llm,
        mode
      }
    }));
  };

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-leaf">
            <ShieldCheck size={16} aria-hidden="true" />
            AIまえチェック
          </p>
          <h1 className="text-3xl font-bold tracking-normal">設定</h1>
          <p className="mt-3 max-w-3xl leading-7 text-stone-600">
            入力本文や送信本文は保存しません。ここで保存されるのは、対象サイト、検出ルール、AI文脈チェックに関する設定だけです。
          </p>
          <p className="mt-2 text-sm font-semibold text-leaf">{savedMessage}</p>
        </header>

        <div className="grid gap-5">
          <Section icon={<CheckCircle2 size={20} aria-hidden="true" />} title="基本設定">
            <Toggle
              checked={settings.enabled}
              onChange={(enabled) => updateSettings((current) => ({ ...current, enabled }))}
              label="AIまえチェックを有効にする"
              description="無効にすると、対象サイトでの確認を行いません。"
            />
          </Section>

          <Section icon={<ShieldCheck size={20} aria-hidden="true" />} title="対象サイト">
            <div className="grid gap-3 sm:grid-cols-2">
              {targetSites.map((site) => (
                <Toggle
                  key={site.id}
                  checked={settings.sites[site.id] !== false}
                  onChange={(enabled) => updateSite(site.id, enabled)}
                  label={site.label}
                  description={site.matches.join(", ")}
                />
              ))}
            </div>
          </Section>

          <Section icon={<Database size={20} aria-hidden="true" />} title="検出ルール">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detectorRules.map((rule) => (
                <Toggle
                  key={rule.id}
                  checked={settings.rules[rule.id] !== false}
                  onChange={(enabled) => updateRule(rule.id, enabled)}
                  label={rule.label}
                  description={`危険度: ${rule.riskLevel === "high" ? "高" : rule.riskLevel === "medium" ? "中" : "低"}`}
                />
              ))}
            </div>
          </Section>

          <Section icon={<Sparkles size={20} aria-hidden="true" />} title="WebLLMによるAI文脈チェック">
            <Toggle
              checked={settings.llm.enabled}
              onChange={(enabled) =>
                updateSettings((current) => ({
                  ...current,
                  llm: {
                    ...current.llm,
                    enabled
                  }
                }))
              }
              label="WebLLMによるAI文脈チェックを有効にする"
              description="メールやAPIキーなどの確定情報ではなく、顧客名・案件名・契約文脈などの候補確認に使います。"
            />

            <div className="rounded-md border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">WebLLMモデル</p>
              <p className="mt-2 rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink">{DEFAULT_MODEL_ID}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                AIまえチェックでは、動作安定性と文脈チェックのバランスを優先し、このWebLLM prebuiltモデルのみを利用します。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-md border border-line bg-white p-4">
                <input
                  type="radio"
                  className="mr-2 accent-leaf"
                  checked={settings.llm.mode === "manual"}
                  onChange={() => updateLlmMode("manual")}
                />
                <span className="font-semibold">手動ボタンだけで実行</span>
                <span className="mt-2 block text-sm leading-6 text-stone-600">モーダル内の「AI文脈チェックも実行」ボタンを押したときだけ実行します。</span>
              </label>
              <label className="rounded-md border border-line bg-white p-4">
                <input type="radio" className="mr-2 accent-leaf" checked={settings.llm.mode === "auto"} onChange={() => updateLlmMode("auto")} />
                <span className="font-semibold">毎回自動実行</span>
                <span className="mt-2 block text-sm leading-6 text-stone-600">危険情報が見つかったモーダル表示時に自動で文脈チェックを開始します。</span>
              </label>
            </div>

            <div className="rounded-md border border-line bg-white p-4 text-sm leading-7 text-stone-700">
              <p>入力本文や送信本文は外部サーバーに送信されません。検出とAI文脈チェックはユーザーのブラウザ内で実行されます。</p>
              <p className="mt-2">
                WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合があります。モデル取得後はブラウザキャッシュを利用します。
              </p>
              <p className="mt-2">あなた自身の推論サーバーや外部LLM APIは利用しません。</p>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
