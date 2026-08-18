import { Config, SettingsSchema, validateResolvedSettings } from "./schema.js";
import {
  validateSettingsDocument
} from "./model.js";
import { Config as Config2, SettingsSchema as SettingsSchema2 } from "./schema.js";
const name = "conversation-accents";
const SETTINGS_NAMESPACE = "conversation-accents";
const SETTINGS_ENDPOINT = "/plugins/dsh-conversation-accents/settings";
const MAX_BODY_BYTES = 128 * 1024;
function statusError(message, status) {
  const error = new TypeError(message);
  error.status = status;
  return error;
}
function isLoopbackAddress(address) {
  if (typeof address !== "string") return false;
  return address === "127.0.0.1" || address === "::1" || address.startsWith("::ffff:127.");
}
function sameOriginRequest(req) {
  const origin = req.headers.origin;
  if (origin === void 0) return true;
  const host = req.headers.host;
  if (typeof host !== "string") return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
  } catch {
    return false;
  }
}
function sendJson(res, status, payload, head = false) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": Buffer.byteLength(body)
  });
  res.end(head ? void 0 : body);
}
async function readJson(req) {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw statusError("content-type must be application/json", 415);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw statusError("request body is too large", 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw statusError("request body must be valid JSON", 400);
  }
}
function assertWriteEnvelope(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("request body must be an object");
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "value") throw new TypeError("request body must contain only value");
  return validateSettingsDocument(value.value);
}
function registerSettingsRoute(ctx, scope) {
  return ctx.webServer.register({
    kind: "exact",
    path: SETTINGS_ENDPOINT,
    async handler(req, res) {
      const head = req.method === "HEAD";
      if (!isLoopbackAddress(req.socket.remoteAddress)) {
        sendJson(res, 403, { error: "loopback-only" }, head);
        return;
      }
      if (!sameOriginRequest(req)) {
        sendJson(res, 403, { error: "origin-mismatch" }, head);
        return;
      }
      if (req.method === "GET" || head) {
        sendJson(res, 200, { value: scope.get() }, head);
        return;
      }
      if (req.method !== "POST") {
        res.setHeader("allow", "GET, HEAD, POST");
        sendJson(res, 405, { error: "method-not-allowed" });
        return;
      }
      let next;
      try {
        next = assertWriteEnvelope(await readJson(req));
      } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 400;
        sendJson(res, status, { error: error instanceof Error ? error.message : "invalid-settings" });
        return;
      }
      try {
        await scope.replace(next);
        sendJson(res, 200, { value: scope.get() });
      } catch (error) {
        ctx.logger?.error?.(error);
        sendJson(res, 500, { error: "settings-persistence-failed" });
      }
    }
  });
}
function apply(ctx, config = {}) {
  const resolvedConfig = Config(config);
  ctx.inject(["settings", "webServer"], (pluginCtx) => {
    const scope = pluginCtx.settings.register(SETTINGS_NAMESPACE, SettingsSchema, {
      base: {
        colorsEnabled: true,
        activePreset: resolvedConfig.defaultPreset,
        customPalettes: []
      },
      applies: "live",
      validate: validateResolvedSettings
    });
    pluginCtx.effect(
      () => registerSettingsRoute(pluginCtx, scope),
      "conversation-accents: loopback settings route"
    );
  });
  ctx.logger.info(`conversation-accents: ready (default: ${resolvedConfig.defaultPreset})`);
}
export {
  Config2 as Config,
  SETTINGS_ENDPOINT,
  SETTINGS_NAMESPACE,
  SettingsSchema2 as SettingsSchema,
  apply,
  name
};
