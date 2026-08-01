import { createSharedModalCss, extensionModalTokens } from "../lib/sharedModalCss";

export const confirmModalTokens = extensionModalTokens;

const { colors, font, radius } = confirmModalTokens;

export const confirmModalCss = `
${createSharedModalCss({
  prefix: "amc",
  metricClassName: "amc-metric",
  metricLabelSelector: ".amc-metric span",
  metricValueSelector: ".amc-metric strong",
  metricValueFontSize: "21px",
  headingSelectors: [".amc-panel h3", ".amc-llm-panel h3"],
  scrollAreaClassName: "amc-categories",
  trustStripClassName: "amc-trust-strip",
  riskPillTone: "danger",
  footerLayout: "actionsOnly",
  footerMaxHeight: "40vh"
})}
  .amc-react-root,
  .amc-portal-root {
    display: contents;
  }
  .amc-dialog-content {
    display: flex;
    flex: 1;
    min-height: 0;
    max-height: inherit;
    flex-direction: column;
    outline: none;
  }
  .amc-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .amc-categories {
    display: grid;
    gap: 10px;
    max-height: 410px;
    overflow: auto;
    padding-right: 2px;
  }
  .amc-category {
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 12px;
  }
  .amc-category-main {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }
  .amc-category-main input {
    margin-top: 4px;
    accent-color: ${colors.accent};
  }
  .amc-category-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    align-items: center;
    margin-bottom: 6px;
  }
  .amc-category-title {
    font-weight: 800;
  }
  .amc-badge {
    border: 1px solid ${colors.border};
    border-radius: ${radius.pill};
    padding: 3px 8px;
    font-size: ${font.small};
    font-weight: 800;
    line-height: 1.2;
  }
  .amc-critical,
  .amc-high {
    border-color: ${colors.dangerBorder};
    background: ${colors.dangerSurface};
    color: ${colors.dangerText};
  }
  .amc-medium {
    border-color: ${colors.warningBorder};
    background: ${colors.warningSurface};
    color: ${colors.warningText};
  }
  .amc-low {
    border-color: ${colors.neutralBorder};
    background: ${colors.neutralSurface};
    color: ${colors.neutralText};
  }
  .amc-note {
    margin: 0;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.7;
  }
  .amc-details {
    margin-top: 10px;
  }
  .amc-details summary {
    cursor: pointer;
    color: #245947;
    font-weight: 800;
  }
  .amc-finding {
    margin-top: 8px;
    border-top: 1px solid ${colors.divider};
    padding-top: 8px;
  }
  .amc-code,
  .amc-preview {
    display: block;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    border-radius: ${radius.content};
    background: ${colors.surfaceMuted};
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }
  .amc-trust-strip {
    margin: 10px 0 14px;
  }
  .amc-llm-panel {
    display: grid;
    gap: 8px;
  }
  .amc-candidates {
    display: grid;
    gap: 8px;
    max-height: 220px;
    overflow: auto;
  }
  .review-candidate {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 10px;
  }
  .review-candidate input {
    margin-top: 4px;
    accent-color: ${colors.accent};
  }
  .review-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
  }
  .review-message {
    margin: 7px 0 0;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.6;
  }
  .review-text {
    display: block;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    border-radius: ${radius.content};
    background: ${colors.surfaceMuted};
    padding: 6px 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
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
`;
