import { extensionModalTokens } from "../lib/modalDesignTokens";

export const confirmModalTokens = extensionModalTokens;

const { colors, font, radius, shadow, spacing } = confirmModalTokens;

export const confirmModalCss = `
  :host {
    all: initial;
    color: ${colors.text};
    font-family: ${font.family};
    font-size: ${font.body};
  }
  .amc-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: ${colors.overlay};
    padding: ${spacing.page};
  }
  .amc-dialog {
    width: min(1040px, 100%);
    max-height: min(840px, calc(100vh - 40px));
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid ${colors.borderStrong};
    border-radius: ${radius.card};
    background: ${colors.surfaceAlt};
    box-shadow: ${shadow.dialog};
  }
  .amc-header {
    display: grid;
    gap: 10px;
    flex-shrink: 0;
    border-bottom: 1px solid ${colors.border};
    background: ${colors.surface};
    padding: 20px 22px 18px;
  }
  .amc-header-top {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: 12px;
  }
  .amc-brand {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    gap: 10px;
  }
  .amc-brand-mark {
    display: inline-grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid ${colors.accentBorder};
    border-radius: ${radius.content};
    background: ${colors.accentSoft};
    color: ${colors.accent};
    font-size: 12px;
    font-weight: 900;
  }
  .amc-brand-name {
    margin: 0;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: 0;
  }
  .amc-mode-badge,
  .amc-risk-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    border-radius: ${radius.content};
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.2;
    white-space: nowrap;
  }
  .amc-mode-badge {
    justify-self: start;
    border: 1px solid ${colors.accentBorder};
    background: ${colors.accentSoft};
    color: ${colors.accent};
  }
  .amc-risk-pill {
    justify-self: end;
    border: 1px solid ${colors.dangerBorder};
    background: ${colors.dangerSurface};
    color: ${colors.dangerText};
  }
  .amc-title {
    margin: 2px 0 0;
    font-size: ${font.title};
    font-weight: 820;
    letter-spacing: 0;
  }
  .amc-description {
    margin: 0;
    color: ${colors.mutedText};
    line-height: 1.7;
  }
  .amc-body {
    display: grid;
    gap: 16px;
    min-height: 0;
    overflow: auto;
    padding: 18px 22px;
  }
  .amc-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .amc-metric {
    min-width: 0;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 10px 12px;
  }
  .amc-metric span {
    display: block;
    overflow: hidden;
    color: ${colors.mutedText};
    font-size: ${font.small};
    font-weight: 700;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .amc-metric strong {
    display: block;
    margin-top: 4px;
    font-size: 21px;
    line-height: 1;
  }
  .amc-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 14px;
  }
  .amc-panel {
    min-width: 0;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: rgba(255, 255, 255, 0.86);
    padding: 14px;
    box-shadow: ${shadow.soft};
  }
  .amc-panel h3,
  .amc-llm-panel h3 {
    margin: 0;
    font-size: ${font.section};
    font-weight: 820;
    letter-spacing: 0;
  }
  .amc-panel-caption {
    margin: 5px 0 12px;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.6;
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
  .amc-preview {
    min-height: 260px;
    max-height: 320px;
    overflow: auto;
    border: 1px solid ${colors.accentBorder};
    border-radius: ${radius.card};
    background: linear-gradient(180deg, #ffffff 0%, #f8fffb 100%);
    color: ${colors.text};
    font-size: 14px;
    line-height: 1.8;
  }
  .amc-trust-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin: 10px 0 14px;
    border: 1px solid ${colors.accentBorder};
    border-radius: ${radius.card};
    background: ${colors.accentSoft};
    padding: 9px 11px;
    color: #245947;
    font-size: ${font.small};
    font-weight: 700;
  }
  .amc-trust-strip span + span::before {
    content: "/";
    margin-right: 14px;
    color: ${colors.softText};
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
  .amc-footer {
    flex-shrink: 0;
    border-top: 1px solid ${colors.border};
    background: ${colors.surface};
    padding: 16px 22px;
    box-shadow: 0 -10px 28px rgba(15, 23, 42, 0.08);
  }
  .amc-footer-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }
  .amc-button {
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
  .amc-button:hover {
    background: ${colors.surfaceMuted};
  }
  .amc-button:focus-visible {
    outline: 3px solid rgba(15, 159, 105, 0.22);
    outline-offset: 2px;
  }
  .amc-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .amc-button:disabled:hover {
    background: ${colors.surface};
  }
  .amc-primary {
    border-color: ${colors.accent};
    background: ${colors.accent};
    color: ${colors.surface};
  }
  .amc-primary:hover {
    background: ${colors.accentHover};
  }
  .amc-primary:disabled:hover {
    background: ${colors.accent};
  }
  .amc-secondary {
    border-color: ${colors.borderStrong};
    background: ${colors.surface};
    color: ${colors.text};
  }
  .amc-secondary:hover {
    border-color: ${colors.accentBorder};
    background: ${colors.accentSoft};
    color: ${colors.accent};
  }
  .amc-secondary:disabled:hover {
    border-color: ${colors.borderStrong};
    background: ${colors.surface};
    color: ${colors.text};
  }
  .amc-ghost {
    border-color: transparent;
    background: transparent;
    color: ${colors.mutedText};
  }
  .amc-ghost:hover {
    background: ${colors.surfaceMuted};
    color: ${colors.text};
  }
  @media (max-width: 760px) {
    .amc-overlay {
      align-items: start;
      padding: 10px;
    }
    .amc-dialog {
      max-height: calc(100vh - 20px);
    }
    .amc-header {
      padding: 16px;
    }
    .amc-header-top {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .amc-risk-pill {
      justify-self: start;
    }
    .amc-brand-name {
      font-size: 21px;
    }
    .amc-title {
      font-size: 20px;
    }
    .amc-body {
      padding: 14px;
    }
    .amc-summary,
    .amc-grid {
      grid-template-columns: 1fr;
    }
    .amc-categories,
    .amc-preview {
      max-height: none;
    }
    .amc-preview {
      min-height: 220px;
    }
    .amc-trust-strip span + span::before {
      content: "";
      margin: 0;
    }
    .amc-footer {
      padding: 14px;
      max-height: 40vh;
      overflow: auto;
    }
    .amc-footer-actions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }
    .amc-button {
      width: 100%;
    }
  }
`;
