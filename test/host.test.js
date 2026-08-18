import test from "node:test";
import assert from "node:assert/strict";

import { apply, SETTINGS_ENDPOINT, SETTINGS_NAMESPACE } from "../dist/index.js";
import { BUILTIN_PALETTES } from "../dist/palettes.js";
import { createCustomPalette, DEFAULT_SETTINGS } from "../dist/model.js";

function responseStub() {
  return {
    status: 0,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    writeHead(status, headers = {}) {
      this.status = status;
      for (const [name, value] of Object.entries(headers)) this.headers[name.toLowerCase()] = value;
    },
    end(body) { this.body = body === undefined ? "" : String(body); }
  };
}

function request({ method = "GET", address = "127.0.0.1", origin = "http://127.0.0.1:3080", body = "" } = {}) {
  return {
    method,
    headers: {
      host: "127.0.0.1:3080",
      origin,
      ...(method === "POST" ? { "content-type": "application/json" } : {})
    },
    socket: { remoteAddress: address },
    async *[Symbol.asyncIterator]() {
      if (body !== "") yield Buffer.from(body);
    }
  };
}

function pluginHarness({ replaceError = null } = {}) {
  let route;
  let current;
  const writes = [];
  const errors = [];
  const settings = {
    register(namespace, schema, options) {
      assert.equal(namespace, SETTINGS_NAMESPACE);
      current = schema(options.base);
      options.validate(current);
      return {
        get: () => current,
        async replace(next) {
          if (replaceError !== null) throw replaceError;
          current = schema(next);
          options.validate(current);
          writes.push(current);
        }
      };
    }
  };
  const webServer = {
    register(next) {
      route = next;
      return () => {};
    }
  };
  const pluginCtx = {
    settings,
    webServer,
    logger: { error: (error) => errors.push(error) },
    effect(factory) { return factory(); }
  };
  const ctx = {
    inject(_services, callback) { callback(pluginCtx); },
    logger: { info() {} }
  };
  apply(ctx, { defaultPreset: "native" });
  return { getRoute: () => route, getCurrent: () => current, writes, errors };
}

test("Host registers its own settings namespace and loopback route", () => {
  const harness = pluginHarness();
  assert.equal(harness.getRoute().kind, "exact");
  assert.equal(harness.getRoute().path, SETTINGS_ENDPOINT);
  assert.deepEqual(harness.getCurrent(), DEFAULT_SETTINGS);
});

test("Host route persists validated structured settings", async () => {
  const harness = pluginHarness();
  const created = createCustomPalette(DEFAULT_SETTINGS, BUILTIN_PALETTES.gruvbox, {
    id: "custom-host",
    name: "Host"
  }).settings;
  const res = responseStub();
  await harness.getRoute().handler(request({ method: "POST", body: JSON.stringify({ value: created }) }), res);
  assert.equal(res.status, 200);
  assert.deepEqual(harness.getCurrent(), created);
  assert.equal(harness.writes.length, 1);
});

test("Host route migrates legacy settings and persists disabled", async () => {
  const harness = pluginHarness();
  const legacy = responseStub();
  await harness.getRoute().handler(request({ method: "POST", body: JSON.stringify({ value: { activePreset: "dracula", customPalettes: [] } }) }), legacy);
  assert.equal(legacy.status, 200);
  assert.deepEqual(JSON.parse(legacy.body).value, { colorsEnabled: true, activePreset: "dracula", customPalettes: [] });

  const disabled = responseStub();
  await harness.getRoute().handler(request({ method: "POST", body: JSON.stringify({ value: { colorsEnabled: false, activePreset: "dracula", customPalettes: [] } }) }), disabled);
  assert.equal(disabled.status, 200);
  assert.equal(JSON.parse(disabled.body).value.colorsEnabled, false);
});

test("Host route rejects remote writes and arbitrary CSS payloads", async () => {
  const harness = pluginHarness();
  const remote = responseStub();
  await harness.getRoute().handler(request({ method: "POST", address: "192.168.1.50", body: JSON.stringify({ value: DEFAULT_SETTINGS }) }), remote);
  assert.equal(remote.status, 403);

  const invalid = responseStub();
  await harness.getRoute().handler(request({ method: "POST", body: JSON.stringify({ value: { ...DEFAULT_SETTINGS, css: "body{}" } }) }), invalid);
  assert.equal(invalid.status, 400);
  assert.equal(harness.writes.length, 0);
});

test("Host route reports persistence failures as internal errors", async () => {
  const failure = new Error("disk unavailable");
  const harness = pluginHarness({ replaceError: failure });
  const res = responseStub();

  await harness.getRoute().handler(request({
    method: "POST",
    body: JSON.stringify({ value: DEFAULT_SETTINGS })
  }), res);

  assert.equal(res.status, 500);
  assert.deepEqual(JSON.parse(res.body), { error: "settings-persistence-failed" });
  assert.deepEqual(harness.errors, [failure]);
  assert.equal(harness.writes.length, 0);
});
