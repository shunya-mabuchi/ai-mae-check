/// <reference path="./vite-env.d.ts" />

import { MODEL_LOADING_MESSAGE } from "./constants";
import { resolveModelId, type WebLlmModelListModule } from "./model";
import type { LlmProgress } from "./types";
import WebLlmWorker from "./webllmWorker?worker";

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
    }
  ): Promise<WebLlmEngine>;
};

interface CreateWebLlmEngineLifecycleOptions {
  modelId: string;
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

async function loadWebLlmModule(): Promise<WebLlmModule> {
  return (await import("@mlc-ai/web-llm")) as unknown as WebLlmModule;
}

function createWorkerInstance(workerUrl?: string): Worker {
  return workerUrl ? new Worker(workerUrl, { type: "module" }) : new WebLlmWorker();
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

    worker = createWorkerInstance(options.workerUrl);

    try {
      engine = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
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
      });
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
