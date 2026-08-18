const MANAGED_HTML_MARKER = "data-managed-site-html";
export const SITE_SCRIPTS_INJECTED_ATTR = "data-oldgem-site-scripts";
export const SITE_SCRIPTS_READY_EVENT = "oldgem:site-scripts-ready";

function normalizeScriptSrc(src: string | null): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

function appendExecutableScript(
  source: HTMLScriptElement,
  parent: HTMLElement,
  slotId: string,
): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.setAttribute(MANAGED_HTML_MARKER, slotId);

    for (const attr of Array.from(source.attributes)) {
      if (attr.name === "src") continue;
      script.setAttribute(attr.name, attr.value);
    }

    if (source.async) script.async = true;
    if (source.defer) script.defer = true;
    if (source.id) script.id = source.id;
    script.type = source.type || "text/javascript";

    const src = normalizeScriptSrc(source.getAttribute("src"));
    if (src) {
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      parent.appendChild(script);
      return;
    }

    script.textContent = source.textContent;
    parent.appendChild(script);
    resolve();
  });
}

async function injectIntoParentAsync(
  parent: HTMLElement,
  html: string,
  slotId: string,
): Promise<() => void> {
  parent
    .querySelectorAll(`[${MANAGED_HTML_MARKER}="${slotId}"]`)
    .forEach((node) => node.remove());

  const trimmed = html.trim();
  if (!trimmed) return () => {};

  const wrapper = document.createElement("div");
  wrapper.innerHTML = trimmed;

  const scriptNodes = Array.from(wrapper.querySelectorAll("script"));
  for (const node of scriptNodes) {
    node.remove();
  }

  const injected: Node[] = [];

  for (const node of Array.from(wrapper.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;

    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== "SCRIPT") {
      const el = node.cloneNode(true) as Element;
      el.setAttribute(MANAGED_HTML_MARKER, slotId);
      parent.appendChild(el);
      injected.push(el);
    }
  }

  for (const node of scriptNodes) {
    await appendExecutableScript(node as HTMLScriptElement, parent, slotId);
    injected.push(node);
  }

  return () => {
    for (const node of injected) {
      node.parentNode?.removeChild(node);
    }
    parent
      .querySelectorAll(`[${MANAGED_HTML_MARKER}="${slotId}"]`)
      .forEach((node) => node.remove());
  };
}

function injectIntoParent(
  parent: HTMLElement,
  html: string,
  slotId: string,
): () => void {
  parent
    .querySelectorAll(`[${MANAGED_HTML_MARKER}="${slotId}"]`)
    .forEach((node) => node.remove());

  const trimmed = html.trim();
  if (!trimmed) return () => {};

  const wrapper = document.createElement("div");
  wrapper.innerHTML = trimmed;

  const injected: Node[] = [];

  for (const node of Array.from(wrapper.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;

    if (node.nodeName === "SCRIPT") {
      const source = node as HTMLScriptElement;
      const script = document.createElement("script");
      script.setAttribute(MANAGED_HTML_MARKER, slotId);
      script.type = source.type || "text/javascript";

      for (const attr of Array.from(source.attributes)) {
        if (attr.name === "src") continue;
        script.setAttribute(attr.name, attr.value);
      }

      const src = normalizeScriptSrc(source.getAttribute("src"));
      if (src) {
        script.src = src;
        if (source.async) script.async = true;
        if (source.defer) script.defer = true;
      } else {
        script.textContent = source.textContent;
      }

      parent.appendChild(script);
      injected.push(script);
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node.cloneNode(true) as Element;
      el.setAttribute(MANAGED_HTML_MARKER, slotId);
      parent.appendChild(el);
      injected.push(el);
    }
  }

  return () => {
    for (const node of injected) {
      node.parentNode?.removeChild(node);
    }
    parent
      .querySelectorAll(`[${MANAGED_HTML_MARKER}="${slotId}"]`)
      .forEach((node) => node.remove());
  };
}

/** Replay lifecycle events so late-injected ad / pop-under tags can initialize. */
export function notifySiteScriptsReady(): void {
  if (document.readyState !== "loading") {
    document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
  }
  if (document.readyState === "complete") {
    window.dispatchEvent(new Event("load"));
  }
  window.dispatchEvent(new CustomEvent(SITE_SCRIPTS_READY_EVENT));
}

/** Inject HTML fragments (e.g. script tags) so scripts actually execute. */
export function injectManagedHtml(
  target: "head" | "body",
  html: string,
  slotId: string,
): () => void {
  const parent = target === "head" ? document.head : document.body;
  return injectIntoParent(parent, html, slotId);
}

/** Async variant — waits for external script onload (better for ad networks). */
export async function injectManagedHtmlAsync(
  target: "head" | "body",
  html: string,
  slotId: string,
): Promise<() => void> {
  const parent = target === "head" ? document.head : document.body;
  return injectIntoParentAsync(parent, html, slotId);
}

/** Inject HTML into a specific container (e.g. banner slot). */
export function injectManagedHtmlInto(
  parent: HTMLElement,
  html: string,
  slotId: string,
): () => void {
  return injectIntoParent(parent, html, slotId);
}
