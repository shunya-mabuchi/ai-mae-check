import { DEFAULT_MODEL_ID } from "./constants";

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
  void requestedModelId;

  if (ids.length === 0 || ids.includes(DEFAULT_MODEL_ID)) {
    return DEFAULT_MODEL_ID;
  }

  throw new Error(`WebLLMの対応モデル一覧に ${DEFAULT_MODEL_ID} がありません。`);
}
