import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function runtimeStub() {
  return {
    defineStore(declaration) {
      return {
        spec: declaration,
        create() {
          const state = declaration.init();
          const listeners = new Set();
          const actions = Object.fromEntries(Object.entries(declaration.actions).map(([name, mutate]) => [name, (...args) => {
            mutate(state, ...args);
            for (const listener of listeners) listener();
          }]));
          return {
            actions,
            getSnapshot: () => state,
            subscribe(listener) {
              listeners.add(listener);
              return () => listeners.delete(listener);
            }
          };
        }
      };
    }
  };
}

function documentStub() {
  const styles = [];
  const bodyChildren = [];
  const makeElement = (tag) => {
    const element = {
      tagName: tag,
      attributes: {},
      textContent: "",
      style: {},
      setAttribute(name, value) {
        element.attributes[name] = value;
      },
      remove() {
        const styleIndex = styles.indexOf(element);
        if (styleIndex !== -1) styles.splice(styleIndex, 1);
        const bodyIndex = bodyChildren.indexOf(element);
        if (bodyIndex !== -1) bodyChildren.splice(bodyIndex, 1);
      },
      click() {}
    };
    return element;
  };
  return {
    styles,
    shellStyles: {
      root: { background: "rgb(249, 250, 251)", color: "rgb(15, 17, 21)" },
      body: { background: "rgb(249, 250, 251)", color: "rgb(15, 17, 21)" },
      sidebar: { background: "rgb(255, 255, 255)", color: "rgb(15, 17, 21)" },
      input: { background: "rgb(255, 255, 255)", color: "rgb(15, 17, 21)" }
    },
    createElement: makeElement,
    head: {
      appendChild(element) {
        styles.push(element);
      }
    },
    body: {
      appendChild(element) {
        bodyChildren.push(element);
      }
    }
  };
}

function styleByKind(document, kind) {
  return document.styles.find((style) => style.attributes["data-plugin-css"] === kind);
}

async function loadClient({ fetchImpl } = {}) {
  const source = await readFile(new URL("../dist/client.js", import.meta.url), "utf8");
  let handoff;
  const storage = new Map();
  const listeners = new Map();
  const document = documentStub();
  const window = {
    __ModuleLoader__: { load(value) { handoff = value; } },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
    confirm: () => true
  };
  const context = vm.createContext({
    window,
    document,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    },
    fetch: fetchImpl ?? (async () => { throw new Error("unexpected fetch"); }),
    setTimeout,
    clearTimeout,
    AbortController,
    Blob: class {},
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} },
    console
  });
  vm.runInContext(source, context, { filename: "dist/client.js" });
  return { handoff, storage, document, listeners };
}

function loadPlugin(handoff) {
  const icon = () => null;
  return handoff.factory((specifier) => {
    if (specifier === "react") {
      return {
        createElement: () => null,
        useEffect: () => {},
        useMemo: (factory) => factory(),
        useRef: (value) => ({ current: value }),
        useState: (value) => [value, () => {}]
      };
    }
    if (specifier === "@deepseek-ai/dsh-client-runtime/client") return runtimeStub();
    if (specifier === "@deepseek-ai/dsh-client-ui-primitives") {
      return {
        IconBrowseOutline16: icon,
        IconCheckOutline16: icon,
        IconDownloadOutline16: icon,
        IconPlusOutline16: icon,
        IconRefreshOutline16: icon,
        IconTrashOutline16: icon,
        IconWarningOutline16: icon
      };
    }
    throw new Error(`unexpected module: ${specifier}`);
  });
}

function makeCtx({ loopback = false } = {}) {
  let registered;
  const disposers = [];
  const warnings = [];
  const ctx = {
    connection: { isLoopback: loopback },
    locale: {
      bind: () => (key) => key,
      register: () => () => {}
    },
    slots: {
      inject: (_name, callback) => callback(),
      register(options) {
        registered = options;
        return () => {};
      }
    },
    effect(factory) {
      const disposer = factory();
      if (typeof disposer === "function") disposers.push(disposer);
      return disposer;
    },
    logger: { warn: (error) => warnings.push(error) }
  };
  return {
    ctx,
    warnings,
    dispose: () => disposers.reverse().forEach((dispose) => dispose()),
    getRegistered: () => registered
  };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test("browser bundle registers the expected DSH Client plugin", async () => {
  const { handoff } = await loadClient();
  assert.equal(handoff.id, "dsh-conversation-accents");
  const plugin = loadPlugin(handoff);
  assert.equal(typeof plugin.apply, "function");
  assert.deepEqual([...plugin.inject], ["slots", "locale", "connection"]);
});

test("successful named and generic Tool call rows receive scoped accents", async () => {
  const { handoff, document } = await loadClient();
  const plugin = loadPlugin(handoff);
  const harness = makeCtx();
  plugin.apply(harness.ctx);
  assert.equal(harness.getRegistered().name, "settings.section");
  assert.equal(harness.getRegistered().id, "conversation-accents");
  assert.equal(harness.getRegistered().label(), "nav");

  const style = styleByKind(document, "tool-accents");
  assert.ok(style);
  assert.equal(style.attributes["data-plugin"], "dsh-conversation-accents");
  assert.match(style.textContent, /\[data-sample="bash"\]\[data-variant="bash"\]\[data-state="ok"\]/);
  for (const tool of ["pwsh", "read", "edit", "write", "grep", "glob", "web_search"]) {
    assert.match(style.textContent, new RegExp(`\\[data-tool="${tool}"\\]`));
  }
  assert.match(style.textContent, /\)\[data-state="ok"\]/);
  assert.match(style.textContent, /\[data-variant="others"\]\[data-state="ok"\] \[data-disclosure-row\] > :first-child/);
  assert.match(style.textContent, /\[data-variant="others"\] \[data-disclosure-row\] > :nth-child\(2\)/);
  assert.match(style.textContent, /--dsw-alias-state-success-primary/);
  assert.match(style.textContent, /--dsw-alias-state-business-primary/);
  assert.match(style.textContent, /> span:nth-last-child\(3\)/);
  assert.match(style.textContent, /\[data-disclosure-row\] > :nth-child\(2\)/);
  assert.match(style.textContent, /font-weight: 600/);
  assert.match(style.textContent, /font-weight: 400/);
  assert.doesNotMatch(style.textContent, /data-state="(?:error|running|stopped)"/);
  assert.equal(styleByKind(document, "assistant-markdown-accents"), undefined);

  harness.dispose();
  assert.equal(document.styles.length, 0);
});

test("running and settled Think blocks use scoped dark-gold styles", async () => {
  const { handoff, document } = await loadClient();
  const plugin = loadPlugin(handoff);

  assert.equal(plugin.__test.renderThinkMarkdownHtml("**deliberate**", true), "<strong>deliberate</strong>");
  assert.match(plugin.__test.renderThinkMarkdownHtml("## Plan\n\n- **inspect**\n- `verify`"), /<h2>Plan<\/h2>/);
  assert.match(plugin.__test.renderThinkMarkdownHtml("## Plan\n\n- **inspect**\n- `verify`"), /<strong>inspect<\/strong>/);
  assert.match(plugin.__test.renderThinkMarkdownHtml("<script>alert(1)<\/script>"), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(plugin.__test.renderThinkMarkdownHtml("[unsafe](javascript:alert(1))"), /javascript:/i);
  assert.doesNotMatch(plugin.__test.renderThinkMarkdownHtml("![pixel](data:text/html,unsafe)"), /data:text/i);

  const harness = makeCtx();
  plugin.apply(harness.ctx);
  const accentStyle = styleByKind(document, "think-accents");
  const layoutStyle = styleByKind(document, "think-markdown-layout");
  assert.ok(accentStyle);
  assert.ok(layoutStyle);
  assert.match(accentStyle.textContent, /\[data-variant="think"\]/);
  assert.doesNotMatch(accentStyle.textContent, /:has\(/);
  assert.match(accentStyle.textContent, /--dsh-think-gold: #806515/);
  assert.doesNotMatch(accentStyle.textContent, /font-weight: 600|white-space: normal/);
  assert.match(accentStyle.textContent, /\[data-variant="think"\]\[data-state="ok"\] \[data-disclosure-row\] > :first-child/);
  assert.match(accentStyle.textContent, /\[data-variant="think"\]\[data-state="running"\] \[data-disclosure-row\] > :nth-child\(4\)/);
  assert.match(accentStyle.textContent, /\[data-variant="think"\]\[data-state="running"\] \[data-disclosure-row\] \+ \*/);
  assert.match(layoutStyle.textContent, /\[data-dsh-think-markdown\] strong \{ font-weight: 600; \}/);
  assert.doesNotMatch(layoutStyle.textContent, /--dsh-think-gold|state-business-primary/);
  harness.dispose();
});

test("Host write responses use the same strict envelope as reads", async () => {
  const { handoff } = await loadClient({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        value: { colorsEnabled: true, activePreset: "native", customPalettes: [] },
        extra: true
      })
    })
  });
  const plugin = loadPlugin(handoff);
  await assert.rejects(
    plugin.__test.writeHostSettings({ colorsEnabled: true, activePreset: "native", customPalettes: [] }),
    /Host settings response is invalid/
  );
});

test("generated CSS is limited to assistant Markdown semantic selectors", async () => {
  const { handoff } = await loadClient();
  const plugin = loadPlugin(handoff);
  const css = plugin.__test.buildAccentCss({
    light: Object.fromEntries([
      ["strong", "#111111"], ["emphasis", "#222222"], ["heading", "#333333"], ["link", "#444444"],
      ["quote", "#555555"], ["quoteBorder", "#666666"], ["inlineCodeText", "#777777"],
      ["inlineCodeBackground", "#EEEEEE"], ["codeKeyword", "#880000"], ["codeString", "#008800"],
      ["codeFunction", "#000088"], ["codeConstant", "#880088"], ["codeComment", "#666666"],
      ["codeParameter", "#884400"], ["codePunctuation", "#222222"]
    ]),
    dark: Object.fromEntries([
      ["strong", "#FFFFFF"], ["emphasis", "#EEEEEE"], ["heading", "#DDDDDD"], ["link", "#CCCCCC"],
      ["quote", "#BBBBBB"], ["quoteBorder", "#AAAAAA"], ["inlineCodeText", "#FFFFFF"],
      ["inlineCodeBackground", "#111111"], ["codeKeyword", "#FF8888"], ["codeString", "#88FF88"],
      ["codeFunction", "#8888FF"], ["codeConstant", "#FF88FF"], ["codeComment", "#AAAAAA"],
      ["codeParameter", "#FFAA88"], ["codePunctuation", "#EEEEEE"]
    ])
  });
  for (const line of css.split("\n").filter(Boolean)) {
    assert.match(line, /\[data-chat-flow-kind="assistant-step"\]/, line);
  }
  assert.doesNotMatch(css, /:root/);
  assert.doesNotMatch(css, /(^|\n)\s*body\s*\{/);
  assert.doesNotMatch(css, /\[data-chat-flow\](?!-kind)/);
  const variableRoots = css.split("\n").filter((line) => /\[data-chat-flow-kind="assistant-step"\]\s*\{/.test(line));
  assert.equal(variableRoots.length, 2);
  for (const line of variableRoots) {
    const declarations = line.slice(line.indexOf("{") + 1, line.lastIndexOf("}")).split(";").map((value) => value.trim()).filter(Boolean);
    assert.ok(declarations.every((value) => value.startsWith("--dsh-conversation-")), line);
  }
  assert.doesNotMatch(css, /\sp\s*\{/);
  assert.doesNotMatch(css, /sidebar|textarea|input|--dsw-alias-bg-base|--dsw-specific-bubble/);
  const shikiLines = css.split("\n").filter((line) => line.includes("--shiki-token-"));
  assert.ok(shikiLines.length > 0);
  assert.ok(shikiLines.every((line) => line.includes(".md-code-block")));
  assert.match(css, /:not\(pre\) > code \{ [^}]*background: var\(--dsh-conversation-inline-code-bg\);/);
  assert.match(css, /--dsh-conversation-inline-code-bg: #EEEEEE/);
  assert.match(css, /body\[data-ds-dark-theme\] \[data-chat-flow-kind="assistant-step"\] \{ --dsh-conversation-strong: #FFFFFF;/);
});

test("master toggle removes only color styles and restores the remembered preset", async () => {
  const { handoff, storage, document } = await loadClient();
  const plugin = loadPlugin(handoff);
  const harness = makeCtx();
  const before = structuredClone(document.shellStyles);
  plugin.apply(harness.ctx);
  const instance = harness.getRegistered().store.create();
  const actions = harness.getRegistered().inject(instance.actions);

  actions.selectPreset("github-markdown");
  assert.equal(document.styles.length, 4);
  const accentStyle = styleByKind(document, "assistant-markdown-accents");
  assert.equal(accentStyle.attributes["data-plugin"], "dsh-conversation-accents");
  assert.match(accentStyle.textContent, /\[data-chat-flow-kind="assistant-step"\] strong/);
  assert.equal(JSON.parse(storage.get("dsh-conversation-accents.settings.v1")).activePreset, "github-markdown");

  actions.setColorsEnabled(false);
  assert.equal(document.styles.length, 1);
  assert.ok(styleByKind(document, "think-markdown-layout"));
  assert.equal(styleByKind(document, "assistant-markdown-accents"), undefined);
  assert.equal(styleByKind(document, "tool-accents"), undefined);
  assert.equal(styleByKind(document, "think-accents"), undefined);
  assert.equal(JSON.parse(storage.get("dsh-conversation-accents.settings.v1")).colorsEnabled, false);

  actions.setColorsEnabled(true);
  assert.equal(document.styles.length, 4);
  assert.ok(styleByKind(document, "assistant-markdown-accents"));
  actions.selectPreset("native");
  assert.equal(document.styles.length, 3);
  assert.equal(styleByKind(document, "assistant-markdown-accents"), undefined);
  assert.ok(styleByKind(document, "tool-accents"));
  assert.ok(styleByKind(document, "think-accents"));
  assert.ok(styleByKind(document, "think-markdown-layout"));
  assert.equal(storage.has("dsh-conversation-accents.settings.v1"), false);
  assert.deepEqual(document.shellStyles, before);
  harness.dispose();
  assert.equal(document.styles.length, 0);
});

test("custom color preview updates messages before save", async () => {
  const { handoff, document } = await loadClient();
  const plugin = loadPlugin(handoff);
  const harness = makeCtx();
  plugin.apply(harness.ctx);
  const instance = harness.getRegistered().store.create();
  const actions = harness.getRegistered().inject(instance.actions);
  const id = actions.createCustom();
  const custom = instance.getSnapshot().settings.customPalettes.find((entry) => entry.id === id);
  actions.previewCustom({
    ...custom,
    light: { ...custom.light, strong: "#123456" }
  });
  assert.match(styleByKind(document, "assistant-markdown-accents").textContent, /--dsh-conversation-strong: #123456/);
  actions.cancelPreview();
  assert.doesNotMatch(styleByKind(document, "assistant-markdown-accents").textContent, /--dsh-conversation-strong: #123456/);
  actions.setColorsEnabled(false);
  actions.previewCustom({ ...custom, light: { ...custom.light, strong: "#654321" } });
  assert.equal(document.styles.length, 1);
  assert.ok(styleByKind(document, "think-markdown-layout"));
  harness.dispose();
});

test("loopback defers colors and preserves a toggle changed during Host load", async () => {
  let resolveGet;
  const getResponse = new Promise((resolve) => { resolveGet = resolve; });
  const posts = [];
  const fetchImpl = async (_url, options = {}) => {
    if ((options.method ?? "GET") === "GET") return getResponse;
    const value = JSON.parse(options.body).value;
    posts.push(value);
    return { ok: true, status: 200, json: async () => ({ value }) };
  };
  const { handoff, document } = await loadClient({ fetchImpl });
  const plugin = loadPlugin(handoff);
  const harness = makeCtx({ loopback: true });
  plugin.apply(harness.ctx);
  assert.deepEqual(document.styles.map((style) => style.attributes["data-plugin-css"]), ["think-markdown-layout"]);

  const instance = harness.getRegistered().store.create();
  const actions = harness.getRegistered().inject(instance.actions);
  actions.setColorsEnabled(false);
  resolveGet({
    ok: true,
    status: 200,
    json: async () => ({ value: { colorsEnabled: true, activePreset: "dracula", customPalettes: [] } })
  });
  await settle();
  await settle();

  assert.equal(posts.length, 1);
  assert.equal(posts[0].colorsEnabled, false);
  assert.equal(instance.getSnapshot().settings.colorsEnabled, false);
  assert.deepEqual(document.styles.map((style) => style.attributes["data-plugin-css"]), ["think-markdown-layout"]);
  assert.equal(instance.getSnapshot().persistence, "host");
  harness.dispose();
});

test("external settings supersede an in-flight Host save", async () => {
  let resolveFirstPost;
  let markFirstPostStarted;
  const firstPostStarted = new Promise((resolve) => { markFirstPostStarted = resolve; });
  const firstPostGate = new Promise((resolve) => { resolveFirstPost = resolve; });
  const posts = [];
  const fetchImpl = async (_url, options = {}) => {
    if ((options.method ?? "GET") === "GET") {
      return { ok: true, status: 200, json: async () => ({ value: { colorsEnabled: true, activePreset: "native", customPalettes: [] } }) };
    }
    const value = JSON.parse(options.body).value;
    posts.push(value);
    if (posts.length === 1) {
      markFirstPostStarted();
      await firstPostGate;
    }
    return { ok: true, status: 200, json: async () => ({ value }) };
  };
  const { handoff, document, listeners } = await loadClient({ fetchImpl });
  const plugin = loadPlugin(handoff);
  const harness = makeCtx({ loopback: true });
  plugin.apply(harness.ctx);
  await settle();
  const instance = harness.getRegistered().store.create();
  const actions = harness.getRegistered().inject(instance.actions);
  actions.selectPreset("nord");
  await firstPostStarted;

  listeners.get("storage")({
    key: "dsh-conversation-accents.settings.v1",
    newValue: JSON.stringify({ colorsEnabled: false, activePreset: "dracula", customPalettes: [] })
  });
  assert.deepEqual(document.styles.map((style) => style.attributes["data-plugin-css"]), ["think-markdown-layout"]);
  resolveFirstPost();
  await settle();
  await settle();

  assert.equal(posts.length, 2);
  assert.deepEqual(posts[1], { colorsEnabled: false, activePreset: "dracula", customPalettes: [] });
  assert.equal(instance.getSnapshot().settings.colorsEnabled, false);
  assert.equal(instance.getSnapshot().settings.activePreset, "dracula");
  assert.equal(instance.getSnapshot().persistence, "host");
  harness.dispose();
});

test("loopback Host mode reads and saves the independent settings namespace", async () => {
  let hostValue = { activePreset: "native", customPalettes: [] };
  const requests = [];
  const fetchImpl = async (_url, options = {}) => {
    requests.push(options.method ?? "GET");
    if ((options.method ?? "GET") === "POST") hostValue = JSON.parse(options.body).value;
    return { ok: true, status: 200, json: async () => ({ value: hostValue }) };
  };
  const { handoff, document } = await loadClient({ fetchImpl });
  const plugin = loadPlugin(handoff);
  const harness = makeCtx({ loopback: true });
  plugin.apply(harness.ctx);
  await settle();
  const instance = harness.getRegistered().store.create();
  const actions = harness.getRegistered().inject(instance.actions);
  actions.selectPreset("nord");
  assert.equal(document.styles.length, 4);
  assert.ok(styleByKind(document, "think-markdown-layout"));
  assert.ok(styleByKind(document, "tool-accents"));
  assert.ok(styleByKind(document, "think-accents"));
  assert.ok(styleByKind(document, "assistant-markdown-accents"));
  await settle();
  assert.deepEqual(requests, ["GET", "POST"]);
  assert.equal(hostValue.activePreset, "nord");
  assert.equal(instance.getSnapshot().persistence, "host");
  harness.dispose();
});
