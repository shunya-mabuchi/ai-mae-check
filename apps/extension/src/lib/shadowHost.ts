export interface ShadowHostMount {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  cleanup: () => void;
}

export function createShadowHost(cssText: string): ShadowHostMount {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.append(style);
  document.documentElement.append(host);

  return {
    host,
    shadow,
    cleanup: () => host.remove()
  };
}
