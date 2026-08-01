export interface ShadowHostMount {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  cleanup: () => void;
}

export interface ReactShadowHostMount extends ShadowHostMount {
  rootContainer: HTMLDivElement;
  portalContainer: HTMLDivElement;
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

export function createReactShadowHost(cssText: string): ReactShadowHostMount {
  const mounted = createShadowHost(cssText);
  const rootContainer = document.createElement("div");
  const portalContainer = document.createElement("div");
  rootContainer.className = "amc-react-root";
  portalContainer.className = "amc-portal-root";
  mounted.shadow.append(rootContainer, portalContainer);

  return {
    ...mounted,
    rootContainer,
    portalContainer
  };
}
