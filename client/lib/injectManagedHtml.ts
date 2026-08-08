const MANAGED_HTML_MARKER = "data-managed-site-html";

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
      for (const attr of Array.from(source.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.textContent = source.textContent;
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

/** Inject HTML fragments (e.g. script tags) so scripts actually execute. */
export function injectManagedHtml(
  target: "head" | "body",
  html: string,
  slotId: string,
): () => void {
  const parent = target === "head" ? document.head : document.body;
  return injectIntoParent(parent, html, slotId);
}

/** Inject HTML into a specific container (e.g. banner slot). */
export function injectManagedHtmlInto(
  parent: HTMLElement,
  html: string,
  slotId: string,
): () => void {
  return injectIntoParent(parent, html, slotId);
}
