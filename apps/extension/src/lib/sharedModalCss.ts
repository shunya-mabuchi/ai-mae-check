import { extensionModalTokens } from "./modalDesignTokens";
import {
  createButtonCss,
  createFooterCss,
  createResponsiveCss,
  createRiskPillCss,
  joinSelectors,
  type SharedModalCssOptions
} from "./sharedModalCssParts";

const { colors, font, radius, shadow, spacing } = extensionModalTokens;

export function createSharedModalCss(options: SharedModalCssOptions): string {
  const prefix = options.prefix;

  return `
  :host {
    all: initial;
    color: ${colors.text};
    font-family: ${font.family};
    font-size: ${font.body};
  }
  .${prefix}-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: ${colors.overlay};
    padding: ${spacing.page};
  }
  .${prefix}-dialog {
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
  .${prefix}-header {
    display: grid;
    gap: 10px;
    flex-shrink: 0;
    border-bottom: 1px solid ${colors.border};
    background: ${colors.surface};
    padding: 20px 22px 18px;
  }
  .${prefix}-header-top {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: 12px;
  }
  .${prefix}-brand {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    gap: 10px;
  }
  .${prefix}-brand-mark {
    display: inline-grid;
    width: 36px;
    height: 36px;
    place-items: center;
    overflow: hidden;
    border-radius: ${radius.content};
    background: transparent;
    box-shadow: 0 8px 18px rgba(15, 159, 105, 0.18);
  }
  .${prefix}-brand-mark-image {
    display: block;
    width: 36px;
    height: 36px;
    object-fit: cover;
  }
  .${prefix}-brand-name {
    margin: 0;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: 0;
  }
  .${prefix}-mode-badge,
  .${prefix}-risk-pill {
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
  .${prefix}-mode-badge {
    justify-self: start;
    border: 1px solid ${colors.accentBorder};
    background: ${colors.accentSoft};
    color: ${colors.accent};
  }${createRiskPillCss(prefix, options.riskPillTone, options.includeRiskPillLevels)}
  .${prefix}-title {
    margin: 2px 0 0;
    font-size: ${font.title};
    font-weight: 820;
    letter-spacing: 0;
  }
  .${prefix}-description {
    margin: 0;
    color: ${colors.mutedText};
    line-height: 1.7;
  }
  .${prefix}-body {
    display: grid;
    gap: 16px;
    min-height: 0;
    overflow: auto;
    padding: 18px 22px;
  }
  .${prefix}-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .${options.metricClassName} {
    min-width: 0;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: ${colors.surface};
    padding: 10px 12px;
  }
  ${options.metricLabelSelector} {
    display: block;
    overflow: hidden;
    color: ${colors.mutedText};
    font-size: ${font.small};
    font-weight: 700;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ${options.metricValueSelector} {
    display: block;
    margin-top: 4px;
    font-size: ${options.metricValueFontSize};
    line-height: 1;
  }
  .${prefix}-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 14px;
  }
  .${prefix}-panel {
    min-width: 0;
    border: 1px solid ${colors.border};
    border-radius: ${radius.card};
    background: rgba(255, 255, 255, 0.86);
    padding: 14px;
    box-shadow: ${shadow.soft};
  }
${joinSelectors(options.headingSelectors)} {
    margin: 0;
    font-size: ${font.section};
    font-weight: 820;
    letter-spacing: 0;
  }
  .${prefix}-panel-caption {
    margin: 5px 0 12px;
    color: ${colors.mutedText};
    font-size: ${font.small};
    line-height: 1.6;
  }
  .${prefix}-preview {
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
  .${options.trustStripClassName} {
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
  .${options.trustStripClassName} span + span::before {
    content: "/";
    margin-right: 14px;
    color: ${colors.softText};
  }${createFooterCss(prefix, options.footerLayout)}${createButtonCss(prefix)}${createResponsiveCss(options)}
`;
}

export { extensionModalTokens };
