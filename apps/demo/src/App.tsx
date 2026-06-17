import { useEffect, useMemo, useRef, useState } from "react";
import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createLlmContextAnalyzer,
  isContextAnalysisExecutionError,
  isWebGpuAvailable,
  type ContextRiskCandidate,
  type LlmContextAnalyzer
} from "@ai-mae-check/llm";
import { DemoCard } from "./components/DemoCard";
import { DetectionTargetCards } from "./components/DetectionTargetCards";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { PrivacySection } from "./components/PrivacySection";
import { StepCards } from "./components/StepCards";
import { TechStrip } from "./components/TechStrip";
import { contextSampleText, sampleText } from "./lib/demoConstants";
import {
  createEmptyInputLlmUiState,
  createErrorLlmUiState,
  createIdleLlmUiState,
  createLlmResultUiState,
  createLoadingLlmUiState,
  createProgressLlmUiState,
  createWebGpuUnavailableLlmUiState
} from "./lib/demoLlmUiState";
import { createDemoMaskingViewModel, selectCandidateIdsByConfidence } from "./lib/demoMasking";

const emptySummary = { total: 0, critical: 0, high: 0, medium: 0, low: 0, byRule: {} };

export function App() {
  const analyzerRef = useRef<LlmContextAnalyzer | null>(null);
  const [text, setText] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [selectedRuleFindingIds, setSelectedRuleFindingIds] = useState<string[]>([]);
  const [llmCandidates, setLlmCandidates] = useState<ContextRiskCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [llmUiState, setLlmUiState] = useState(createIdleLlmUiState);
  const [copyMessage, setCopyMessage] = useState("");

  const maskingViewModel = useMemo(
    () =>
      createDemoMaskingViewModel({
        inputText: text,
        detection,
        selectedRuleFindingIds,
        llmCandidates,
        selectedCandidateIds
      }),
    [detection, llmCandidates, selectedCandidateIds, selectedRuleFindingIds, text]
  );

  const maskedText = maskingViewModel.maskedText;

  const summary = detection?.summary ?? emptySummary;

  useEffect(() => {
    return () => {
      analyzerRef.current?.dispose();
      analyzerRef.current = null;
    };
  }, []);

  const getAnalyzer = () => {
    analyzerRef.current ??= createLlmContextAnalyzer();
    return analyzerRef.current;
  };

  const resetAnalyzer = () => {
    analyzerRef.current?.dispose();
    analyzerRef.current = null;
  };

  const resetLlmState = () => {
    setLlmCandidates([]);
    setSelectedCandidateIds([]);
    setLlmUiState(createIdleLlmUiState());
  };

  const insertSample = () => {
    setText(sampleText);
    setDetection(null);
    setSelectedRuleFindingIds([]);
    resetLlmState();
    setCopyMessage("");
  };

  const insertContextSample = () => {
    setText(contextSampleText);
    setDetection(null);
    setSelectedRuleFindingIds([]);
    resetLlmState();
    setCopyMessage("");
  };

  const runRuleDetection = () => {
    const result = detectSensitiveText(text);
    setDetection(result);
    setSelectedRuleFindingIds(result.findings.map((finding) => finding.id));
    resetLlmState();
    setCopyMessage("");
  };

  const runLlmDetection = async () => {
    if (text.trim().length === 0) {
      setLlmUiState(createEmptyInputLlmUiState());
      return;
    }

    const ruleResult = detection ?? detectSensitiveText(text);
    if (!detection) {
      setDetection(ruleResult);
      setSelectedRuleFindingIds(ruleResult.findings.map((finding) => finding.id));
    }

    if (!isWebGpuAvailable()) {
      setLlmUiState(createWebGpuUnavailableLlmUiState());
      return;
    }

    setLlmUiState(createLoadingLlmUiState());
    const analyzer = getAnalyzer();

    try {
      const result = await analyzer.analyze(text, {
        existingFindings: ruleResult.findings,
        onProgress: (progress) => setLlmUiState(createProgressLlmUiState(progress))
      });

      if (isContextAnalysisExecutionError(result)) {
        setLlmUiState(
          result.errorDetail
            ? createErrorLlmUiState(result.errorDetail)
            : {
                status: "error",
                message: result.error ?? "AI文脈チェックを実行できませんでした。",
                errorDetail: null
              }
        );
        resetAnalyzer();
        return;
      }

      setLlmCandidates(result.candidates);
      setSelectedCandidateIds(selectCandidateIdsByConfidence(result.candidates));
      setLlmUiState(createLlmResultUiState(result.candidates.length, result.errorDetail));
    } catch (error) {
      const errorDetail = classifyLlmError(error);
      setLlmUiState(createErrorLlmUiState(errorDetail));
      resetAnalyzer();
    }
  };

  const reset = () => {
    setText("");
    setDetection(null);
    setSelectedRuleFindingIds([]);
    resetLlmState();
    setCopyMessage("");
  };

  const copyMaskedText = async () => {
    if (!maskedText) {
      return;
    }

    await navigator.clipboard.writeText(maskedText);
    setCopyMessage("マスキング後テキストをコピーしました。");
  };

  const toggleCandidate = (id: string) => {
    setSelectedCandidateIds((current) =>
      current.includes(id) ? current.filter((candidateId) => candidateId !== id) : [...current, id]
    );
  };

  const toggleRuleFinding = (id: string) => {
    setSelectedRuleFindingIds((current) =>
      current.includes(id) ? current.filter((findingId) => findingId !== id) : [...current, id]
    );
  };

  return (
    <div className="page-shell min-h-screen text-ink">
      <Hero summary={summary} />
      <main>
        <DetectionTargetCards />
        <DemoCard
          text={text}
          onTextChange={(value) => {
            setText(value);
            setCopyMessage("");
          }}
          onInsertSample={insertSample}
          onInsertContextSample={insertContextSample}
          onRuleDetection={runRuleDetection}
          onLlmDetection={runLlmDetection}
          onCopyMaskedText={copyMaskedText}
          onReset={reset}
          detection={detection}
          summary={summary}
          selectedRuleFindingIds={selectedRuleFindingIds}
          onToggleRuleFinding={toggleRuleFinding}
          llmCandidates={llmCandidates}
          selectedCandidateIds={selectedCandidateIds}
          onToggleCandidate={toggleCandidate}
          llmStatus={llmUiState.status}
          llmMessage={llmUiState.message}
          llmErrorDetail={llmUiState.errorDetail}
          maskedText={maskedText}
          copyMessage={copyMessage}
        />
        <StepCards />
        <TechStrip />
        <PrivacySection />
      </main>
      <Footer />
    </div>
  );
}
