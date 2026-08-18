import assert from "node:assert/strict";
import { chromium } from "playwright-core";

function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

if (process.env.DSH_E2E_ALLOW_LIVE !== "1") {
  throw new Error("Set DSH_E2E_ALLOW_LIVE=1 before running this live-session check");
}

const BASE_URL = requiredEnv("DSH_E2E_BASE_URL").replace(/\/$/, "");
const SETTINGS_ENDPOINT = `${BASE_URL}/plugins/dsh-conversation-accents/settings`;
const SESSION_TITLE = requiredEnv("DSH_E2E_SESSION_TITLE");
const BROWSER_PATH = requiredEnv("DSH_E2E_BROWSER_PATH");
const MAX_INTERACTIVE_MS = Number(process.env.DSH_E2E_MAX_INTERACTIVE_MS ?? 5000);
const MAX_MARKDOWN_MS = Number(process.env.DSH_E2E_MAX_MARKDOWN_MS ?? 15000);
const CPU_RATE = Number(process.env.DSH_E2E_CPU_RATE ?? 1);

async function run(colorsEnabled) {
  const browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let settings = { colorsEnabled, activePreset: "dracula", customPalettes: [] };
  await context.route(SETTINGS_ENDPOINT, async (route) => {
    if (route.request().method() === "GET") {
      const response = await route.fetch();
      const body = await response.json();
      settings = { ...body.value, colorsEnabled, activePreset: "dracula" };
    } else if (route.request().method() === "POST") {
      settings = JSON.parse(route.request().postData()).value;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ value: settings })
    });
  });

  const page = await context.newPage();
  if (CPU_RATE > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.getByRole("button", { name: /展开其余 .* 个会话|Show .* more sessions/i }).click();
    const historyResponse = page.waitForResponse((response) => response.url().includes("/api/session.history"), { timeout: 15000 });
    const started = performance.now();
    await page.getByText(SESSION_TITLE, { exact: true }).click();
    await historyResponse;
    const responseMs = performance.now() - started;

    await page.waitForFunction(() => document.querySelector('[data-chat-flow-kind="assistant-step"]') !== null, null, { timeout: MAX_INTERACTIVE_MS });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const interactiveMs = performance.now() - started;
    assert.ok(interactiveMs < MAX_INTERACTIVE_MS, `${colorsEnabled ? "enabled" : "disabled"} history exceeded ${MAX_INTERACTIVE_MS}ms`);
    assert.deepEqual(errors, []);

    await page.waitForFunction(() => [...document.querySelectorAll('[data-chat-flow-kind="assistant-step"] [data-variant="think"][data-state="ok"]')].every((root) => {
      const row = root.querySelector("[data-disclosure-row]");
      if (row === null) return true;
      const summaryReady = row.children.length < 4 || row.lastElementChild?.hasAttribute("data-dsh-think-markdown");
      const body = row.nextElementSibling;
      return summaryReady && (body === null || body.hasAttribute("data-dsh-think-markdown"));
    }), null, { timeout: MAX_MARKDOWN_MS });
    const markdownMs = performance.now() - started;

    const snapshot = await page.evaluate(() => ({
      nodes: document.getElementsByTagName("*").length,
      assistants: document.querySelectorAll('[data-chat-flow-kind="assistant-step"]').length,
      thinks: document.querySelectorAll('[data-variant="think"]').length,
      tools: document.querySelectorAll('[data-chat-flow-kind="tool-call"]').length,
      styles: [...document.querySelectorAll('style[data-plugin="dsh-conversation-accents"]')].map((element) => element.dataset.pluginCss)
    }));
    assert.ok(snapshot.assistants > 0, "history did not render assistant steps");
    assert.ok(snapshot.thinks > 0, "history did not render Think rows");
    assert.ok(snapshot.tools > 0, "history did not render tool rows");
    assert.deepEqual(new Set(snapshot.styles), new Set(colorsEnabled
      ? ["think-markdown-layout", "assistant-markdown-accents", "tool-accents", "think-accents"]
      : ["think-markdown-layout"]));
    return {
      colorsEnabled,
      responseMs: Math.round(responseMs),
      interactiveMs: Math.round(interactiveMs),
      markdownMs: Math.round(markdownMs),
      snapshot
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

console.log(JSON.stringify({
  sessionTitle: SESSION_TITLE,
  cpuRate: CPU_RATE,
  disabled: await run(false),
  enabled: await run(true)
}, null, 2));
