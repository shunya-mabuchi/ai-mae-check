import {
  COMPATIBLE_LIGHTWEIGHT_MODEL_ID,
  DEFAULT_MODEL_ID,
  JAPANESE_WEBLLM_FALLBACK_MODEL_ID,
  LEGACY_LIGHTWEIGHT_MODEL_ID,
  LOW_VRAM_MODEL_ID,
  SARASHINA_INSTRUCT_SOURCE_MODEL_ID
} from "./constants";

export type WebLlmModelListModule = {
  prebuiltAppConfig?: {
    model_list?: Array<{
      model_id?: string;
      model?: string;
      vram_required_MB?: number;
    }>;
  };
};

export function getAvailableModelIds(module: WebLlmModelListModule): string[] {
  return (module.prebuiltAppConfig?.model_list ?? [])
    .map((item) => item.model_id ?? item.model)
    .filter((id): id is string => typeof id === "string");
}

export function resolveModelId(module: WebLlmModelListModule, requestedModelId: string): string {
  const ids = getAvailableModelIds(module);
  const preferredModelId = requestedModelId === LEGACY_LIGHTWEIGHT_MODEL_ID ? COMPATIBLE_LIGHTWEIGHT_MODEL_ID : requestedModelId;

  if (ids.includes(preferredModelId)) {
    return preferredModelId;
  }

  if (requestedModelId === SARASHINA_INSTRUCT_SOURCE_MODEL_ID && ids.includes(JAPANESE_WEBLLM_FALLBACK_MODEL_ID)) {
    return JAPANESE_WEBLLM_FALLBACK_MODEL_ID;
  }

  if (ids.includes(DEFAULT_MODEL_ID)) {
    return DEFAULT_MODEL_ID;
  }

  if (ids.includes(COMPATIBLE_LIGHTWEIGHT_MODEL_ID)) {
    return COMPATIBLE_LIGHTWEIGHT_MODEL_ID;
  }

  if (ids.includes(LOW_VRAM_MODEL_ID)) {
    return LOW_VRAM_MODEL_ID;
  }

  const lowVramInstruct = (module.prebuiltAppConfig?.model_list ?? [])
    .filter((item) => typeof item.model_id === "string" && /Instruct|Chat/i.test(item.model_id))
    .sort((a, b) => (a.vram_required_MB ?? Number.MAX_SAFE_INTEGER) - (b.vram_required_MB ?? Number.MAX_SAFE_INTEGER))
    .at(0)?.model_id;

  return lowVramInstruct ?? ids.find((id) => /Instruct|Chat/i.test(id)) ?? requestedModelId;
}
