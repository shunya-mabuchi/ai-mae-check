import type { ReactNode } from "react";
import { CheckCircle2, ClipboardCopy, Database, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { detectorRules } from "@ai-mae-check/core";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { targetSites, type SiteId } from "../../src/lib/sites";
import type { AiMaeCheckSettings, LlmRunMode, SettingsValidationResult } from "../../src/lib/settings";

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

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function OnboardingStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

export function OptionsHeader({ savedMessage }: { savedMessage: string }) {
  return (
    <header className="mb-8">
      <p className="mb-2 inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-leaf">
        <ShieldCheck size={16} aria-hidden="true" />
        AIまえチェック
      </p>
      <h1 className="text-3xl font-bold tracking-normal">設定</h1>
      <p className="mt-3 max-w-3xl leading-7 text-stone-600">
        入力本文や送信本文は保存しません。ここで保存されるのは、対象サイト、検出ルール、AI文脈チェックに関する設定と、検証済みの署名付きリモートルールキャッシュだけです。
      </p>
      <p className="mt-2 text-sm font-semibold text-leaf">{savedMessage}</p>
    </header>
  );
}

export function SettingsSummary({ validation }: { validation: SettingsValidationResult }) {
  return (
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <SummaryCard title="保存するもの" body="拡張機能の設定と、検証済みの署名付きリモートルールキャッシュだけを保存します。" />
      <SummaryCard title="保存しないもの" body="貼り付け本文、送信本文、検出結果、placeholderMap、送信履歴は保存しません。" />
      <SummaryCard title="設定状態" body={validation.valid ? "現在の設定形式は有効です。" : validation.messages.join(" ")} />
    </div>
  );
}

export function OnboardingSection() {
  return (
    <section className="mb-5 rounded-md border border-line bg-paper p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ink">はじめに</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            AIまえチェックの本体はChrome拡張です。ChatGPT、Claude、Gemini、Perplexityで貼り付け前・送信前に確認モーダルを表示します。
          </p>
        </div>
        <p className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-leaf">初回インストール後に表示されます</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <OnboardingStep title="1. 対象サイトを確認" body="ChatGPT、Claude、Gemini、Perplexityが対象です。必要に応じて下の対象サイト設定でON/OFFできます。" />
        <OnboardingStep title="2. いつチェックされるか" body="対象サイトの入力欄へ貼り付けるとき、または送信しようとしたときに、必要な場合だけ確認モーダルが開きます。" />
        <OnboardingStep title="3. AI文脈チェック" body="WebLLMは手動実行が初期設定です。初回利用時はローカル推論用モデルファイルの取得に時間がかかる場合があります。" />
      </div>
    </section>
  );
}

export function BasicSettingsSection({ enabled, onEnabledChange }: { enabled: boolean; onEnabledChange: (enabled: boolean) => void }) {
  return (
    <Section icon={<CheckCircle2 size={20} aria-hidden="true" />} title="基本設定">
      <Toggle
        checked={enabled}
        onChange={onEnabledChange}
        label="AIまえチェックを有効にする"
        description="無効にすると、対象サイトでの確認を行いません。"
      />
    </Section>
  );
}

export function TargetSitesSection({
  settings,
  onSiteChange
}: {
  settings: AiMaeCheckSettings;
  onSiteChange: (siteId: SiteId, enabled: boolean) => void;
}) {
  return (
    <Section icon={<ShieldCheck size={20} aria-hidden="true" />} title="対象サイト">
      <div className="grid gap-3 sm:grid-cols-2">
        {targetSites.map((site) => (
          <Toggle
            key={site.id}
            checked={settings.sites[site.id] !== false}
            onChange={(enabled) => onSiteChange(site.id, enabled)}
            label={site.label}
            description={site.matches.join(", ")}
          />
        ))}
      </div>
    </Section>
  );
}

export function DetectionRulesSection({
  settings,
  onRuleChange
}: {
  settings: AiMaeCheckSettings;
  onRuleChange: (ruleId: string, enabled: boolean) => void;
}) {
  return (
    <Section icon={<Database size={20} aria-hidden="true" />} title="検出ルール">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {detectorRules.map((rule) => (
          <Toggle
            key={rule.id}
            checked={settings.rules[rule.id] !== false}
            onChange={(enabled) => onRuleChange(rule.id, enabled)}
            label={rule.label}
            description={`危険度: ${rule.riskLevel === "high" ? "高" : rule.riskLevel === "medium" ? "中" : "低"}`}
          />
        ))}
      </div>
    </Section>
  );
}

export function WebLlmSettingsSection({
  settings,
  onEnabledChange,
  onModeChange
}: {
  settings: AiMaeCheckSettings;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: LlmRunMode) => void;
}) {
  return (
    <Section icon={<Sparkles size={20} aria-hidden="true" />} title="WebLLMによるAI文脈チェック">
      <Toggle
        checked={settings.llm.enabled}
        onChange={onEnabledChange}
        label="WebLLMによるAI文脈チェックを有効にする"
        description="メールやAPIキーなどの確定情報ではなく、顧客名・案件名・契約文脈などの候補確認に使います。"
      />

      <div className="rounded-md border border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">WebLLMモデル</p>
        <p className="mt-2 rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink">{DEFAULT_MODEL_ID}</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          AIまえチェックでは、動作実績を優先してLlama 3.2 1B q4f32を標準にします。利用環境で標準モデルが見つからない場合は、WebLLMのprebuilt一覧から軽量なInstruct/Chatモデルへ切り替えます。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-md border border-line bg-white p-4">
          <input type="radio" className="mr-2 accent-leaf" checked={settings.llm.mode === "manual"} onChange={() => onModeChange("manual")} />
          <span className="font-semibold">手動ボタンだけで実行</span>
          <span className="mt-2 block text-sm leading-6 text-stone-600">モーダル内の「AI文脈チェックも実行」ボタンを押したときだけ実行します。</span>
        </label>
        <label className="rounded-md border border-line bg-white p-4">
          <input type="radio" className="mr-2 accent-leaf" checked={settings.llm.mode === "auto"} onChange={() => onModeChange("auto")} />
          <span className="font-semibold">準備済みなら自動実行</span>
          <span className="mt-2 block text-sm leading-6 text-stone-600">ローカルAIモデルがすでに準備できている場合だけ、自動で文脈チェックを開始します。</span>
        </label>
      </div>

      <div className="rounded-md border border-line bg-white p-4 text-sm leading-7 text-stone-700">
        <p>入力本文や送信本文は外部サーバーに送信されません。検出とAI文脈チェックはユーザーのブラウザ内で実行されます。</p>
        <p className="mt-2">WebLLMの初回利用時には、ローカル推論用のモデルファイルを取得する場合があります。モデル取得後はブラウザキャッシュを利用します。</p>
        <p className="mt-2">あなた自身の推論サーバーや外部LLM APIは利用しません。</p>
      </div>
    </Section>
  );
}

export function DiagnosticsSection({
  diagnosticMessage,
  diagnosticText,
  onCreateDiagnostic,
  onCopyDiagnostic
}: {
  diagnosticMessage: string;
  diagnosticText: string;
  onCreateDiagnostic: () => void;
  onCopyDiagnostic: () => void;
}) {
  return (
    <Section icon={<ClipboardCopy size={20} aria-hidden="true" />} title="サポート用診断情報">
      <div className="rounded-md border border-line bg-white p-4 text-sm leading-7 text-stone-700">
        <p>
          不具合報告時に使える、本文を含まない診断情報を作成できます。貼り付け本文、送信本文、検出文字列、placeholderMap、現在のページURLは含めません。
        </p>
        <p className="mt-2">
          含まれるのは、拡張バージョン、Chrome/OS概要、WebGPU可否、設定スキーマ、対象サイト設定、WebLLMモデルID、ルール配信keyIdなどです。
        </p>
        <p className="mt-3 font-semibold text-leaf">{diagnosticMessage}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCreateDiagnostic}
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-paper"
          >
            診断情報を作成
          </button>
          <button
            type="button"
            onClick={onCopyDiagnostic}
            className="inline-flex min-h-11 items-center rounded-md border border-ink bg-ink px-4 text-sm font-bold text-white hover:bg-[#343638]"
          >
            診断情報をコピー
          </button>
        </div>
        {diagnosticText.length > 0 && (
          <textarea
            readOnly
            value={diagnosticText}
            className="mt-4 min-h-64 w-full resize-y rounded-md border border-line bg-paper p-3 font-mono text-xs leading-5 text-ink"
            aria-label="本文を含まない診断情報"
          />
        )}
      </div>
    </Section>
  );
}

export function ResetSettingsSection({ onResetSettings }: { onResetSettings: () => void }) {
  return (
    <Section icon={<RotateCcw size={20} aria-hidden="true" />} title="設定の初期化">
      <div className="rounded-md border border-line bg-white p-4 text-sm leading-7 text-stone-700">
        <p>
          AIまえチェックが保存するのは、拡張機能の有効/無効、対象サイト、検出ルール、AI文脈チェックに関する設定と、検証済みの署名付きリモートルールキャッシュだけです。貼り付け本文、送信本文、検出結果、placeholderMapは保存していません。
        </p>
        <p className="mt-2">
          設定を初期化すると、保存済み設定とリモートルールキャッシュを削除し、画面表示を初期値に戻します。WebLLMのモデルキャッシュなどブラウザ管理下の保存領域はChrome側で管理されます。
        </p>
        <button
          type="button"
          onClick={onResetSettings}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-paper"
        >
          設定を初期化
        </button>
      </div>
    </Section>
  );
}
