import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectSensitiveText,
  maskSensitiveText,
  mergeFindings,
  type DetectionResult
} from "@harumae/core";
import {
  convertContextCandidatesToFindings,
  classifyLlmError,
  createLlmContextAnalyzer,
  isWebGpuAvailable,
  MODEL_LOADING_MESSAGE,
  WEBGPU_UNAVAILABLE_MESSAGE,
  type ContextRiskCandidate,
  type LlmContextAnalyzer,
  type LlmErrorDetail,
  type LlmProgress
} from "@harumae/llm";
import { DemoCard } from "./components/DemoCard";
import { DetectionTargetCards } from "./components/DetectionTargetCards";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { PrivacySection } from "./components/PrivacySection";
import { StepCards } from "./components/StepCards";
import { TechStrip } from "./components/TechStrip";
import { initialLlmMessage, sampleText, type LlmStatus } from "./lib/demoConstants";

const emptySummary = { total: 0, high: 0, medium: 0, low: 0, byRule: {} };

export function App() {
  const analyzerRef = useRef<LlmContextAnalyzer | null>(null);
  const [text, setText] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [selectedRuleFindingIds, setSelectedRuleFindingIds] = useState<string[]>([]);
  const [llmCandidates, setLlmCandidates] = useState<ContextRiskCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("idle");
  const [llmMessage, setLlmMessage] = useState(initialLlmMessage);
  const [llmErrorDetail, setLlmErrorDetail] = useState<LlmErrorDetail | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const selectedRuleFindings = useMemo(() => {
    if (!detection) {
      return [];
    }

    return detection.findings.filter((finding) => selectedRuleFindingIds.includes(finding.id));
  }, [detection, selectedRuleFindingIds]);

  const selectedLlmFindings = useMemo(() => {
    const selectedCandidates = llmCandidates.filter((candidate) => selectedCandidateIds.includes(candidate.id));
    return convertContextCandidatesToFindings(text, selectedCandidates);
  }, [llmCandidates, selectedCandidateIds, text]);

  const mergedFindings = useMemo(() => {
    if (!detection) {
      return selectedLlmFindings;
    }

    return mergeFindings(selectedRuleFindings, selectedLlmFindings);
  }, [detection, selectedLlmFindings, selectedRuleFindings]);

  const maskedText = useMemo(() => {
    if (!detection && mergedFindings.length === 0) {
      return "";
    }

    if (mergedFindings.length === 0) {
      return text;
    }

    return maskSensitiveText(text, mergedFindings).maskedText;
  }, [detection, mergedFindings, text]);

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
    setLlmStatus("idle");
    setLlmMessage(initialLlmMessage);
    setLlmErrorDetail(null);
  };

  const insertSample = () => {
    setText(sampleText);
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
      setLlmStatus("error");
      setLlmMessage("先に貼り付け前テキストを入力してください。");
      setLlmErrorDetail(null);
      return;
    }

    const ruleResult = detection ?? detectSensitiveText(text);
    if (!detection) {
      setDetection(ruleResult);
      setSelectedRuleFindingIds(ruleResult.findings.map((finding) => finding.id));
    }

    if (!isWebGpuAvailable()) {
      setLlmStatus("error");
      setLlmMessage(WEBGPU_UNAVAILABLE_MESSAGE);
      setLlmErrorDetail({
        kind: "webgpu",
        message: WEBGPU_UNAVAILABLE_MESSAGE,
        hint: "chrome://gpu のDawn InfoでD3D12 backendがAvailableか確認してください。"
      });
      return;
    }

    setLlmStatus("loading");
    setLlmMessage(MODEL_LOADING_MESSAGE);
    setLlmErrorDetail(null);
    const analyzer = getAnalyzer();

    try {
      const result = await analyzer.analyze(text, {
        existingFindings: ruleResult.findings,
        onProgress: (progress: LlmProgress) => {
          setLlmStatus(progress.phase === "analyzing" ? "analyzing" : "loading");
          setLlmMessage(progress.message);
        }
      });

      if (result.error) {
        setLlmStatus("error");
        setLlmMessage(result.error);
        setLlmErrorDetail(result.errorDetail ?? null);
        resetAnalyzer();
        return;
      }

      setLlmCandidates(result.candidates);
      setSelectedCandidateIds(
        result.candidates.filter((candidate) => candidate.confidence >= 0.75).map((candidate) => candidate.id)
      );

      if (result.candidates.length > 0) {
        setLlmStatus("done");
        setLlmMessage("AI文脈チェックで注意候補が見つかりました。");
      } else {
        setLlmStatus("empty");
        setLlmMessage("AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。");
      }
    } catch (error) {
      const errorDetail = classifyLlmError(error);
      setLlmStatus("error");
      setLlmMessage(errorDetail.message);
      setLlmErrorDetail(errorDetail);
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
          llmStatus={llmStatus}
          llmMessage={llmMessage}
          llmErrorDetail={llmErrorDetail}
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
