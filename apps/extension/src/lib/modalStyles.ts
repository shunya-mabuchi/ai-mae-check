import { extensionModalTokens } from "./modalDesignTokens";

export const pasteReviewModalTokens = extensionModalTokens;

const { colors, font, radius, shadow, spacing } = pasteReviewModalTokens;

export const pasteReviewModalCss = `
  :host {
    all: initial;
    color: ${colors.text};
    font-family: ${font.family};
    font-size: ${font.body};
  }
  .hm-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: ${colors.overlay};
    padding: ${spacing.page};
  }
  .hm-dialog {
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
  .hm-header,
  .hm-footer {
    background: ${colors.surface};
  }
  .hm-header {
    display: grid;
    gap: 10px;
    padding: 20px 22px 18px;
    border-bottom: 1px solid ${colors.border};
  }
  .hm-header-top {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: 12px;
  }
  .hm-brand {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    gap: 10px;
  }
  .hm-brand-mark {
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
  .hm-brand-name {
    margin: 0;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: 0;
  }
  .hm-mode-badge,
  .hm-risk-pill {
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
  .hm-mode-badge {
    justify-self: start;
    border: 1px solid ${colors.accentBorder};
    background: ${colors.accentSoft};
    color: ${colors.accent};
  }
  .hm-risk-pill {
    justify-self: end;
    border: 1px solid ${colors.neutralBorder};
    background: ${colors.neutralSurface};
    color: ${colors.neutralText};
  }
  .hm-risk-pill-critical,
  .hm-risk-pill-high {
    border-color: ${colors.dangerBorder};
    background: ${colors.dangerSurface};
    color: ${colors.dangerText};
  }
  .hm-risk-pill-medium {
    border-color: ${colors.warningBorder};
    background: ${colors.warningSurface};
    color: ${colors.warningText};
  }
  .hm-title {
    margin: 2px 0 0;
    font-size: ${font.title};
    font-weight: 820;
    letter-spacing: 0;
  }
  .hm-description {
    margin: 0;
    color: ${colors.mutedText};
    line-height: 1.7;
  }
  .hm-body {
    display: grid;
    gap: 16px;
    min-height: 0;
    overflow: auto;
    padding: 18px 22px;
  }
  .hm-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .hm-count {
    min-width: 0;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 10px 12px;
  }
  .hm-count-label {
    display: block;
    overflow: hidden;
    color: ${colors.mutedText};
    font-size: ${font.small};
    font-weight: 700;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hm-count strong {
    display: block;
    margin-top: 4px;
    font-size: 22px;
    line-height: 1;
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
  .hm-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 14px;
  }
  .hm-panel {
    min-width: 0;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: rgba(255, 255, 255, 0.86);
    padding: 14px;
    box-shadow: ${shadow.soft};
  }
  .hm-panel h3,
  .hm-llm h3 {
    margin: 0;
    font-size: ${font.section};
    font-weight: 820;
    letter-spacing: 0;
  }
  .hm-panel-caption {
    margin: 5px 0 12px;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.6;
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
  .hm-preview {
    min-height: 260px;
    max-height: 320px;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border: 1px solid ${colors.accentBorder};
    border-radius: ${radius.card};
    background: linear-gradient(180deg, #ffffff 0%, #f8fffb 100%);
    padding: 16px;
    color: ${colors.text};
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 14px;
    line-height: 1.8;
  }
  .hm-preview-trust {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 10px;
    border: 1px solid ${colors.accentBorder};
    border-radius: ${radius.card};
    background: ${colors.accentSoft};
    padding: 9px 11px;
    color: #245947;
    font-size: ${font.small};
    font-weight: 700;
  }
  .hm-preview-trust span + span::before {
    content: "/";
    margin-right: 14px;
    color: ${colors.softText};
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
  .hm-footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    border-top: 1px solid ${colors.border};
    padding: 16px 22px;
    box-shadow: 0 -10px 28px rgba(15, 23, 42, 0.08);
  }
  .hm-footer-note {
    margin: 0;
    color: ${colors.dangerText};
    font-size: ${font.small};
    line-height: 1.6;
  }
  .hm-footer-note[hidden] {
    display: none;
  }
  .hm-footer-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }
  .hm-button {
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
  .hm-button:hover {
    background: ${colors.surfaceMuted};
  }
  .hm-button:focus-visible {
    outline: 3px solid rgba(15, 159, 105, 0.22);
    outline-offset: 2px;
  }
  .hm-button:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }
  .hm-button:disabled:hover {
    background: ${colors.surface};
  }
  .hm-primary {
    border-color: ${colors.accent};
    background: ${colors.accent};
    color: ${colors.surface};
  }
  .hm-primary:hover {
    background: ${colors.accentHover};
  }
  .hm-primary:disabled:hover {
    background: ${colors.accent};
  }
  .hm-secondary {
    border-color: ${colors.borderStrong};
    background: ${colors.surface};
    color: ${colors.text};
  }
  .hm-secondary:hover {
    border-color: ${colors.accentBorder};
    background: ${colors.accentSoft};
    color: ${colors.accent};
  }
  .hm-secondary:disabled:hover {
    border-color: ${colors.borderStrong};
    background: ${colors.surface};
    color: ${colors.text};
  }
  .hm-ghost {
    border-color: transparent;
    background: transparent;
    color: ${colors.mutedText};
  }
  .hm-ghost:hover {
    background: ${colors.surfaceMuted};
    color: ${colors.text};
  }
  @media (max-width: 760px) {
    .hm-overlay {
      align-items: start;
      padding: 10px;
    }
    .hm-dialog {
      max-height: calc(100vh - 20px);
    }
    .hm-header {
      padding: 16px;
    }
    .hm-header-top {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .hm-risk-pill {
      justify-self: start;
    }
    .hm-brand-name {
      font-size: 21px;
    }
    .hm-title {
      font-size: 20px;
    }
    .hm-body {
      padding: 14px;
    }
    .hm-summary,
    .hm-grid {
      grid-template-columns: 1fr;
    }
    .hm-list,
    .hm-preview {
      max-height: none;
    }
    .hm-preview {
      min-height: 220px;
    }
    .hm-preview-trust span + span::before {
      content: "";
      margin: 0;
    }
    .hm-footer {
      grid-template-columns: 1fr;
      padding: 14px;
      max-height: 46vh;
      overflow: auto;
    }
    .hm-footer-actions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }
    .hm-button {
      width: 100%;
    }
  }
`;
