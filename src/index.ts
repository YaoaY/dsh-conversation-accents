import type { IncomingMessage, ServerResponse } from "node:http";

import { Config, SettingsSchema, validateResolvedSettings } from "./schema.js";
import type { BuiltinPresetId } from "./palettes.js";
import {
  type ConversationAccentSettings,
  validateSettingsDocument
} from "./model.js";

export { Config, SettingsSchema } from "./schema.js";
export type {
  ConversationAccentSettings,
  CustomPalette,
  PresetId
} from "./model.js";

export const name = "conversation-accents" as const;
export const SETTINGS_NAMESPACE = "conversation-accents" as const;
export const SETTINGS_ENDPOINT = "/plugins/dsh-conversation-accents/settings" as const;

const MAX_BODY_BYTES = 128 * 1024;

export interface ConversationAccentsConfig {
  defaultPreset?: BuiltinPresetId;
}

export interface SettingsScope<T> {
  get(): T;
  replace(value: T): Promise<void>;
}

export interface SettingsService {
  register<T>(namespace: string, schema: unknown, options: {
    base: Partial<T>;
    applies: "live" | "restart";
    validate(value: T): void;
  }): SettingsScope<T>;
}

export interface WebServerService {
  register(route: {
    kind: "exact" | "prefix";
    path: string;
    handler(request: IncomingMessage, response: ServerResponse): void | Promise<void>;
  }): () => void;
}

export interface HostPluginServices {
  settings: SettingsService;
  webServer: WebServerService;
  effect<T>(factory: () => T, name?: string): T;
  logger?: {
    error?(error: unknown): void;
  };
}

export interface HostPluginContext {
  inject(services: readonly string[], callback: (context: HostPluginServices) => void): void;
  logger: {
    info(message: string): void;
  };
}

interface StatusError extends TypeError {
  status?: number;
}

function statusError(message: string, status: number): StatusError {
  const error = new TypeError(message) as StatusError;
  error.status = status;
  return error;
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (typeof address !== "string") return false;
  return address === "127.0.0.1"
    || address === "::1"
    || address.startsWith("::ffff:127.");
}

function sameOriginRequest(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  const host = req.headers.host;
  if (typeof host !== "string") return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
  } catch {
    return false;
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown, head = false): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": Buffer.byteLength(body)
  });
  res.end(head ? undefined : body);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw statusError("content-type must be application/json", 415);
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw statusError("request body is too large", 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw statusError("request body must be valid JSON", 400);
  }
}

function assertWriteEnvelope(value: unknown): ConversationAccentSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("request body must be an object");
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "value") throw new TypeError("request body must contain only value");
  return validateSettingsDocument((value as { value: unknown }).value);
}

function registerSettingsRoute(ctx: HostPluginServices, scope: SettingsScope<ConversationAccentSettings>): () => void {
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

      let next: ConversationAccentSettings;
      try {
        next = assertWriteEnvelope(await readJson(req));
      } catch (error) {
        const status = Number.isInteger((error as StatusError)?.status) ? (error as StatusError).status! : 400;
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

export function apply(ctx: HostPluginContext, config: ConversationAccentsConfig = {}): void {
  const resolvedConfig = Config(config);
  ctx.inject(["settings", "webServer"], (pluginCtx) => {
    const scope = pluginCtx.settings.register<ConversationAccentSettings>(SETTINGS_NAMESPACE, SettingsSchema, {
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
