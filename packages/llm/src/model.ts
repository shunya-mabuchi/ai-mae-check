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

export function resolveModelId(_module: WebLlmModelListModule, _requestedModelId: string): string {
  return DEFAULT_MODEL_ID;
}
