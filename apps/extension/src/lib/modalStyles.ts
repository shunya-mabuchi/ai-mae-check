import { createSharedModalCss, extensionModalTokens } from "./sharedModalCss";

export const pasteReviewModalTokens = extensionModalTokens;

const { colors, font, radius } = pasteReviewModalTokens;

export const pasteReviewModalCss = `
${createSharedModalCss({
  prefix: "hm",
  metricClassName: "hm-count",
  metricLabelSelector: ".hm-count-label",
  metricValueSelector: ".hm-count strong",
  metricValueFontSize: "22px",
  headingSelectors: [".hm-panel h3", ".hm-llm h3"],
  scrollAreaClassName: "hm-list",
  trustStripClassName: "hm-preview-trust",
  riskPillTone: "neutral",
  footerLayout: "noteGrid",
  footerMaxHeight: "46vh",
  includeRiskPillLevels: true
})}
  .amc-react-root,
  .amc-portal-root {
    display: contents;
  }
  .hm-dialog-content {
    display: flex;
    flex: 1;
    min-height: 0;
    max-height: inherit;
    flex-direction: column;
    outline: none;
  }
  .hm-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .hm-critical,
  .hm-high {
    color: ${colors.dangerText};
  }
  .hm-medium {
    color: ${colors.warningText};
  }
  .hm-low {
    color: ${colors.neutralText};
  }
  .hm-list {
    display: grid;
    gap: 10px;
    max-height: 320px;
    overflow: auto;
    padding-right: 2px;
  }
  .review-item {
    display: block;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 12px;
    cursor: pointer;
  }
  .review-item:hover {
    border-color: ${colors.borderStrong};
  }
  .review-select-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }
  .review-select-row input,
  .review-candidate input {
    margin-top: 4px;
    accent-color: ${colors.accent};
  }
  .review-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .review-meta strong {
    font-size: 13px;
  }
  .review-badge {
    border: 1px solid ${colors.border};
    border-radius: ${radius.pill};
    padding: 3px 8px;
    font-size: ${font.small};
    font-weight: 800;
    line-height: 1.2;
  }
  .review-badge-critical,
  .review-badge-high {
    border-color: ${colors.dangerBorder};
    background: ${colors.dangerSurface};
    color: ${colors.dangerText};
  }
  .review-badge-medium {
    border-color: ${colors.warningBorder};
    background: ${colors.warningSurface};
    color: ${colors.warningText};
  }
  .review-badge-low {
    border-color: ${colors.neutralBorder};
    background: ${colors.neutralSurface};
    color: ${colors.neutralText};
  }
  .review-text {
    display: block;
    max-width: 100%;
    overflow-wrap: anywhere;
    border-radius: ${radius.content};
    background: ${colors.surfaceMuted};
    padding: 7px 9px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .review-message {
    margin: 7px 0 0;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.6;
  }
  .hm-llm {
    display: grid;
    gap: 8px;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 14px;
  }
  .hm-llm-status {
    margin: 0;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.7;
  }
  .review-candidate {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    border-top: 1px solid ${colors.divider};
    padding-top: 10px;
    margin-top: 10px;
  }
  .hm-button:disabled {
    opacity: 0.52;
  }
`;
