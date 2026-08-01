import { DemoCard } from "./components/DemoCard";
import { useDemoWorkbench } from "./hooks/useDemoWorkbench";

export function App() {
  const {
    text,
    detection,
    summary,
    selectedRuleFindingIds,
    llmCandidates,
    selectedCandidateIds,
    maskedText,
    copyMessage,
    llmUiState,
    setText,
    insertSample,
    insertContextSample,
    runRuleDetection,
    runLlmDetection,
    copyMaskedText,
    reset,
    toggleRuleFinding,
    toggleCandidate
  } = useDemoWorkbench();

  return (
    <DemoCard
      text={text}
      onTextChange={setText}
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
  );
}
