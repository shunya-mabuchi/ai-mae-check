import { describe, expect, it } from "vitest";
import {
  COMPATIBLE_LIGHTWEIGHT_MODEL_ID,
  DEFAULT_MODEL_ID,
  LEGACY_LIGHTWEIGHT_MODEL_ID,
  LOW_VRAM_MODEL_ID,
  resolveModelId
} from "../src";

describe("resolveModelId", () => {
  it("maps the legacy f16 default to the f32-compatible model", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [{ model_id: COMPATIBLE_LIGHTWEIGHT_MODEL_ID }]
        }
      },
      LEGACY_LIGHTWEIGHT_MODEL_ID
    );

    expect(modelId).toBe(COMPATIBLE_LIGHTWEIGHT_MODEL_ID);
  });

  it("uses the low-vram model when the default model is not available", () => {
    const modelId = resolveModelId(
      {
        prebuiltAppConfig: {
          model_list: [{ model_id: LOW_VRAM_MODEL_ID, vram_required_MB: 579.61 }]
        }
      },
      DEFAULT_MODEL_ID
    );

    expect(modelId).toBe(LOW_VRAM_MODEL_ID);
  });

  it("falls back to the lowest-vram instruct/chat model in a custom model list", () => {
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

    expect(modelId).toBe("Small-Chat-q4f32_1-MLC");
  });
});
