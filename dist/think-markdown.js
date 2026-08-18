import { micromark } from "micromark";
import {
  THINK_MARKDOWN_ATTRIBUTE
} from "./accent-css.js";
import {
  createFrameBatchScheduler
} from "./think-scheduler.js";
function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function renderThinkMarkdownHtml(text, inline = false) {
  const html = micromark(text);
  if (!inline) return html;
  const paragraph = /^<p>([\s\S]*)<\/p>\n?$/.exec(html);
  return paragraph === null ? escapeHtml(text) : paragraph[1];
}
function installThinkMarkdown() {
  if (typeof MutationObserver !== "function" || typeof document.querySelectorAll !== "function") return () => {
  };
  const originals = /* @__PURE__ */ new Map();
  const selector = '[data-chat-flow-kind="assistant-step"] [data-variant="think"]';
  const renderElement = (element, kind) => {
    if (element === null) return;
    const previous = originals.get(element);
    if (previous !== void 0 && element.innerHTML === previous.html) return;
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
  const renderRoot = (root) => {
    if (root.getAttribute("data-state") !== "ok") return;
    const row = root.querySelector("[data-disclosure-row]");
    if (row === null) return;
    if (row.children.length >= 4) renderElement(row.lastElementChild, "summary");
    renderElement(row.nextElementSibling, "body");
  };
  let scheduler;
  const enqueueAdded = (node) => {
    if (!(node instanceof Element)) return;
    if (node.matches(selector)) scheduler.enqueue([node]);
    scheduler.enqueue(node.querySelectorAll(selector));
    const owner = node.closest(selector);
    if (owner !== null) scheduler.enqueue([owner]);
  };
  const useAnimationFrame = typeof requestAnimationFrame === "function";
  let removedSinceFlush = false;
  scheduler = createFrameBatchScheduler({
    batchSize: 4,
    schedule: (callback) => useAnimationFrame ? requestAnimationFrame(callback) : setTimeout(callback, 0),
    cancel: (handle) => useAnimationFrame ? cancelAnimationFrame(handle) : clearTimeout(handle),
    process: (root) => {
      if (root.isConnected) renderRoot(root);
    },
    onBatch: () => {
      if (!removedSinceFlush) return;
      for (const element of originals.keys()) if (!element.isConnected) originals.delete(element);
      removedSinceFlush = false;
    }
  });
  scheduler.enqueue(document.querySelectorAll(selector));
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        if (record.target instanceof Element) scheduler.enqueue([record.target]);
      } else {
        const owner = record.target instanceof Element ? record.target.closest(selector) : null;
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
export {
  installThinkMarkdown,
  renderThinkMarkdownHtml
};
