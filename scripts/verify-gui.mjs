import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

if (process.env.DSH_E2E_ALLOW_LIVE !== "1") {
  throw new Error("Set DSH_E2E_ALLOW_LIVE=1 before running this live GUI check");
}

const BASE_URL = requiredEnv("DSH_E2E_BASE_URL").replace(/\/$/, "");
const BROWSER_PATH = requiredEnv("DSH_E2E_BROWSER_PATH");
const CAPTURE_SCREENSHOTS = process.env.DSH_E2E_CAPTURE_SCREENSHOTS === "1";
const ARTIFACT_DIR = new URL("../artifacts", import.meta.url).pathname;
if (CAPTURE_SCREENSHOTS) await mkdir(ARTIFACT_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.stack ?? error.message));
page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });

async function loadGui() {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#root").waitFor({ state: "attached" });
  await page.getByRole("button", { name: "设置", exact: true }).waitFor();
}

async function openSettings() {
  if (await page.getByRole("dialog").count() === 0) await page.getByRole("button", { name: "设置", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const section = dialog.locator("section").filter({ hasText: "会话内容配色" }).first();
  if (await section.count() === 0) {
    await dialog.getByRole("button", { name: "会话配色", exact: true }).click();
  }
  await section.waitFor();
  return { dialog, section, select: section.locator("select").first() };
}

async function waitForHostPreset(expected) {
  await page.waitForFunction(async ({ endpoint, preset }) => {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return false;
    return (await response.json()).value?.activePreset === preset;
  }, { endpoint: `${BASE_URL}/plugins/dsh-conversation-accents/settings`, preset: expected });
}

async function waitForHostColorsEnabled(expected) {
  await page.waitForFunction(async ({ endpoint, enabled }) => {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return false;
    return (await response.json()).value?.colorsEnabled === enabled;
  }, { endpoint: `${BASE_URL}/plugins/dsh-conversation-accents/settings`, enabled: expected });
}

async function tagShell(dialog) {
  await page.getByRole("button", { name: "设置", exact: true }).evaluate((button) => {
    const shell = button.closest("aside") ?? button.closest("nav") ?? button.parentElement?.parentElement?.parentElement;
    if (shell) shell.id = "dsh-accents-test-sidebar";
  });
  await dialog.evaluate((element) => { element.id = "dsh-accents-test-dialog"; });
  await page.locator("textarea").first().evaluate((element) => { element.id = "dsh-accents-test-input"; });
}

async function installSemanticFixture() {
  await page.evaluate(() => {
    document.querySelector("#dsh-accents-test-fixture")?.remove();
    const fixture = document.createElement("div");
    fixture.id = "dsh-accents-test-fixture";
    fixture.setAttribute("data-chat-flow-kind", "assistant-step");
    fixture.style.cssText = "position:fixed;left:-10000px;top:0";
    fixture.innerHTML = `
      <p id="fixture-plain">plain <strong id="fixture-strong">strong</strong> <em id="fixture-em">em</em> <del id="fixture-del">del</del></p>
      <h2 id="fixture-heading">heading</h2><a id="fixture-link" href="#">link</a>
      <blockquote id="fixture-quote" style="border-left-style:solid;border-left-width:4px">quote</blockquote>
      <p><code id="fixture-inline">inline</code></p><table><thead><tr><th id="fixture-th">heading</th></tr></thead></table>
      <span id="fixture-outside-token" style="color:var(--shiki-token-keyword)">outside token</span>
      <div class="md-code-block"><pre><code>
        <span id="fixture-keyword" style="color:var(--shiki-token-keyword)">const</span>
        <span id="fixture-string" style="color:var(--shiki-token-string)">string</span>
        <span id="fixture-function" style="color:var(--shiki-token-function)">fn</span>
        <span id="fixture-constant" style="color:var(--shiki-token-constant)">true</span>
        <span id="fixture-comment" style="color:var(--shiki-token-comment)">// comment</span>
      </code></pre></div>`;
    document.body.appendChild(fixture);
  });
}

async function installToolCallFixture() {
  await page.evaluate(() => {
    document.querySelector("#dsh-accents-tool-call-fixture")?.remove();
    const owner = document.createElement("div");
    owner.id = "dsh-accents-tool-call-fixture";
    owner.setAttribute("data-chat-flow-kind", "tool-call");
    owner.style.cssText = "position:fixed;left:-10000px;top:0";
    owner.innerHTML = '<div data-variant="others" data-tool="custom_tool" data-state="ok"><div><div data-disclosure-row><span id="fixture-tool-call-icon">icon</span><span id="fixture-tool-call-title">Tool call</span><span aria-hidden="true"></span><span>summary</span></div></div></div>';
    document.body.appendChild(owner);
  });
}

async function toolCallFixtureSnapshot() {
  return page.evaluate(() => {
    const resolve = (name) => {
      const sample = document.createElement("span");
      sample.style.color = `var(${name})`;
      document.body.appendChild(sample);
      const color = getComputedStyle(sample).color;
      sample.remove();
      return color;
    };
    const icon = document.querySelector("#fixture-tool-call-icon");
    const title = document.querySelector("#fixture-tool-call-title");
    return {
      success: resolve("--dsw-alias-state-success-primary"),
      business: resolve("--dsw-alias-state-business-primary"),
      iconColor: getComputedStyle(icon).color,
      titleColor: getComputedStyle(title).color,
      titleWeight: getComputedStyle(title).fontWeight
    };
  });
}

async function installThinkFixture() {
  await page.evaluate(() => {
    document.querySelector("#dsh-accents-think-fixture-owner")?.remove();
    const owner = document.createElement("div");
    owner.id = "dsh-accents-think-fixture-owner";
    owner.setAttribute("data-chat-flow-kind", "assistant-step");
    owner.style.cssText = "position:fixed;left:-10000px;top:0";
    const fixture = document.createElement("div");
    fixture.id = "dsh-accents-think-fixture";
    fixture.setAttribute("data-variant", "think");
    fixture.setAttribute("data-state", "ok");
    fixture.innerHTML = `<div><div data-disclosure-row><span>icon</span><span>Think</span><span aria-hidden="true"></span><span id="fixture-think-summary">**Deliberate**</span></div><div id="fixture-think-body">## Plan\n\n- **Inspect**\n- \`verify\`\n\n&lt;script&gt;unsafe()&lt;/script&gt;</div></div>`;
    owner.appendChild(fixture);
    const running = document.createElement("div");
    running.id = "dsh-accents-think-running";
    running.setAttribute("data-variant", "think");
    running.setAttribute("data-state", "running");
    running.innerHTML = '<div><div data-disclosure-row><span id="fixture-think-running-icon">icon</span><span>Think</span><span></span><span id="fixture-think-running-summary">**Streaming**</span></div><div id="fixture-think-running-body">**Streaming body**</div></div>';
    owner.appendChild(running);
    document.body.appendChild(owner);
  });
  await page.waitForFunction(() => document.querySelector("#fixture-think-summary")?.getAttribute("data-dsh-think-markdown") === "summary"
    && document.querySelector("#fixture-think-body")?.getAttribute("data-dsh-think-markdown") === "body");
  const runningSnapshot = await page.evaluate(() => {
    const summary = document.querySelector("#fixture-think-running-summary");
    const body = document.querySelector("#fixture-think-running-body");
    const icon = document.querySelector("#fixture-think-running-icon");
    return {
      expected: document.body.hasAttribute("data-ds-dark-theme") ? "rgb(183, 154, 82)" : "rgb(128, 101, 21)",
      summaryColor: getComputedStyle(summary).color,
      bodyColor: getComputedStyle(body).color,
      iconColor: getComputedStyle(icon).color,
      markers: document.querySelectorAll("#dsh-accents-think-running [data-dsh-think-markdown]").length,
      strong: document.querySelectorAll("#dsh-accents-think-running strong").length
    };
  });
  assert.equal(runningSnapshot.summaryColor, runningSnapshot.expected);
  assert.equal(runningSnapshot.bodyColor, runningSnapshot.expected);
  assert.notEqual(runningSnapshot.iconColor, runningSnapshot.expected);
  assert.equal(runningSnapshot.markers, 0);
  assert.equal(runningSnapshot.strong, 0);
  await page.locator("#dsh-accents-think-running").evaluate((element) => { element.setAttribute("data-state", "ok"); });
  await page.locator('#fixture-think-running-summary[data-dsh-think-markdown="summary"] strong').waitFor();
  await page.locator('#fixture-think-running-body[data-dsh-think-markdown="body"] strong').waitFor();
}

async function thinkFixtureSnapshot() {
  return page.evaluate(() => {
    const summary = document.querySelector("#fixture-think-summary");
    const body = document.querySelector("#fixture-think-body");
    const summaryStrong = summary.querySelector("strong");
    const bodyStrong = body.querySelector("strong");
    const icon = document.querySelector("#dsh-accents-think-fixture [data-disclosure-row] > :first-child");
    return {
      iconColor: getComputedStyle(icon).color,
      summaryColor: getComputedStyle(summary).color,
      summaryStrongColor: getComputedStyle(summaryStrong).color,
      summaryStrongWeight: getComputedStyle(summaryStrong).fontWeight,
      bodyColor: getComputedStyle(body).color,
      bodyStrongColor: getComputedStyle(bodyStrong).color,
      headingCount: body.querySelectorAll("h2").length,
      codeCount: body.querySelectorAll("code").length,
      scriptCount: body.querySelectorAll("script").length,
      literalUnsafeText: body.textContent.includes("<script>unsafe()</script>")
    };
  });
}

async function shellSnapshot() {
  return page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color, borderColor: style.borderColor, boxShadow: style.boxShadow };
    };
    return { body: read("body"), root: read("#root"), sidebar: read("#dsh-accents-test-sidebar"), input: read("#dsh-accents-test-input"), settings: read("#dsh-accents-test-dialog") };
  });
}

async function fixtureSnapshot() {
  return page.evaluate(() => {
    const color = (selector) => getComputedStyle(document.querySelector(selector)).color;
    const background = (selector) => getComputedStyle(document.querySelector(selector)).backgroundColor;
    return {
      plain: color("#fixture-plain"), strong: color("#fixture-strong"), emphasis: color("#fixture-em"), heading: color("#fixture-heading"),
      link: color("#fixture-link"), quote: color("#fixture-quote"), quoteBorder: getComputedStyle(document.querySelector("#fixture-quote")).borderLeftColor,
      inlineText: color("#fixture-inline"), inlineBackground: background("#fixture-inline"), tableHeading: color("#fixture-th"),
      outsideToken: color("#fixture-outside-token"), keyword: color("#fixture-keyword"), string: color("#fixture-string"),
      function: color("#fixture-function"), constant: color("#fixture-constant"), comment: color("#fixture-comment")
    };
  });
}

async function selectPreset(select, id) {
  await select.selectOption(id);
  await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]').waitFor({ state: id === "native" ? "detached" : "attached" });
  await waitForHostPreset(id);
}

await loadGui();
let { dialog, section, select } = await openSettings();
await tagShell(dialog);
await installSemanticFixture();
await installToolCallFixture();
await installThinkFixture();

const graph = await page.evaluate(() => window.__DSH_BOOT__?.entries?.map((entry) => entry.id) ?? []);
assert.ok(graph.includes("dsh-conversation-accents"));
const shellStyle = page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="tool-accents"]');
await shellStyle.waitFor({ state: "attached" });
const shellStyleText = await shellStyle.textContent();
assert.match(shellStyleText, /\[data-sample="bash"\]\[data-variant="bash"\]\[data-state="ok"\]/);
for (const tool of ["pwsh", "read", "edit", "write", "grep", "glob", "web_search"]) assert.match(shellStyleText, new RegExp(`\\[data-tool="${tool}"\\]`));
assert.match(shellStyleText, /--dsw-alias-state-business-primary/);
assert.match(shellStyleText, /\[data-variant="others"\]/);
assert.match(shellStyleText, /font-weight: 600/);
assert.match(shellStyleText, /font-weight: 400/);
assert.doesNotMatch(shellStyleText, /data-state="(?:error|running|stopped)"/);
const toolCallSnapshot = await toolCallFixtureSnapshot();
assert.equal(toolCallSnapshot.iconColor, toolCallSnapshot.success);
assert.equal(toolCallSnapshot.titleColor, toolCallSnapshot.business);
assert.equal(toolCallSnapshot.titleWeight, "400");
const thinkStyle = page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="think-accents"]');
await thinkStyle.waitFor({ state: "attached" });
assert.match(await thinkStyle.textContent(), /--dsh-think-gold: #806515/);
const thinkLayoutStyle = page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="think-markdown-layout"]');
await thinkLayoutStyle.waitFor({ state: "attached" });
assert.equal(await section.getByText("Host 已同步", { exact: true }).count(), 1);
assert.deepEqual(await select.locator("option").allTextContents(), ["系统默认", "GitHub Markdown", "Catppuccin Mocha", "Dracula", "Nord", "Tokyo Night", "Gruvbox"]);
const colorsToggle = section.getByRole("switch", { name: "启用元素配色", exact: true });
assert.equal(await colorsToggle.getAttribute("aria-checked"), "true");
await colorsToggle.click();
await waitForHostColorsEnabled(false);
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]').count(), 0);
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="tool-accents"]').count(), 0);
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="think-accents"]').count(), 0);
assert.equal(await thinkLayoutStyle.count(), 1);
assert.equal(await colorsToggle.getAttribute("aria-checked"), "false");
await colorsToggle.click();
await waitForHostColorsEnabled(true);
await shellStyle.waitFor({ state: "attached" });
await thinkStyle.waitFor({ state: "attached" });
assert.equal(await colorsToggle.getAttribute("aria-checked"), "true");

await dialog.getByRole("button", { name: "通用设置", exact: true }).click();
const lightTheme = dialog.getByRole("button", { name: "浅色", exact: true }).first();
const darkTheme = dialog.getByRole("button", { name: "深色", exact: true }).first();
const systemTheme = dialog.getByRole("button", { name: "跟随系统", exact: true }).first();

await lightTheme.click();
await page.waitForFunction(() => !document.body.hasAttribute("data-ds-dark-theme"));
({ dialog, section, select } = await openSettings());
assert.deepEqual(await thinkFixtureSnapshot(), {
  iconColor: "rgb(128, 101, 21)",
  summaryColor: "rgb(128, 101, 21)", summaryStrongColor: "rgb(128, 101, 21)", summaryStrongWeight: "600",
  bodyColor: "rgb(128, 101, 21)", bodyStrongColor: "rgb(128, 101, 21)", headingCount: 1, codeCount: 1,
  scriptCount: 0, literalUnsafeText: true
});
await selectPreset(select, "native");
const lightShellBefore = await shellSnapshot();
const lightFixtureBefore = await fixtureSnapshot();
await selectPreset(select, "github-markdown");
const lightShellAfter = await shellSnapshot();
const lightFixtureAfter = await fixtureSnapshot();
assert.deepEqual(lightShellAfter, lightShellBefore, "light shell computed styles changed");
assert.equal(lightFixtureAfter.plain, lightFixtureBefore.plain, "plain assistant text changed");
assert.equal(lightFixtureAfter.outsideToken, lightFixtureBefore.outsideToken, "Shiki token escaped .md-code-block");
assert.deepEqual({
  strong: lightFixtureAfter.strong, emphasis: lightFixtureAfter.emphasis, heading: lightFixtureAfter.heading, link: lightFixtureAfter.link,
  quote: lightFixtureAfter.quote, quoteBorder: lightFixtureAfter.quoteBorder, inlineText: lightFixtureAfter.inlineText,
  inlineBackground: lightFixtureAfter.inlineBackground, tableHeading: lightFixtureAfter.tableHeading, keyword: lightFixtureAfter.keyword,
  string: lightFixtureAfter.string, function: lightFixtureAfter.function, constant: lightFixtureAfter.constant, comment: lightFixtureAfter.comment
}, {
  strong: "rgb(9, 105, 218)", emphasis: "rgb(130, 80, 223)", heading: "rgb(9, 105, 218)", link: "rgb(9, 105, 218)",
  quote: "rgb(87, 96, 106)", quoteBorder: "rgb(175, 184, 193)", inlineText: "rgb(130, 80, 223)",
  inlineBackground: "rgb(239, 241, 243)", tableHeading: "rgb(9, 105, 218)", keyword: "rgb(207, 34, 46)",
  string: "rgb(10, 48, 105)", function: "rgb(130, 80, 223)", constant: "rgb(5, 80, 174)", comment: "rgb(110, 119, 129)"
});

const styleText = await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]').textContent();
for (const line of styleText.split("\n").filter(Boolean)) assert.match(line, /\[data-chat-flow-kind="assistant-step"\]/);
assert.doesNotMatch(styleText, /:root|(^|\n)\s*body\s*\{|\[data-chat-flow\]\s*\{|sidebar|textarea/);
assert.ok(styleText.split("\n").filter((line) => line.includes("--shiki-token-")).every((line) => line.includes(".md-code-block")));
if (CAPTURE_SCREENSHOTS) await page.screenshot({ path: `${ARTIFACT_DIR}/light-github-markdown.png`, fullPage: true });

await selectPreset(select, "native");
await dialog.getByRole("button", { name: "通用设置", exact: true }).click();
await darkTheme.click();
await page.waitForFunction(() => document.body.hasAttribute("data-ds-dark-theme"));
({ dialog, section, select } = await openSettings());
const darkThink = await thinkFixtureSnapshot();
assert.deepEqual({
  iconColor: darkThink.iconColor, summaryColor: darkThink.summaryColor, summaryStrongColor: darkThink.summaryStrongColor,
  bodyColor: darkThink.bodyColor, bodyStrongColor: darkThink.bodyStrongColor
}, {
  iconColor: "rgb(183, 154, 82)", summaryColor: "rgb(183, 154, 82)", summaryStrongColor: "rgb(183, 154, 82)",
  bodyColor: "rgb(183, 154, 82)", bodyStrongColor: "rgb(183, 154, 82)"
});
const darkShellBefore = await shellSnapshot();
const darkFixtureBefore = await fixtureSnapshot();
await selectPreset(select, "github-markdown");
const darkThinkWithAccent = await thinkFixtureSnapshot();
assert.equal(darkThinkWithAccent.summaryStrongColor, darkThinkWithAccent.summaryColor);
assert.equal(darkThinkWithAccent.bodyStrongColor, darkThinkWithAccent.bodyColor);
const darkShellAfter = await shellSnapshot();
const darkFixtureAfter = await fixtureSnapshot();
assert.deepEqual(darkShellAfter, darkShellBefore, "dark shell computed styles changed");
assert.equal(darkFixtureAfter.plain, darkFixtureBefore.plain, "dark plain assistant text changed");
assert.equal(darkFixtureAfter.outsideToken, darkFixtureBefore.outsideToken, "dark Shiki token escaped .md-code-block");
assert.deepEqual({ strong: darkFixtureAfter.strong, emphasis: darkFixtureAfter.emphasis, heading: darkFixtureAfter.heading, inlineText: darkFixtureAfter.inlineText, inlineBackground: darkFixtureAfter.inlineBackground, keyword: darkFixtureAfter.keyword, string: darkFixtureAfter.string, function: darkFixtureAfter.function, comment: darkFixtureAfter.comment }, {
  strong: "rgb(88, 166, 255)", emphasis: "rgb(210, 168, 255)", heading: "rgb(88, 166, 255)", inlineText: "rgb(210, 168, 255)", inlineBackground: "rgb(45, 51, 59)", keyword: "rgb(255, 123, 114)", string: "rgb(165, 214, 255)", function: "rgb(210, 168, 255)", comment: "rgb(139, 148, 158)"
});

await section.getByRole("button", { name: "新建自定义预设", exact: true }).click();
await page.waitForFunction(() => [...document.querySelectorAll("section select")].some((element) => element.value.startsWith("custom-")));
const customId = await select.inputValue();
assert.match(customId, /^custom-/);
const inlineBackgroundField = section.getByRole("textbox", { name: "内联代码背景 hex value", exact: true });
await inlineBackgroundField.waitFor();
assert.equal(await inlineBackgroundField.count(), 1);
await section.getByRole("button", { name: "深色", exact: true }).last().click();
const strongField = section.getByRole("textbox", { name: "普通重点 hex value", exact: true });
await strongField.fill("#12ABEF");
await page.waitForFunction(() => document.querySelector('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]')?.textContent.includes("#12ABEF"));
assert.equal((await fixtureSnapshot()).strong, "rgb(18, 171, 239)", "custom edit did not apply live");
await section.getByRole("button", { name: "保存", exact: true }).click();
await page.waitForFunction(async ({ endpoint, id, color }) => {
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return false;
  const settings = (await response.json()).value;
  return settings.activePreset === id && settings.customPalettes?.find((entry) => entry.id === id)?.dark.strong === color;
}, { endpoint: `${BASE_URL}/plugins/dsh-conversation-accents/settings`, id: customId, color: "#12ABEF" });
const savedCustom = await page.evaluate(async (endpoint) => (await (await fetch(endpoint, { cache: "no-store" })).json()).value, `${BASE_URL}/plugins/dsh-conversation-accents/settings`);
assert.equal(savedCustom.customPalettes.find((entry) => entry.id === customId).dark.strong, "#12ABEF");

await page.setViewportSize({ width: 390, height: 844 });
assert.equal(await section.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true, "custom editor overflows on mobile");
await section.scrollIntoViewIfNeeded();
if (CAPTURE_SCREENSHOTS) await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-custom-editor.png`, fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });

page.once("dialog", (prompt) => prompt.accept());
await section.getByRole("button", { name: "删除", exact: true }).click();
await waitForHostPreset("native");
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]').count(), 0);

await selectPreset(select, "nord");
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "设置", exact: true }).waitFor();
({ dialog, section, select } = await openSettings());
assert.equal(await select.inputValue(), "nord", "Host preset did not survive reload");
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]').count(), 1);

await page.setViewportSize({ width: 390, height: 844 });
assert.equal(await section.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true, "settings row overflows on mobile");
await section.scrollIntoViewIfNeeded();
if (CAPTURE_SCREENSHOTS) await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-settings.png`, fullPage: true });

await selectPreset(select, "native");
await dialog.getByRole("button", { name: "通用设置", exact: true }).click();
await systemTheme.click();
await waitForHostPreset("native");
({ dialog, section, select } = await openSettings());
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="assistant-markdown-accents"]').count(), 0);
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="tool-accents"]').count(), 1);
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="think-accents"]').count(), 1);
assert.equal(await page.locator('style[data-plugin="dsh-conversation-accents"][data-plugin-css="think-markdown-layout"]').count(), 1);
assert.equal(await section.getByRole("switch", { name: "启用元素配色", exact: true }).getAttribute("aria-checked"), "true");
assert.deepEqual(await page.evaluate(async (endpoint) => (await (await fetch(endpoint, { cache: "no-store" })).json()).value, `${BASE_URL}/plugins/dsh-conversation-accents/settings`), { colorsEnabled: true, activePreset: "native", customPalettes: [] });
assert.deepEqual(browserErrors, []);

console.log(JSON.stringify({
  pluginInGraph: true, hostPersistence: true, lightIsolation: true, darkIsolation: true,
  plainTextUnchanged: true, shikiScoped: true, customLivePreview: true, reloadPersistence: true,
  masterColorsToggle: true, toolAccents: true, thinkMarkdownGold: true, mobileFits: true, finalPreset: "native",
  screenshots: CAPTURE_SCREENSHOTS
    ? [`${ARTIFACT_DIR}/light-github-markdown.png`, `${ARTIFACT_DIR}/mobile-custom-editor.png`, `${ARTIFACT_DIR}/mobile-settings.png`]
    : []
}, null, 2));

await browser.close();
