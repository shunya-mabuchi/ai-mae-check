export const confirmModalCss = `
  :host {
    all: initial;
    color: #202124;
    font-family: system-ui, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    font-size: 14px;
  }
  .amc-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: rgba(32, 33, 36, 0.42);
    padding: 20px;
  }
  .amc-dialog {
    width: min(960px, 100%);
    max-height: min(820px, calc(100vh - 40px));
    overflow: auto;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fbfaf7;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
  }
  .amc-header,
  .amc-footer {
    padding: 18px 20px;
    background: #fff;
  }
  .amc-header {
    border-bottom: 1px solid #dfded8;
  }
  .amc-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0;
  }
  .amc-description {
    margin: 0;
    color: #5f6368;
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
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
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
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
    padding: 12px;
  }
  .amc-category-main {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .amc-category-main input {
    margin-top: 4px;
    accent-color: #2f7d57;
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
    border: 1px solid #dfded8;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 700;
  }
  .amc-critical,
  .amc-high {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
  .amc-medium {
    border-color: #fde68a;
    background: #fffbeb;
    color: #92400e;
  }
  .amc-low {
    border-color: #e7e5e4;
    background: #f5f5f4;
    color: #57534e;
  }
  .amc-note {
    margin: 0;
    color: #5f6368;
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
    border-top: 1px solid #eee;
    padding-top: 8px;
  }
  .amc-code,
  .amc-preview {
    display: block;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    border-radius: 6px;
    background: #f5f5f4;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }
  .amc-preview {
    min-height: 170px;
    max-height: 280px;
    overflow: auto;
    background: #fff;
    border: 1px solid #dfded8;
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
  .hm-candidate {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
    padding: 10px;
  }
  .hm-candidate input {
    margin-top: 4px;
    accent-color: #2f7d57;
  }
  .hm-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
  }
  .hm-message {
    color: #5f6368;
    font-size: 12px;
    line-height: 1.6;
  }
  .hm-text {
    display: block;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    border-radius: 6px;
    background: #f5f5f4;
    padding: 6px 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }
  .hm-badge {
    border: 1px solid #dfded8;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 700;
  }
  .hm-badge-critical,
  .hm-badge-high {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
  .hm-badge-medium {
    border-color: #fde68a;
    background: #fffbeb;
    color: #92400e;
  }
  .hm-badge-low {
    border-color: #e7e5e4;
    background: #f5f5f4;
    color: #57534e;
  }
  .amc-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid #dfded8;
  }
  .amc-button {
    min-height: 40px;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
    color: #202124;
    padding: 8px 13px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .amc-button:hover {
    background: #f5f5f4;
  }
  .amc-primary {
    border-color: #2f7d57;
    background: #2f7d57;
    color: #fff;
  }
  .amc-primary:hover {
    background: #276848;
  }
  .amc-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
