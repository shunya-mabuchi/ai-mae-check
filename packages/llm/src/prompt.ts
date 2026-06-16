import { DEFAULT_MAX_CANDIDATES } from "./constants";
import type { ChatMessage, ContextPromptOptions, SanitizePromptOptions } from "./types";

function summarizeExistingFindings(options: ContextPromptOptions): string {
  const findings = options.existingFindings ?? [];
  if (findings.length === 0) {
    return "既存のルール検出: なし";
  }

  const lines = findings.slice(0, 20).map((finding) => {
    return `- ${finding.label} / 危険度:${finding.riskLevel} / 範囲:${finding.start}-${finding.end}`;
  });

  return ["既存のルール検出:", ...lines].join("\n");
}

export function buildContextRiskPrompt(input: string, options: ContextPromptOptions = {}): ChatMessage[] {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const system = [
    "あなたは、外部AIや外部フォームに文章を送る前の確認を補助する文脈リスク検出器です。",
    "目的は、入力文からマスクした方がよい候補を見つけることです。",
    "最終的な安全判定を断言せず、注意候補だけをJSONで返してください。"
  ].join("\n");

  const user = [
    "次のルールを必ず守ってください。",
    "- 必ずJSONだけを返す",
    "- 入力文に存在しない文字列を作らない",
    "- surfaceには入力文中に実在する短い文字列を入れる",
    `- 候補は最大${maxCandidates}件`,
    "- 確信が低いものは出さない",
    "- APIキー、メール、電話番号などの明確なものは既存ルールで検出済みなので、主に文脈情報を見る",
    "- 顧客名、人名、会社名、案件名、契約、見積、給与、採用、法務、社内事情、社外秘に近い文脈を優先する",
    "- 「佐藤様」「山田花子さん」「候補者の山田花子さん」のような敬称つき人名・候補者名はperson_name候補として優先する",
    "- 「Project Blue Bridge」のような案件名・プロジェクト名はproject_name候補として優先する",
    "- 「安全です」と断言しない",
    "- reasonは日本語で短く書く",
    "",
    "カテゴリは次のいずれかにしてください。",
    "person_name, company_name, customer_name, project_name, contract_info, hr_info, legal_info, financial_info, internal_info, confidential_context, other",
    "",
    "期待JSON形式:",
    JSON.stringify(
      {
        candidates: [
          {
            category: "customer_name",
            surface: "A社",
            label: "顧客名候補",
            reason: "提案資料やNDA締結前という文脈から、顧客名の可能性があります。",
            riskLevel: "medium",
            suggestedPlaceholder: "[CUSTOMER_1]",
            confidence: 0.82
          }
        ],
        summary: "顧客名や契約前情報と思われる候補が含まれています。"
      },
      null,
      2
    ),
    "",
    summarizeExistingFindings(options),
    "",
    "入力文:",
    input
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export function buildSanitizePrompt(input: string, options: SanitizePromptOptions = {}): ChatMessage[] {
  const mode = options.mode ?? "minimize";
  const system = [
    "You are a local browser DLP assistant for preparing text before it is sent to an external AI or form.",
    "Return strict JSON only. Do not call external tools, do not summarize for convenience, and do not claim the text is completely safe.",
    "Your job is to create a natural safe_prompt request for an external AI by removing, masking, or generalizing sensitive context while preserving the user's intent as much as possible."
  ].join("\n");

  const user = [
    "次のルールを必ず守ってください。",
    "- 必ずJSONだけを返す",
    "- 入力文にない事実を作らない",
    "- safe_promptは外部AIへ貼るための自然な依頼文として書き直す",
    "- 元文章の要約ではなく、ユーザーがAIに依頼したい作業目的を残す",
    "- APIキー、秘密鍵、JWT、.env、認証情報はsafe_promptに残さない",
    "- 人名、会社名、顧客名、案件名、契約、給与、採用、法務、金額は必要に応じて汎用化または削除する",
    "- 「佐藤様」「山田花子さん」のような敬称つき人名、候補者名、担当者名はsafe_promptに残さない",
    "- 「Project Blue Bridge」のような案件名・プロジェクト名はsafe_promptに残さず、必要なら[PROJECT_1]のように置き換える",
    "- 顧客提案: 顧客名、案件名、金額、契約前情報を抽象化する",
    "- 採用/人事: 候補者名、評価、給与条件、内定前情報を抽象化する",
    "- 法務/契約: 相手先、契約条件、未公開情報、NDA文脈を抽象化する",
    "- 社内情報: 社内URL、組織名、内部プロジェクト名、環境名を抽象化する",
    "- safe_promptは外部AIへ送る前の候補文です。安全を保証する文章は書かない",
    "- user_visible_explanationには削った/抽象化したカテゴリと、生成後に再スキャンする前提を短く書く",
    "- 変換できないほど危険な場合はblockをtrueにし、safe_promptを空文字にする",
    `- 希望モード: ${mode}`,
    "",
    "detected_categories[].type は次のいずれかにしてください。",
    "person, organization, address, email, phone, id, secret, financial, medical, legal, date, url, file, other",
    "detected_categories[].action は mask, generalize, remove, block のいずれかにしてください。",
    "",
    "期待JSON形式:",
    JSON.stringify(
      {
        block: false,
        risk_level: "medium",
        detected_categories: [
          {
            type: "organization",
            risk: "medium",
            action: "generalize"
          }
        ],
        safe_prompt:
          "顧客向け提案資料について、顧客名・案件名・金額・契約前情報を伏せたうえで、外部AIで要点整理できる依頼文に整えてください。",
        user_visible_explanation: "顧客名、案件名、金額、契約前情報を抽象化しました。生成後にルールベースで再スキャンします。"
      },
      null,
      2
    ),
    "",
    summarizeExistingFindings(options),
    "",
    "入力文:",
    input
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}
