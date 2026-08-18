import type { IncomingMessage, ServerResponse } from "node:http";
import type { BuiltinPresetId } from "./palettes.js";
export { Config, SettingsSchema } from "./schema.js";
export type { ConversationAccentSettings, CustomPalette, PresetId } from "./model.js";
export declare const name: "conversation-accents";
export declare const SETTINGS_NAMESPACE: "conversation-accents";
export declare const SETTINGS_ENDPOINT: "/plugins/dsh-conversation-accents/settings";
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
export declare function apply(ctx: HostPluginContext, config?: ConversationAccentsConfig): void;
