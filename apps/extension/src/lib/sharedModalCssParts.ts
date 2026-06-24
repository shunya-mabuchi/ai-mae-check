import { extensionModalTokens } from "./modalDesignTokens";

export type RiskPillTone = "neutral" | "danger";
export type FooterLayout = "actionsOnly" | "noteGrid";

export interface SharedModalCssOptions {
  prefix: string;
  metricClassName: string;
  metricLabelSelector: string;
  metricValueSelector: string;
  metricValueFontSize: string;
  headingSelectors: string[];
  scrollAreaClassName: string;
  trustStripClassName: string;
  riskPillTone: RiskPillTone;
  footerLayout: FooterLayout;
  footerMaxHeight: string;
  includeRiskPillLevels?: boolean;
}

const { colors, font, radius } = extensionModalTokens;

export function joinSelectors(selectors: string[]): string {
  return selectors.map((selector) => `  ${selector}`).join(",\n");
}

export function createRiskPillCss(prefix: string, tone: RiskPillTone, includeLevels = false): string {
  const borderColor = tone === "danger" ? colors.dangerBorder : colors.neutralBorder;
  const background = tone === "danger" ? colors.dangerSurface : colors.neutralSurface;
  const color = tone === "danger" ? colors.dangerText : colors.neutralText;
  const levelCss = includeLevels
    ? `
  .${prefix}-risk-pill-critical,
  .${prefix}-risk-pill-high {
    border-color: ${colors.dangerBorder};
    background: ${colors.dangerSurface};
    color: ${colors.dangerText};
  }
  .${prefix}-risk-pill-medium {
    border-color: ${colors.warningBorder};
    background: ${colors.warningSurface};
    color: ${colors.warningText};
  }`
    : "";

  return `
  .${prefix}-risk-pill {
    justify-self: end;
    border: 1px solid ${borderColor};
    background: ${background};
    color: ${color};
  }${levelCss}`;
}

export function createFooterCss(prefix: string, layout: FooterLayout): string {
  const layoutCss =
    layout === "noteGrid"
      ? `
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;`
      : "";
  const noteCss =
    layout === "noteGrid"
      ? `
  .${prefix}-footer-note {
    margin: 0;
    color: ${colors.dangerText};
    font-size: ${font.small};
    line-height: 1.6;
  }
  .${prefix}-footer-note[hidden] {
    display: none;
  }`
      : "";

  return `
  .${prefix}-footer {${layoutCss}
    flex-shrink: 0;
    border-top: 1px solid ${colors.border};
    background: ${colors.surface};
    padding: 16px 22px;
    box-shadow: 0 -10px 28px rgba(15, 23, 42, 0.08);
  }${noteCss}
  .${prefix}-footer-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }`;
}

export function createButtonCss(prefix: string): string {
  return `
  .${prefix}-button {
    min-height: 42px;
    border: 1px solid ${colors.border};
    border-radius: ${radius.content};
    background: ${colors.surface};
    color: ${colors.text};
    padding: 9px 14px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  .${prefix}-button:hover {
    background: ${colors.surfaceMuted};
  }
  .${prefix}-button:focus-visible {
    outline: 3px solid rgba(15, 159, 105, 0.22);
    outline-offset: 2px;
  }
  .${prefix}-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .${prefix}-button:disabled:hover {
    background: ${colors.surface};
  }
  .${prefix}-primary {
    border-color: ${colors.accent};
    background: ${colors.accent};
    color: ${colors.surface};
  }
  .${prefix}-primary:hover {
    background: ${colors.accentHover};
  }
  .${prefix}-primary:disabled:hover {
    background: ${colors.accent};
  }
  .${prefix}-secondary {
    border-color: ${colors.borderStrong};
    background: ${colors.surface};
    color: ${colors.text};
  }
  .${prefix}-secondary:hover {
    border-color: ${colors.accentBorder};
    background: ${colors.accentSoft};
    color: ${colors.accent};
  }
  .${prefix}-secondary:disabled:hover {
    border-color: ${colors.borderStrong};
    background: ${colors.surface};
    color: ${colors.text};
  }
  .${prefix}-ghost {
    border-color: transparent;
    background: transparent;
    color: ${colors.mutedText};
  }
  .${prefix}-ghost:hover {
    background: ${colors.surfaceMuted};
    color: ${colors.text};
  }`;
}

export function createResponsiveCss(options: SharedModalCssOptions): string {
  const prefix = options.prefix;

  return `
  @media (max-width: 760px) {
    .${prefix}-overlay {
      align-items: start;
      padding: 10px;
    }
    .${prefix}-dialog {
      max-height: calc(100vh - 20px);
    }
    .${prefix}-header {
      padding: 16px;
    }
    .${prefix}-header-top {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .${prefix}-risk-pill {
      justify-self: start;
    }
    .${prefix}-brand-name {
      font-size: 21px;
    }
    .${prefix}-title {
      font-size: 20px;
    }
    .${prefix}-body {
      padding: 14px;
    }
    .${prefix}-summary,
    .${prefix}-grid {
      grid-template-columns: 1fr;
    }
    .${options.scrollAreaClassName},
    .${prefix}-preview {
      max-height: none;
    }
    .${prefix}-preview {
      min-height: 220px;
    }
    .${options.trustStripClassName} span + span::before {
      content: "";
      margin: 0;
    }
    .${prefix}-footer {
      padding: 14px;
      max-height: ${options.footerMaxHeight};
      overflow: auto;
    }
    .${prefix}-footer-actions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }
    .${prefix}-button {
      width: 100%;
    }
  }`;
}
