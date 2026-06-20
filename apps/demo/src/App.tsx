import { DemoCard } from "./components/DemoCard";
import { DetectionTargetCards } from "./components/DetectionTargetCards";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { LaunchFlowSection } from "./components/LaunchFlowSection";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage";
import { PrivacySection } from "./components/PrivacySection";
import { StepCards } from "./components/StepCards";
import { SupportPage } from "./components/SupportPage";
import { TechStrip } from "./components/TechStrip";
import { useDemoWorkbench } from "./hooks/useDemoWorkbench";
import { resolveSiteRoute } from "./lib/siteRoutes";

export function App() {
  const route = resolveSiteRoute(window.location.pathname);

  if (route === "privacy") {
    return <PrivacyPolicyPage />;
  }

  if (route === "support") {
    return <SupportPage />;
  }

  return <DemoLandingPage />;
}

function DemoLandingPage() {
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
    <div className="page-shell min-h-screen text-ink">
      <Hero summary={summary} />
      <main>
        <LaunchFlowSection />
        <DetectionTargetCards />
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
        <StepCards />
        <TechStrip />
        <PrivacySection />
      </main>
      <Footer />
    </div>
  );
}
