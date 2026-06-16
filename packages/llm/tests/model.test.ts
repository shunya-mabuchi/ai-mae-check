import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, resolveModelId } from "../src";

describe("resolveModelId", () => {
  it("legacy f16指定も正式対応モデルへ正規化する", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [{ model_id: DEFAULT_MODEL_ID }]
        }
      },
      "Llama-3.2-1B-Instruct-q4f16_1-MLC"
    );

    expect(modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("古い保存設定や手動指定が残っていても正式対応モデルへ正規化する", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [{ model_id: DEFAULT_MODEL_ID }]
        }
      },
      "gemma-2-2b-jpn-it-q4f32_1-MLC"
    );

    expect(modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("prebuilt一覧に正式対応モデルがない場合も未知の代替モデルへは切り替えない", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [
            { model_id: "Large-Instruct-q4f32_1-MLC", vram_required_MB: 5000 },
            { model_id: "Small-Chat-q4f32_1-MLC", vram_required_MB: 300 }
          ]
        }
      },
      "missing-model"
    );

    expect(modelId).toBe(DEFAULT_MODEL_ID);
  });
});
