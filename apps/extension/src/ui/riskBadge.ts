import type { RiskDecisionLevel } from "@ai-mae-check/core";

export interface RiskBadgeState {
  total: number;
  level: RiskDecisionLevel;
  secretGuard: boolean;
}

export interface RiskBadgeController {
  update: (state: RiskBadgeState | null) => void;
  remove: () => void;
}

const levelLabel: Record<RiskDecisionLevel, string> = {
  safe: "Safe",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical"
};

const css = `
  :host {
    all: initial;
    color: #202124;
    font-family: system-ui, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    font-size: 12px;
  }
  .amc-badge {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483646;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    border: 1px solid #d8d3c7;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 10px 28px rgba(32, 33, 36, 0.14);
    padding: 5px 10px;
    pointer-events: none;
    letter-spacing: 0;
  }
  .amc-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #2f7d57;
  }
  .amc-label {
    font-weight: 700;
    white-space: nowrap;
  }
  .amc-meta {
    color: #5f6368;
    white-space: nowrap;
  }
  .amc-low .amc-dot { background: #8a6f2a; }
  .amc-medium .amc-dot { background: #b45309; }
  .amc-high .amc-dot,
  .amc-critical .amc-dot { background: #b91c1c; }
  .amc-high,
  .amc-critical {
    border-color: #fecaca;
    background: rgba(255, 247, 247, 0.96);
  }
  .amc-hidden {
    display: none;
  }
`;

function stateClass(level: RiskDecisionLevel): string {
  return `amc-badge amc-${level}`;
}

function stateText(state: RiskBadgeState): string {
  return state.total === 0 ? "Safe" : `${state.total} risks`;
}

export function mountRiskBadge(): RiskBadgeController {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  const badge = document.createElement("div");
  const dot = document.createElement("span");
  const label = document.createElement("span");
  const meta = document.createElement("span");

  style.textContent = css;
  badge.className = "amc-badge amc-hidden";
  dot.className = "amc-dot";
  label.className = "amc-label";
  meta.className = "amc-meta";
  badge.append(dot, label, meta);
  shadow.append(style, badge);
  document.documentElement.append(host);

  return {
    update(state) {
      if (!state) {
        badge.className = "amc-badge amc-hidden";
        return;
      }

      badge.className = stateClass(state.level);
      label.textContent = stateText(state);
      meta.textContent = state.secretGuard ? "Secret Guard" : levelLabel[state.level];
    },
    remove() {
      host.remove();
    }
  };
}
