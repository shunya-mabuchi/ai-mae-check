import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, resolveModelId } from "../src";

describe("resolveModelId", () => {
  it("過去のLlama指定を現在のQwen単一モデルへ正規化する", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [{ model_id: DEFAULT_MODEL_ID }]
        }
      },
      "Llama-3.2-1B-Instruct-q4f32_1-MLC"
    );

    expect(modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("別モデルを指定されてもQwen単一モデルへ正規化する", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [{ model_id: DEFAULT_MODEL_ID }]
        }
      },
      "Other-Instruct-q4f32_1-MLC"
    );

    expect(modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("prebuilt一覧にQwen単一モデルがない場合は暗黙に別モデルへ切り替えない", () => {
    expect(() =>
      resolveModelId(
        {
          prebuiltAppConfig: {
            model_list: [{ model_id: "Small-Chat-q4f32_1-MLC", vram_required_MB: 300 }]
          }
        },
        DEFAULT_MODEL_ID
      )
    ).toThrow(`WebLLMの対応モデル一覧に ${DEFAULT_MODEL_ID} がありません。`);
  });
});
