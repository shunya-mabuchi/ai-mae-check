export const pasteReviewModalCss = `
  :host {
    all: initial;
    color: #202124;
    font-family: system-ui, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    font-size: 14px;
  }
  .hm-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: rgba(32, 33, 36, 0.42);
    padding: 20px;
  }
  .hm-dialog {
    width: min(920px, 100%);
    max-height: min(780px, calc(100vh - 40px));
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fbfaf7;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
  }
  .hm-header, .hm-footer {
    padding: 18px 20px;
  }
  .hm-header {
    border-bottom: 1px solid #dfded8;
    background: white;
  }
  .hm-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0;
  }
  .hm-description {
    margin: 0;
    color: #5f6368;
    line-height: 1.7;
  }
  .hm-body {
    display: grid;
    gap: 16px;
    padding: 20px;
    min-height: 0;
    overflow: auto;
  }
  .hm-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .hm-count {
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 12px;
  }
  .hm-count strong {
    display: block;
    margin-top: 4px;
    font-size: 24px;
  }
  .hm-critical, .hm-high { color: #b91c1c; }
  .hm-medium { color: #92400e; }
  .hm-low { color: #57534e; }
  .hm-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }
  .hm-panel {
    min-width: 0;
  }
  .hm-panel h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 700;
  }
  .hm-list {
    display: grid;
    gap: 10px;
    max-height: 270px;
    overflow: auto;
  }
  .hm-item {
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 10px;
  }
  .hm-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .hm-badge {
    border-radius: 6px;
    border: 1px solid #dfded8;
    padding: 3px 7px;
    font-size: 12px;
    font-weight: 700;
  }
  .hm-badge-critical, .hm-badge-high { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
  .hm-badge-medium { border-color: #fde68a; background: #fffbeb; color: #92400e; }
  .hm-badge-low { border-color: #e7e5e4; background: #f5f5f4; color: #57534e; }
  .hm-text {
    display: block;
    max-width: 100%;
    overflow-wrap: anywhere;
    border-radius: 4px;
    background: #f5f5f4;
    padding: 6px 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    white-space: pre-wrap;
  }
  .hm-message {
    margin: 8px 0 0;
    color: #5f6368;
    line-height: 1.6;
    font-size: 12px;
  }
  .hm-preview {
    min-height: 180px;
    max-height: 270px;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 12px;
    line-height: 1.7;
  }
  .hm-llm {
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 12px;
  }
  .hm-llm-status {
    margin: 0 0 10px;
    color: #5f6368;
    line-height: 1.6;
  }
  .hm-candidate {
    display: flex;
    gap: 10px;
    border-top: 1px solid #eee;
    padding-top: 10px;
    margin-top: 10px;
  }
  .hm-select-row {
    display: flex;
    gap: 10px;
  }
  .hm-select-row input,
  .hm-candidate input {
    margin-top: 3px;
    accent-color: #2f7d57;
  }
  .hm-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    flex-shrink: 0;
    gap: 10px;
    border-top: 1px solid #dfded8;
    background: white;
    box-shadow: 0 -10px 28px rgba(32, 33, 36, 0.08);
  }
  .hm-footer-note {
    flex: 1 0 100%;
    margin: 0;
    color: #b91c1c;
    font-size: 12px;
    line-height: 1.6;
  }
  .hm-footer-note[hidden] {
    display: none;
  }
  .hm-button {
    min-height: 40px;
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    color: #202124;
    padding: 8px 12px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .hm-button:hover {
    background: #f5f5f4;
  }
  .hm-button:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }
  .hm-button:disabled:hover {
    background: white;
  }
  .hm-primary {
    border-color: #2f7d57;
    background: #2f7d57;
    color: white;
  }
  .hm-primary:hover {
    background: #276848;
  }
  .hm-primary:disabled:hover {
    background: #2f7d57;
  }
  .hm-dark {
    border-color: #202124;
    background: #202124;
    color: white;
  }
  .hm-dark:hover {
    background: #343638;
  }
  .hm-dark:disabled:hover {
    background: #202124;
  }
  @media (max-width: 720px) {
    .hm-grid {
      grid-template-columns: 1fr;
    }
    .hm-summary {
      grid-template-columns: 1fr;
    }
    .hm-footer {
      justify-content: stretch;
      max-height: 44vh;
      overflow: auto;
    }
    .hm-button {
      width: 100%;
    }
  }
`;
