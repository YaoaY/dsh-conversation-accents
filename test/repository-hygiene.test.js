import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set([".git", "artifacts", "coverage", "node_modules"]);
const textExtensions = new Set([".js", ".json", ".md", ".mjs", ".ts", ".yml", ".yaml"]);

async function publicTextFiles(directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await publicTextFiles(full));
    else if (textExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

test("public repository text contains no personal absolute paths", async () => {
  const forbidden = [
    /\/home\/[A-Za-z0-9._-]+\//,
    /\/Users\/[A-Za-z0-9._-]+\//,
    /[A-Za-z]:\\Users\\[^\\]+\\/,
    /\/opt\/google\/chrome\/chrome/
  ];
  for (const file of await publicTextFiles()) {
    const content = await readFile(file, "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(content, pattern, path.relative(root, file));
  }
});

test("live browser scripts require explicit opt-in", async () => {
  for (const relative of ["scripts/verify-gui.mjs", "scripts/verify-history-performance.mjs"]) {
    const content = await readFile(path.join(root, relative), "utf8");
    assert.match(content, /DSH_E2E_ALLOW_LIVE/);
    assert.match(content, /DSH_E2E_BROWSER_PATH/);
    assert.doesNotMatch(content, /const BASE_URL = "http:/);
  }
});

test("package metadata identifies an alpha and excludes test fixtures", async () => {
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.match(pkg.version, /-alpha\./);
  assert.equal(pkg.engines.node, ">=20");
  assert.ok(pkg.files.includes("dist"));
  assert.equal(pkg.files.includes("src"), false);
  assert.ok(pkg.files.includes("docs"));
  assert.equal(pkg.files.includes("test"), false);
  assert.equal(pkg.files.includes("scripts"), false);
  assert.equal(pkg.files.includes("source"), false);
  assert.ok(pkg.dsh.client.inject.includes("@deepseek-ai/dsh-client-locale"));
  assert.equal(pkg.dsh.client.inject.includes("@deepseek-ai/dsh-client-ui-theme"), false);
});
