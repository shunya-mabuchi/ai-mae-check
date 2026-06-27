import { createElement } from "./domElement";

const BRAND_ICON_PATH = "icon/48.png";

function getBrandIconUrl(): string {
  try {
    return chrome.runtime.getURL(BRAND_ICON_PATH);
  } catch {
    return BRAND_ICON_PATH;
  }
}

export function createBrandIcon(className: string): HTMLSpanElement {
  const mark = createElement("span", className);
  mark.setAttribute("aria-hidden", "true");

  const image = createElement("img", `${className}-image`);
  image.alt = "";
  image.decoding = "async";
  image.src = getBrandIconUrl();

  mark.append(image);
  return mark;
}
