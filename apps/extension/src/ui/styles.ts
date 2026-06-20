const confirmModalColors = {
  text: "#202124",
  mutedText: "#5f6368",
  overlay: "rgba(32, 33, 36, 0.42)",
  border: "#dfded8",
  surface: "#fff",
  surfaceAlt: "#fbfaf7",
  surfaceMuted: "#f5f5f4",
  accent: "#2f7d57",
  accentHover: "#276848",
  dangerBorder: "#fecaca",
  dangerSurface: "#fef2f2",
  dangerText: "#b91c1c",
  warningBorder: "#fde68a",
  warningSurface: "#fffbeb",
  warningText: "#92400e",
  neutralBorder: "#e7e5e4",
  neutralSurface: "#f5f5f4",
  neutralText: "#57534e",
  divider: "#eee"
} as const;

export const confirmModalTokens = {
  colors: confirmModalColors,
  radius: {
    card: "8px",
    content: "6px",
    pill: "999px"
  },
  shadow: {
    dialog: "0 24px 80px rgba(0, 0, 0, 0.24)"
  }
} as const;

const { colors, radius, shadow } = confirmModalTokens;

export const confirmModalCss = `
  :host {
    all: initial;
    color: ${colors.text};
    font-family: system-ui, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    font-size: 14px;
  }
  .amc-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: ${colors.overlay};
    padding: 20px;
  }
  .amc-dialog {
    width: min(960px, 100%);
    max-height: min(820px, calc(100vh - 40px));
    overflow: auto;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surfaceAlt};
    box-shadow: ${shadow.dialog};
  }
  .amc-header,
  .amc-footer {
    padding: 18px 20px;
    background: ${colors.surface};
  }
  .amc-header {
    border-bottom: 1px solid ${colors.border};
  }
  .amc-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
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
    padding: 20px;
  }
  .amc-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .amc-metric {
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 12px;
  }
  .amc-metric strong {
    display: block;
    margin-top: 4px;
    font-size: 22px;
  }
  .amc-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: 16px;
  }
  .amc-panel h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 700;
  }
  .amc-categories {
    display: grid;
    gap: 10px;
  }
  .amc-category {
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 12px;
  }
  .amc-category-main {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .amc-category-main input {
    margin-top: 4px;
    accent-color: ${colors.accent};
  }
  .amc-category-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }
  .amc-category-title {
    font-weight: 700;
  }
  .amc-badge {
    border: 1px solid ${colors.border};
    border-radius: ${radius.pill};
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 700;
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
    font-size: 12px;
    line-height: 1.6;
  }
  .amc-details {
    margin-top: 10px;
  }
  .amc-details summary {
    cursor: pointer;
    color: #3f5f4d;
    font-weight: 700;
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
    min-height: 170px;
    max-height: 280px;
    overflow: auto;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    line-height: 1.7;
  }
  .amc-llm-panel {
    display: grid;
    gap: 8px;
    margin-top: 14px;
  }
  .amc-candidates {
    display: grid;
    gap: 8px;
    max-height: 220px;
    overflow: auto;
  }
  .review-candidate {
    display: flex;
    gap: 10px;
    align-items: flex-start;
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
    color: ${colors.mutedText};
    font-size: 12px;
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
  }
  .review-badge {
    border: 1px solid ${colors.border};
    border-radius: ${radius.pill};
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 700;
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
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid ${colors.border};
  }
  .amc-button {
    min-height: 40px;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    color: ${colors.text};
    padding: 8px 13px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .amc-button:hover {
    background: ${colors.surfaceMuted};
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
  @media (max-width: 760px) {
    .amc-summary,
    .amc-grid {
      grid-template-columns: 1fr;
    }
    .amc-button {
      width: 100%;
    }
  }
`;
