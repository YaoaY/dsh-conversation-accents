import { micromark } from "micromark";

import {
  THINK_MARKDOWN_ATTRIBUTE
} from "./accent-css.js";
import {
  createFrameBatchScheduler,
  type FrameBatchScheduler
} from "./think-scheduler.js";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderThinkMarkdownHtml(text: string, inline = false): string {
  const html = micromark(text);
  if (!inline) return html;
  const paragraph = /^<p>([\s\S]*)<\/p>\n?$/.exec(html);
  return paragraph === null ? escapeHtml(text) : paragraph[1]!;
}

export function installThinkMarkdown(): () => void {
  if (typeof MutationObserver !== "function" || typeof document.querySelectorAll !== "function") return () => {};
  const originals = new Map<Element, { source: string; html: string }>();
  const selector = '[data-chat-flow-kind="assistant-step"] [data-variant="think"]';

  const renderElement = (element: Element | null, kind: "summary" | "body"): void => {
    if (element === null) return;
    const previous = originals.get(element);
    if (previous !== undefined && element.innerHTML === previous.html) return;

    if (element.childElementCount > 0) {
      originals.delete(element);
      element.removeAttribute(THINK_MARKDOWN_ATTRIBUTE);
      return;
    }

    const source = element.textContent ?? "";
    const html = renderThinkMarkdownHtml(source, kind === "summary");
    originals.set(element, { source, html });
    element.setAttribute(THINK_MARKDOWN_ATTRIBUTE, kind);
    element.innerHTML = html;
  };

  const renderRoot = (root: Element): void => {
    if (root.getAttribute("data-state") !== "ok") return;
    const row = root.querySelector<HTMLElement>("[data-disclosure-row]");
    if (row === null) return;
    if (row.children.length >= 4) renderElement(row.lastElementChild, "summary");
    renderElement(row.nextElementSibling, "body");
  };

  let scheduler: FrameBatchScheduler<Element>;
  const enqueueAdded = (node: Node): void => {
    if (!(node instanceof Element)) return;
    if (node.matches(selector)) scheduler.enqueue([node]);
    scheduler.enqueue(node.querySelectorAll<Element>(selector));
    const owner = node.closest<Element>(selector);
    if (owner !== null) scheduler.enqueue([owner]);
  };

  const useAnimationFrame = typeof requestAnimationFrame === "function";
  let removedSinceFlush = false;
  scheduler = createFrameBatchScheduler<Element>({
    batchSize: 4,
    schedule: (callback) => useAnimationFrame ? requestAnimationFrame(callback) : setTimeout(callback, 0),
    cancel: (handle) => useAnimationFrame ? cancelAnimationFrame(handle as number) : clearTimeout(handle as number),
    process: (root) => {
      if (root.isConnected) renderRoot(root);
    },
    onBatch: () => {
      if (!removedSinceFlush) return;
      for (const element of originals.keys()) if (!element.isConnected) originals.delete(element);
      removedSinceFlush = false;
    }
  });
  scheduler.enqueue(document.querySelectorAll<Element>(selector));

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        if (record.target instanceof Element) scheduler.enqueue([record.target]);
      } else {
        const owner = record.target instanceof Element ? record.target.closest<Element>(selector) : null;
        if (owner !== null) scheduler.enqueue([owner]);
        record.addedNodes.forEach(enqueueAdded);
        if (record.removedNodes.length > 0) removedSinceFlush = true;
      }
    }
  });
  observer.observe(document.body, {
    attributeFilter: ["data-state"],
    attributes: true,
    childList: true,
    subtree: true
  });

  return () => {
    observer.disconnect();
    scheduler.dispose();
    for (const [element, original] of originals) {
      if (!element.isConnected || !element.hasAttribute(THINK_MARKDOWN_ATTRIBUTE)) continue;
      if (element.innerHTML === original.html) element.textContent = original.source;
      element.removeAttribute(THINK_MARKDOWN_ATTRIBUTE);
    }
    originals.clear();
  };
}
