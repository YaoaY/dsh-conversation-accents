import { type AccentPalette, type BuiltinPresetId, type HexColor, type SemanticColors } from "./palettes.js";
export declare const MAX_CUSTOM_PALETTES: 24;
export declare const MAX_PRESET_NAME_LENGTH: 40;
export declare const CUSTOM_PRESET_ID_PATTERN: RegExp;
export declare const HEX_COLOR_PATTERN: RegExp;
export type CustomPresetId = `custom-${string}`;
export type PresetId = BuiltinPresetId | CustomPresetId;
export interface CustomPalette extends AccentPalette {
    id: CustomPresetId;
    name: string;
}
export interface ConversationAccentSettings {
    colorsEnabled: boolean;
    activePreset: PresetId;
    customPalettes: CustomPalette[];
}
export interface PaletteImportPayload {
    version: 1;
    customPalettes: CustomPalette[];
}
export declare const DEFAULT_SETTINGS: Readonly<ConversationAccentSettings>;
export declare function isHexColor(value: unknown): value is `#${string}`;
export declare function normalizeHexColor(value: string): HexColor;
export declare function validateSemanticColors(value: unknown, path?: string): SemanticColors;
export declare function validateCustomPalette(value: unknown, path?: string): CustomPalette;
export declare function validateSettingsDocument(value: unknown): ConversationAccentSettings;
export declare function cloneSettings(value: ConversationAccentSettings): ConversationAccentSettings;
export declare function resolvePalette(settings: ConversationAccentSettings, id?: PresetId): AccentPalette | null;
export declare function createCustomPalette(settings: ConversationAccentSettings, source?: AccentPalette | null, options?: {
    id?: string;
    name?: string;
}): {
    settings: ConversationAccentSettings;
    custom: CustomPalette;
};
export declare function saveCustomPalette(settings: ConversationAccentSettings, palette: CustomPalette): ConversationAccentSettings;
export declare function deleteCustomPalette(settings: ConversationAccentSettings, id: string): ConversationAccentSettings;
export declare function setColorsEnabled(settings: ConversationAccentSettings, colorsEnabled: boolean): ConversationAccentSettings;
export declare function selectPreset(settings: ConversationAccentSettings, id: PresetId): ConversationAccentSettings;
export declare function parseImportPayload(value: unknown): PaletteImportPayload;
export declare function mergeImportedPalettes(settings: ConversationAccentSettings, payload: unknown): ConversationAccentSettings;
export declare function exportCustomPalettes(settings: ConversationAccentSettings): PaletteImportPayload;
export declare function contrastRatio(foreground: string, background: string): number;
