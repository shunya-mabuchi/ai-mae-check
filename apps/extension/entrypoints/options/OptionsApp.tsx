import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  resetSettings,
  saveSettings,
  validateSettings,
  type AiMaeCheckSettings,
  type LlmRunMode
} from "../../src/lib/settings";
import type { SiteId } from "../../src/lib/sites";
import { createPrivacySafeDiagnosticReport, formatPrivacySafeDiagnosticReport } from "../../src/lib/diagnostics";
import {
  BasicSettingsSection,
  DetectionRulesSection,
  DiagnosticsSection,
  OnboardingSection,
  OptionsHeader,
  ResetSettingsSection,
  SettingsSummary,
  TargetSitesSection,
  WebLlmSettingsSection
} from "./OptionsSections";

export function OptionsApp() {
  const [settings, setSettings] = useState<AiMaeCheckSettings>(DEFAULT_SETTINGS);
  const [savedMessage, setSavedMessage] = useState("設定を読み込んでいます。");
  const [diagnosticText, setDiagnosticText] = useState("");
  const [diagnosticMessage, setDiagnosticMessage] = useState("診断情報はまだ作成していません。");
  const validation = validateSettings(settings);

  useEffect(() => {
    void loadSettings()
      .then((loadedSettings) => {
        setSettings(loadedSettings);
        setSavedMessage("設定は変更時に自動保存されます。");
      })
      .catch(() => {
        setSettings(DEFAULT_SETTINGS);
        setSavedMessage("設定を読み込めませんでした。初期設定で表示しています。");
      });
  }, []);

  const updateSettings = (updater: (current: AiMaeCheckSettings) => AiMaeCheckSettings) => {
    setSettings((current) => {
      const next = updater(current);
      void saveSettings(next)
        .then(() => setSavedMessage("保存しました。"))
        .catch(() => setSavedMessage("設定を保存できませんでした。Chromeの拡張機能ストレージを確認してください。"));
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

  const handleResetSettings = () => {
    const confirmed = window.confirm(
      "保存済み設定を初期化しますか？対象サイト、検出ルール、AI文脈チェックの設定が初期値に戻ります。貼り付け本文や検出結果は保存していないため、削除対象には含まれません。"
    );
    if (!confirmed) {
      return;
    }

    setSavedMessage("設定を初期化しています。");
    void resetSettings()
      .then((defaultSettings) => {
        setSettings(defaultSettings);
        setSavedMessage("保存済み設定を初期化しました。");
      })
      .catch(() => setSavedMessage("設定を初期化できませんでした。Chromeの拡張機能ストレージを確認してください。"));
  };

  const createDiagnosticText = async (): Promise<string> => {
    setDiagnosticMessage("本文を含まない診断情報を作成しています。");
    const report = await createPrivacySafeDiagnosticReport({ settings });
    const text = formatPrivacySafeDiagnosticReport(report);
    setDiagnosticText(text);
    setDiagnosticMessage("本文を含まない診断情報を作成しました。内容を確認してからコピーできます。");
    return text;
  };

  const handleCreateDiagnostic = () => {
    void createDiagnosticText().catch(() => setDiagnosticMessage("診断情報を作成できませんでした。"));
  };

  const handleCopyDiagnostic = () => {
    void (async () => {
      const text = diagnosticText.length > 0 ? diagnosticText : await createDiagnosticText();
      if (!navigator.clipboard?.writeText) {
        setDiagnosticMessage("このブラウザではクリップボードへコピーできません。表示された診断情報を選択してコピーしてください。");
        return;
      }

      await navigator.clipboard.writeText(text);
      setDiagnosticMessage("本文を含まない診断情報をコピーしました。");
    })().catch(() => setDiagnosticMessage("診断情報をコピーできませんでした。表示された内容を選択してコピーしてください。"));
  };

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <OptionsHeader savedMessage={savedMessage} />
        <SettingsSummary validation={validation} />
        <OnboardingSection />

        <div className="grid gap-5">
          <BasicSettingsSection enabled={settings.enabled} onEnabledChange={(enabled) => updateSettings((current) => ({ ...current, enabled }))} />
          <TargetSitesSection settings={settings} onSiteChange={updateSite} />
          <DetectionRulesSection settings={settings} onRuleChange={updateRule} />
          <WebLlmSettingsSection
            settings={settings}
            onEnabledChange={(enabled) =>
              updateSettings((current) => ({
                ...current,
                llm: {
                  ...current.llm,
                  enabled
                }
              }))
            }
            onModeChange={updateLlmMode}
          />
          <DiagnosticsSection
            diagnosticMessage={diagnosticMessage}
            diagnosticText={diagnosticText}
            onCreateDiagnostic={handleCreateDiagnostic}
            onCopyDiagnostic={handleCopyDiagnostic}
          />
          <ResetSettingsSection onResetSettings={handleResetSettings} />
        </div>
      </div>
    </main>
  );
}
