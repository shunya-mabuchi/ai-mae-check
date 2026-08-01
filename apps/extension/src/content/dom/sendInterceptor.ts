import type { SiteAdapter } from "../adapters/baseAdapter";

type KeyboardSignal = Pick<KeyboardEvent, "key" | "shiftKey" | "altKey" | "isComposing">;

export type SendReviewDecision =
  | {
      type: "replaceAndSubmit";
      text: string;
    }
  | {
      type: "cancel";
    };

export interface SendInterceptorOptions<TPrepared> {
  adapter: SiteAdapter;
  isEnabled: () => boolean;
  prepareReview: (inputText: string) => TPrepared | null;
  review: (prepared: TPrepared) => Promise<SendReviewDecision>;
  root?: Document;
}

export interface SubmitBypass {
  arm: () => void;
  consume: () => boolean;
}

export function isDefaultSendKeyboardEvent(event: KeyboardSignal): boolean {
  return event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing;
}

export function createSubmitBypass(): SubmitBypass {
  let armed = false;

  return {
    arm() {
      armed = true;
    },
    consume() {
      if (!armed) {
        return false;
      }

      armed = false;
      return true;
    }
  };
}

function eventTargetInside(target: EventTarget | null, container: Node | null): boolean {
  return target instanceof Node && container instanceof Node && (container === target || container.contains(target));
}

function stopSendEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function installSendInterceptor<TPrepared>(options: SendInterceptorOptions<TPrepared>): () => void {
  const root = options.root ?? document;
  const bypass = createSubmitBypass();
  let editor = options.adapter.findEditor(root);
  let sendButton = options.adapter.findSendButton(root);
  let reviewInFlight = false;
  let refreshScheduled = false;

  const refresh = () => {
    editor = options.adapter.findEditor(root);
    sendButton = options.adapter.findSendButton(root);
    refreshScheduled = false;
  };

  const scheduleRefresh = () => {
    if (refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    window.requestAnimationFrame(refresh);
  };

  const submitAfterReview = (currentEditor: NonNullable<typeof editor>, decision: SendReviewDecision) => {
    if (decision.type !== "replaceAndSubmit") {
      return;
    }

    options.adapter.replaceText(currentEditor, decision.text);
    bypass.arm();
    window.setTimeout(() => {
      options.adapter.submit(currentEditor);
    }, 0);
  };

  const maybeIntercept = (event: Event, currentEditor: NonNullable<typeof editor>) => {
    if (reviewInFlight || !options.isEnabled()) {
      return;
    }

    const inputText = options.adapter.readText(currentEditor);
    if (inputText.trim().length === 0) {
      return;
    }

    const prepared = options.prepareReview(inputText);
    if (!prepared) {
      return;
    }

    stopSendEvent(event);
    reviewInFlight = true;

    void options
      .review(prepared)
      .then((decision) => {
        submitAfterReview(currentEditor, decision);
      })
      .catch(() => {
        // 確認画面を完了できない場合は、本文を変更せず送信も中止する。
      })
      .finally(() => {
        reviewInFlight = false;
      });
  };

  const clickHandler = (event: MouseEvent) => {
    refresh();
    if (!sendButton || !eventTargetInside(event.target, sendButton)) {
      return;
    }

    if (bypass.consume()) {
      return;
    }

    if (editor) {
      maybeIntercept(event, editor);
    }
  };

  const keydownHandler = (event: KeyboardEvent) => {
    if (!options.adapter.isSendKeyboardEvent(event)) {
      return;
    }

    refresh();
    if (!editor || !eventTargetInside(event.target, editor)) {
      return;
    }

    if (bypass.consume()) {
      return;
    }

    maybeIntercept(event, editor);
  };

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(root.documentElement ?? root, {
    childList: true,
    subtree: true
  });

  root.addEventListener("click", clickHandler, true);
  root.addEventListener("keydown", keydownHandler, true);

  return () => {
    observer.disconnect();
    root.removeEventListener("click", clickHandler, true);
    root.removeEventListener("keydown", keydownHandler, true);
  };
}
