import test from "node:test";
import assert from "node:assert/strict";

import { installThinkMarkdown } from "../dist/think-markdown.js";

class FakeElement {
  constructor(text = "") {
    this.attributes = new Map();
    this.children = [];
    this.isConnected = true;
    this._textContent = text;
    this._innerHTML = text;
    this.childElementCount = 0;
    this.nextElementSibling = null;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.childElementCount = this._innerHTML.includes("<") ? 1 : 0;
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this._innerHTML = this._textContent;
    this.childElementCount = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  matches() {
    return false;
  }

  querySelectorAll() {
    return [];
  }

  closest() {
    return null;
  }
}

function createFixture() {
  const summary = new FakeElement("**summary**");
  const body = new FakeElement("## Plan\n\n- inspect");
  const row = new FakeElement();
  row.children = [new FakeElement(), new FakeElement(), new FakeElement(), summary];
  row.lastElementChild = summary;
  row.nextElementSibling = body;

  const root = new FakeElement();
  root.setAttribute("data-state", "ok");
  root.querySelector = (selector) => selector === "[data-disclosure-row]" ? row : null;
  return { root, summary, body };
}

async function withFakeDom(run) {
  const fixture = createFixture();
  const previous = {
    document: globalThis.document,
    Element: globalThis.Element,
    MutationObserver: globalThis.MutationObserver
  };
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
    }
    observe() {}
    disconnect() { this.disconnected = true; }
  }

  globalThis.Element = FakeElement;
  globalThis.MutationObserver = FakeMutationObserver;
  globalThis.document = {
    body: new FakeElement(),
    querySelectorAll: () => [fixture.root]
  };

  try {
    const dispose = installThinkMarkdown();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await run({ ...fixture, dispose });
  } finally {
    globalThis.document = previous.document;
    globalThis.Element = previous.Element;
    globalThis.MutationObserver = previous.MutationObserver;
  }
}

test("Think adapter restores content that it still owns", async () => {
  await withFakeDom(async ({ summary, body, dispose }) => {
    assert.match(summary.innerHTML, /<strong>summary<\/strong>/);
    assert.match(body.innerHTML, /<h2>Plan<\/h2>/);
    assert.equal(summary.getAttribute("data-dsh-think-markdown"), "summary");
    assert.equal(body.getAttribute("data-dsh-think-markdown"), "body");

    dispose();
    assert.equal(summary.textContent, "**summary**");
    assert.equal(body.textContent, "## Plan\n\n- inspect");
    assert.equal(summary.hasAttribute("data-dsh-think-markdown"), false);
  });
});

test("Think adapter does not overwrite Host replacements during disposal", async () => {
  await withFakeDom(async ({ body, dispose }) => {
    body.innerHTML = "<span>Host replacement</span>";
    body._textContent = "Host replacement";

    dispose();
    assert.equal(body.innerHTML, "<span>Host replacement</span>");
    assert.equal(body.textContent, "Host replacement");
    assert.equal(body.hasAttribute("data-dsh-think-markdown"), false);
  });
});
