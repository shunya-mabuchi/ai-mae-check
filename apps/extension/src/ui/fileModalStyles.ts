export const filePreflightModalCss = `
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
    width: min(760px, 100%);
    max-height: min(760px, calc(100vh - 40px));
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
  .amc-description,
  .amc-note {
    margin: 0;
    color: #5f6368;
    line-height: 1.7;
  }
  .amc-body {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
  .amc-file {
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
    padding: 12px;
  }
  .amc-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .amc-name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .amc-badge {
    border: 1px solid #dfded8;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 700;
  }
  .amc-high,
  .amc-critical {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
  .amc-medium {
    border-color: #fde68a;
    background: #fffbeb;
    color: #92400e;
  }
  .amc-low,
  .amc-safe {
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
  .amc-primary {
    border-color: #2f7d57;
    background: #2f7d57;
    color: #fff;
  }
  .amc-button:hover {
    background: #f5f5f4;
  }
  .amc-primary:hover {
    background: #276848;
  }
  @media (max-width: 640px) {
    .amc-button {
      width: 100%;
    }
  }
`;
