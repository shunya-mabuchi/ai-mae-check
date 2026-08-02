/// <reference path="./vite-env.d.ts" />

import { MODEL_LOADING_MESSAGE } from "./constants";
import { resolveModelId, type WebLlmModelListModule } from "./model";
import type { LlmProgress } from "./types";

declare const __AI_MAE_EXTERNAL_WEBLLM_WORKER_ONLY__: boolean;

type WebLlmProgressReport = {
  progress?: number;
  text?: string;
};

export type WebLlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type WebLlmCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type WebLlmEngine = {
  chat: {
    completions: {
      create(request: {
        messages: WebLlmChatMessage[];
        temperature: number;
        max_tokens: number;
      }): Promise<WebLlmCompletion>;
    };
  };
  unload?(): Promise<void>;
};

type WebLlmModule = WebLlmModelListModule & {
  CreateWebWorkerMLCEngine(
    worker: Worker,
    modelId: string,
    options?: {
      initProgressCallback?: (report: WebLlmProgressReport) => void;
    },
    chatOptions?: {
      context_window_size?: number;
    }
  ): Promise<WebLlmEngine>;
};

interface CreateWebLlmEngineLifecycleOptions {
  modelId: string;
  contextWindowSize?: number;
  workerUrl?: string;
}

export interface WebLlmEngineSession {
  engine: WebLlmEngine;
  modelId: string;
}

export interface WebLlmEngineLifecycle {
  getOrCreate(onProgress?: (progress: LlmProgress) => void): Promise<WebLlmEngineSession>;
  isReady(): boolean;
  dispose(): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasUsableModelList(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  const modelList = value.model_list;
  return (
    modelList === undefined ||
    (Array.isArray(modelList) && modelList.every((item) => isRecord(item)))
  );
}

export function isWebLlmModuleShape(value: unknown): value is WebLlmModule {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.CreateWebWorkerMLCEngine === "function" && hasUsableModelList(value.prebuiltAppConfig);
}

async function loadWebLlmModule(): Promise<WebLlmModule> {
  const module = await import("@mlc-ai/web-llm");
  if (!isWebLlmModuleShape(module)) {
    throw new Error("WebLLMモジュールの形式を確認できませんでした。");
  }

  return module;
}

async function createWorkerInstance(workerUrl?: string): Promise<Worker> {
  if (workerUrl) {
    return new Worker(workerUrl, { type: "module" });
  }

  if (
    typeof __AI_MAE_EXTERNAL_WEBLLM_WORKER_ONLY__ !== "undefined" &&
    __AI_MAE_EXTERNAL_WEBLLM_WORKER_ONLY__
  ) {
    throw new Error("WebLLM WorkerのURLが指定されていません。");
  }

  const { default: WebLlmWorker } = await import("./webllmWorker?worker");
  return new WebLlmWorker();
}

export function createWebLlmEngineLifecycle(options: CreateWebLlmEngineLifecycleOptions): WebLlmEngineLifecycle {
  let worker: Worker | null = null;
  let engine: WebLlmEngine | null = null;
  let loadedModelId: string | null = null;
  let enginePromise: Promise<WebLlmEngineSession> | null = null;

  async function createEngine(onProgress?: (progress: LlmProgress) => void): Promise<WebLlmEngineSession> {
    const webllm = await loadWebLlmModule();
    const modelId = resolveModelId(webllm, options.modelId);

    onProgress?.({
      phase: "loading",
      message: `${MODEL_LOADING_MESSAGE} 使用モデル: ${modelId}`
    });

    worker = await createWorkerInstance(options.workerUrl);

    try {
      engine = await webllm.CreateWebWorkerMLCEngine(
        worker,
        modelId,
        {
          initProgressCallback: (report) => {
            const progress: LlmProgress = {
              phase: "loading",
              message: report.text && report.text.length > 0 ? report.text : MODEL_LOADING_MESSAGE
            };

            if (typeof report.progress === "number") {
              progress.progress = report.progress;
            }

            onProgress?.(progress);
          }
        },
        typeof options.contextWindowSize === "number"
          ? { context_window_size: options.contextWindowSize }
          : undefined
      );
      loadedModelId = modelId;
      return { engine, modelId };
    } catch (error) {
      worker?.terminate();
      worker = null;
      engine = null;
      loadedModelId = null;
      throw error;
    }
  }

  return {
    async getOrCreate(onProgress?: (progress: LlmProgress) => void): Promise<WebLlmEngineSession> {
      if (engine && loadedModelId) {
        return { engine, modelId: loadedModelId };
      }

      if (enginePromise) {
        return enginePromise;
      }

      enginePromise = createEngine(onProgress);
      try {
        return await enginePromise;
      } finally {
        enginePromise = null;
      }
    },

    isReady(): boolean {
      return engine !== null && loadedModelId !== null;
    },

    async dispose(): Promise<void> {
      const engineToUnload = engine;
      const workerToTerminate = worker;

      worker = null;
      engine = null;
      loadedModelId = null;
      enginePromise = null;

      try {
        await engineToUnload?.unload?.();
      } finally {
        workerToTerminate?.terminate();
      }
    }
  };
}
