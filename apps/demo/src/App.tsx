import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Clipboard,
  Github,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Wand2
} from "lucide-react";
import {
  detectSensitiveText,
  maskSensitiveText,
  mergeFindings,
  type DetectionResult,
  type Finding,
  type RiskLevel
} from "@harumae/core";
import {
  convertContextCandidatesToFindings,
  createLlmContextAnalyzer,
  formatLlmErrorMessage,
  isWebGpuAvailable,
  type ContextRiskCandidate,
  type LlmProgress
} from "@harumae/llm";

const sampleText = `田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。

A社向けの提案資料について、NDA締結前なので関係者限りで確認してください。
初期費用は300万円、月額80万円で進める予定です。

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456

社内確認URL:
https://user:password@example.com/internal/proposal

この内容をChatGPTで要約したいです。`;

const riskLabel: Record<RiskLevel, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const riskClass: Record<RiskLevel, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-stone-200 bg-stone-100 text-stone-700"
};

type LlmStatus = "idle" | "loading" | "analyzing" | "done" | "empty" | "error";

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-semibold text-leaf">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-normal text-ink md:text-3xl">{title}</h2>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
}) {
  const className =
    variant === "primary"
      ? "border-leaf bg-leaf text-white hover:bg-[#276848]"
      : variant === "secondary"
        ? "border-ink bg-ink text-white hover:bg-[#343638]"
        : "border-line bg-white text-ink hover:bg-stone-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}

function FindingList({
  findings,
  selectedFindingIds,
  onToggle
}: {
  findings: Finding[];
  selectedFindingIds: string[];
  onToggle: (id: string) => void;
}) {
  if (findings.length === 0) {
    return <p className="rounded-md border border-line bg-white p-4 text-sm text-stone-600">まだ検出結果はありません。</p>;
  }

  return (
    <div className="space-y-3">
      {findings.map((finding) => (
        <label key={finding.id} className="block rounded-md border border-line bg-white p-3">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-leaf"
              checked={selectedFindingIds.includes(finding.id)}
              onChange={() => onToggle(finding.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${riskClass[finding.riskLevel]}`}>
                  危険度: {riskLabel[finding.riskLevel]}
                </span>
                <span className="text-sm font-semibold text-ink">{finding.label}</span>
                <span className="text-xs text-stone-500">{finding.source === "llm" ? "AI候補" : "ルール"}</span>
                <span className="text-xs font-semibold text-leaf">
                  {selectedFindingIds.includes(finding.id) ? "マスク対象" : "マスク対象外"}
                </span>
              </div>
              <p className="break-all rounded bg-stone-50 px-2 py-1 font-mono text-sm text-stone-800">{finding.text}</p>
              <p className="mt-2 text-xs text-stone-600">{finding.message}</p>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

function LlmCandidates({
  candidates,
  selectedCandidateIds,
  onToggle
}: {
  candidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  onToggle: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 space-y-3">
      <h3 className="text-sm font-semibold text-ink">AI文脈チェック結果</h3>
      {candidates.map((candidate) => (
        <label key={candidate.id} className="block rounded-md border border-line bg-white p-3">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-leaf"
              checked={selectedCandidateIds.includes(candidate.id)}
              onChange={() => onToggle(candidate.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{candidate.label}</span>
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${riskClass[candidate.riskLevel]}`}>
                  危険度: {riskLabel[candidate.riskLevel]}
                </span>
                <span className="text-xs text-stone-500">confidence: {candidate.confidence.toFixed(2)}</span>
              </div>
              <p className="break-all rounded bg-stone-50 px-2 py-1 font-mono text-sm">{candidate.surface}</p>
              <p className="mt-2 text-xs leading-5 text-stone-600">{candidate.reason}</p>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

export function App() {
  const [text, setText] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [selectedRuleFindingIds, setSelectedRuleFindingIds] = useState<string[]>([]);
  const [llmCandidates, setLlmCandidates] = useState<ContextRiskCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("idle");
  const [llmMessage, setLlmMessage] = useState("AI文脈チェックは手動で実行できます。");
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
    if (mergedFindings.length === 0) {
      return detection ? text : "";
    }

    return maskSensitiveText(text, mergedFindings).maskedText;
  }, [detection, mergedFindings, text]);

  const runRuleDetection = () => {
    const result = detectSensitiveText(text);
    setDetection(result);
    setSelectedRuleFindingIds(result.findings.map((finding) => finding.id));
    setLlmCandidates([]);
    setSelectedCandidateIds([]);
    setLlmStatus("idle");
    setLlmMessage("AI文脈チェックは手動で実行できます。");
  };

  const runLlmDetection = async () => {
    if (text.trim().length === 0) {
      setLlmStatus("error");
      setLlmMessage("先に貼り付け前テキストを入力してください。");
      return;
    }

    const ruleResult = detection ?? detectSensitiveText(text);
    if (!detection) {
      setDetection(ruleResult);
      setSelectedRuleFindingIds(ruleResult.findings.map((finding) => finding.id));
    }

    if (!isWebGpuAvailable()) {
      setLlmStatus("error");
      setLlmMessage("このブラウザまたは端末ではAI文脈チェックを利用できません。ルールベースの検出は引き続き利用できます。");
      return;
    }

    setLlmStatus("loading");
    setLlmMessage("ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。");
    const analyzer = createLlmContextAnalyzer();

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
        return;
      }

      setLlmCandidates(result.candidates);
      setSelectedCandidateIds(result.candidates.filter((candidate) => candidate.confidence >= 0.75).map((candidate) => candidate.id));
      if (result.candidates.length > 0) {
        setLlmStatus("done");
        setLlmMessage("AI文脈チェックで注意候補が見つかりました。");
      } else {
        setLlmStatus("empty");
        setLlmMessage("AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。");
      }
    } catch {
      setLlmStatus("error");
      setLlmMessage(formatLlmErrorMessage(new Error("AI文脈チェックを実行できませんでした")));
    } finally {
      analyzer.dispose();
    }
  };

  const reset = () => {
    setText("");
    setDetection(null);
    setSelectedRuleFindingIds([]);
    setLlmCandidates([]);
    setSelectedCandidateIds([]);
    setLlmStatus("idle");
    setLlmMessage("AI文脈チェックは手動で実行できます。");
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
    setSelectedCandidateIds((current) => (current.includes(id) ? current.filter((candidateId) => candidateId !== id) : [...current, id]));
  };

  const toggleRuleFinding = (id: string) => {
    setSelectedRuleFindingIds((current) => (current.includes(id) ? current.filter((findingId) => findingId !== id) : [...current, id]));
  };

  const summary = detection?.summary ?? { total: 0, high: 0, medium: 0, low: 0, byRule: {} };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="hero-scene border-b border-line">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a href="#" className="text-lg font-bold text-ink" aria-label="貼るまえ トップ">
            貼るまえ
          </a>
          <div className="flex items-center gap-3 text-sm">
            <a className="font-semibold text-stone-700 hover:text-ink" href="#demo">
              デモ
            </a>
            <a className="font-semibold text-stone-700 hover:text-ink" href="#privacy">
              プライバシー
            </a>
          </div>
        </nav>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[1fr_0.82fr] md:pb-20 md:pt-14">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-leaf">
              <ShieldCheck size={16} aria-hidden="true" />
              AIに貼る前に、消し忘れを見つける。
            </p>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-normal text-ink md:text-7xl">そのまま貼らない。</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
              ChatGPTや外部フォームに文章を貼る前に、
              <br />
              個人情報・秘密情報・APIキーの消し忘れをチェック。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-leaf bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-[#276848]">
                <Play size={17} aria-hidden="true" />
                デモで試す
              </a>
              <a href="#footer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-stone-50">
                <Github size={17} aria-hidden="true" />
                GitHubを見る
              </a>
            </div>
          </div>

          <div className="rounded-md border border-line bg-white/88 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <span className="text-sm font-semibold">貼り付け前チェック</span>
              <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">高リスク {summary.high}</span>
            </div>
            <div className="space-y-3">
              <div className="redaction-line w-4/5" />
              <div className="redaction-line w-2/3" />
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">taro@example.com を検出</div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">NDA締結前の文脈候補</div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle eyebrow="課題" title="AIに貼る前、こんな情報が混ざっていませんか？" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["メールアドレス", "電話番号", "APIキー", "社内URL", "顧客名", "契約金額", "社外秘の文章"].map((item) => (
              <div key={item} className="rounded-md border border-line bg-white p-4 text-sm font-semibold">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="border-y border-line bg-white py-16">
          <div className="mx-auto max-w-6xl px-5">
            <SectionTitle eyebrow="デモ" title="検出とマスキングをブラウザ内で試す" />
            <div className="mb-5 flex flex-wrap gap-3">
              <Button onClick={() => setText(sampleText)} variant="quiet">
                <Clipboard size={17} aria-hidden="true" />
                サンプル文を挿入
              </Button>
              <Button onClick={runRuleDetection}>
                <ShieldCheck size={17} aria-hidden="true" />
                ルールベースで検出
              </Button>
              <Button onClick={runLlmDetection} variant="secondary" disabled={llmStatus === "loading" || llmStatus === "analyzing"}>
                <Sparkles size={17} aria-hidden="true" />
                AI文脈チェックも実行
              </Button>
              <Button onClick={copyMaskedText} variant="quiet" disabled={!maskedText}>
                <Wand2 size={17} aria-hidden="true" />
                マスキング後テキストをコピー
              </Button>
              <Button onClick={reset} variant="quiet">
                <RefreshCcw size={17} aria-hidden="true" />
                リセット
              </Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-semibold text-ink">貼り付け前テキスト</h3>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-[420px] w-full resize-y rounded-md border border-line bg-paper p-4 text-sm leading-6 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  placeholder="ここにAIへ貼る前の文章を入力してください。"
                />
              </div>

              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-semibold text-ink">検出結果</h3>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-xs font-semibold text-red-700">高</p>
                    <p className="text-2xl font-bold text-red-800">{summary.high}</p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center">
                    <p className="text-xs font-semibold text-amber-800">中</p>
                    <p className="text-2xl font-bold text-amber-900">{summary.medium}</p>
                  </div>
                  <div className="rounded-md border border-stone-200 bg-stone-100 p-3 text-center">
                    <p className="text-xs font-semibold text-stone-700">低</p>
                    <p className="text-2xl font-bold text-stone-800">{summary.low}</p>
                  </div>
                </div>
                <div className="max-h-[420px] overflow-auto pr-1">
                  <FindingList
                    findings={detection?.findings ?? []}
                    selectedFindingIds={selectedRuleFindingIds}
                    onToggle={toggleRuleFinding}
                  />
                  <div
                    className={`mt-4 rounded-md border p-3 text-sm ${
                      llmStatus === "error"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : llmStatus === "done"
                          ? "border-leaf/30 bg-green-50 text-green-900"
                          : "border-line bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <p>{llmMessage}</p>
                    </div>
                  </div>
                  <LlmCandidates candidates={llmCandidates} selectedCandidateIds={selectedCandidateIds} onToggle={toggleCandidate} />
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-semibold text-ink">マスキング後テキスト</h3>
                <pre className="min-h-[420px] whitespace-pre-wrap break-words rounded-md border border-line bg-paper p-4 text-sm leading-6 text-stone-800">
                  {maskedText || "検出を実行すると、ここにマスキング後のテキストが表示されます。"}
                </pre>
                {copyMessage && <p className="mt-2 text-sm font-semibold text-leaf">{copyMessage}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle eyebrow="仕組み" title="貼る前の最後の確認レイヤー" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {["すべてブラウザ内で処理", "ユーザー本文はサーバー送信なし", "アカウント不要", "Chrome拡張として利用可能", "WebLLMによるローカルAI文脈チェック"].map((item) => (
              <div key={item} className="rounded-md border border-line bg-white p-4 text-sm leading-6">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-white py-16">
          <div className="mx-auto max-w-6xl px-5">
            <SectionTitle eyebrow="技術" title="フロントエンドだけで動く構成" />
            <div className="flex flex-wrap gap-2">
              {["TypeScript", "React", "WXT", "Chrome Extension Manifest V3", "Content Script", "WebLLM", "WebGPU", "Web Worker", "chrome.storage.local", "Vitest"].map((item) => (
                <span key={item} className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle eyebrow="プライバシー" title="本文を保存しない設計" />
          <p className="max-w-3xl text-base leading-8 text-stone-700">
            貼り付け本文は永続保存しません。設定のみブラウザ内に保存します。
            AI文脈チェックではWebLLMを使い、ユーザーのブラウザ内で推論します。
            初回利用時にはモデルファイルを取得する場合がありますが、貼り付け本文を外部LLM APIへ送ることはありません。
          </p>
        </section>
      </main>

      <footer id="footer" className="border-t border-line bg-ink px-5 py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <p className="font-semibold">貼るまえ</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="#" className="hover:underline">
              GitHub
            </a>
            <a href="#privacy" className="hover:underline">
              README
            </a>
            <a href="#privacy" className="hover:underline">
              プライバシー方針
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
