import { describe, expect, it } from "vitest";
import { mergeResidualContextCandidates } from "../src";

describe("mergeResidualContextCandidates", () => {
  it("WebLLMが返さなかった敬称付き人名と案件名をローカル補助候補として追加する", () => {
    const input =
      "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。\n候補者の山田花子さんについて、最終面談後の評価メモも含めます。";
    const candidates = mergeResidualContextCandidates(input, []);

    expect(candidates.map((candidate) => candidate.surface)).toEqual(
      expect.arrayContaining(["Project Blue Bridge", "山田花子さん", "佐藤様", "A社"])
    );
    expect(candidates.find((candidate) => candidate.surface === "Project Blue Bridge")?.category).toBe("project_name");
    expect(candidates.find((candidate) => candidate.surface === "山田花子さん")?.category).toBe("person_name");
    expect(candidates.find((candidate) => candidate.surface === "佐藤様")?.category).toBe("person_name");
    expect(candidates.find((candidate) => candidate.surface === "A社")?.category).toBe("customer_name");
    expect(candidates.every((candidate) => candidate.confidence >= 0.75)).toBe(true);
  });

  it("自己紹介名と提案先らしい会社名をローカル補助候補として追加する", () => {
    const input =
      "田中太郎です。連絡先を確認してください。\nA社向けの提案資料について、NDA締結前なので関係者限りで確認してください。";
    const candidates = mergeResidualContextCandidates(input, []);
    const bySurface = new Map(candidates.map((candidate) => [candidate.surface, candidate]));

    expect([...bySurface.keys()]).toEqual(expect.arrayContaining(["田中太郎", "A社"]));
    expect(bySurface.get("田中太郎")?.category).toBe("person_name");
    expect(bySurface.get("A社")?.category).toBe("customer_name");
    expect(bySurface.get("田中太郎")?.suggestedPlaceholder).toBe("[PERSON_1]");
    expect(bySurface.get("A社")?.suggestedPlaceholder).toBe("[CUSTOMER_1]");
  });

  it("ラベル付きの敬称なし人名をローカル補助候補として追加する", () => {
    const input = "担当: 佐藤一郎\n参加者: 山田花子\nレビュー: 田中太郎";
    const candidates = mergeResidualContextCandidates(input, []);
    const bySurface = new Map(candidates.map((candidate) => [candidate.surface, candidate]));

    expect([...bySurface.keys()]).toEqual(expect.arrayContaining(["佐藤一郎", "山田花子", "田中太郎"]));
    expect(bySurface.get("佐藤一郎")?.category).toBe("person_name");
    expect(bySurface.get("山田花子")?.suggestedPlaceholder).toBe("[PERSON_2]");
  });

  it("法人格つき会社名をローカル補助候補として追加する", () => {
    const input =
      "株式会社サンプル向けの提案です。サンプル株式会社との契約更新です。合同会社ミライの法務確認です。";
    const candidates = mergeResidualContextCandidates(input, []);
    const bySurface = new Map(candidates.map((candidate) => [candidate.surface, candidate]));

    expect([...bySurface.keys()]).toEqual(expect.arrayContaining(["株式会社サンプル", "サンプル株式会社", "合同会社ミライ"]));
    expect(bySurface.get("株式会社サンプル")?.category).toBe("company_name");
    expect(bySurface.get("サンプル株式会社")?.suggestedPlaceholder).toBe("[COMPANY_2]");
  });

  it("日本語の案件名とPJ名をローカル補助候補として追加する", () => {
    const input = "Blue Bridge計画の初期案です。Phoenix案件の見積もりと新料金プラン移行PJの説明をまとめます。";
    const candidates = mergeResidualContextCandidates(input, []);
    const bySurface = new Map(candidates.map((candidate) => [candidate.surface, candidate]));

    expect([...bySurface.keys()]).toEqual(expect.arrayContaining(["Blue Bridge計画", "Phoenix案件", "新料金プラン移行PJ"]));
    expect(bySurface.get("新料金プラン移行PJ")?.category).toBe("project_name");
  });

  it("採用・契約・未公開・社内限定の定型文脈をローカル補助候補として追加する", () => {
    const input =
      "最終面談評価と年収条件を内定前に確認します。契約更新は発表前なので外には出さない予定です。社内だけで確認し、法務確認もお願いします。";
    const candidates = mergeResidualContextCandidates(input, []);
    const bySurface = new Map(candidates.map((candidate) => [candidate.surface, candidate]));

    expect([...bySurface.keys()]).toEqual(
      expect.arrayContaining(["最終面談評価", "年収条件", "契約更新", "発表前なので外には出さない", "社内だけで確認", "法務確認"])
    );
    expect(bySurface.get("最終面談評価")?.category).toBe("hr_info");
    expect(bySurface.get("契約更新")?.category).toBe("contract_info");
    expect(bySurface.get("発表前なので外には出さない")?.category).toBe("confidential_context");
    expect(bySurface.get("社内だけで確認")?.category).toBe("internal_info");
    expect(bySurface.get("法務確認")?.category).toBe("legal_info");
  });

  it("既存のLLM候補と重複するsurfaceは追加しない", () => {
    const input = "候補者の山田花子さんについて確認します。";
    const candidates = mergeResidualContextCandidates(input, [
      {
        id: "llm-candidate-1",
        category: "person_name",
        surface: "山田花子さん",
        label: "人名候補",
        reason: "採用文脈の候補です。",
        riskLevel: "medium",
        suggestedPlaceholder: "[PERSON_1]",
        confidence: 0.9
      }
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.surface).toBe("山田花子さん");
  });
});
