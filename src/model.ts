import {
  BUILTIN_PALETTE_IDS,
  BUILTIN_PALETTES,
  SEMANTIC_FIELDS,
  type AccentPalette,
  type BuiltinPresetId,
  type HexColor,
  type SemanticColors,
  type SemanticField
} from "./palettes.js";

export const MAX_CUSTOM_PALETTES = 24 as const;
export const MAX_PRESET_NAME_LENGTH = 40 as const;
export const CUSTOM_PRESET_ID_PATTERN = /^custom-[a-z0-9][a-z0-9-]{0,47}$/;
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

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

export const DEFAULT_SETTINGS: Readonly<ConversationAccentSettings> = Object.freeze({
  colorsEnabled: true,
  activePreset: "native",
  customPalettes: Object.freeze([]) as unknown as CustomPalette[]
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) return true;
  return Object.prototype.toString.call(value) === "[object Object]"
    && prototype.constructor?.name === "Object";
}

function assertExactKeys(value: unknown, keys: readonly string[], path: string): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) throw new TypeError(`${path} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${path} contains unsupported or missing fields`);
  }
}

export function isHexColor(value: unknown): value is `#${string}` {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function normalizeHexColor(value: string): HexColor {
  if (!isHexColor(value)) throw new TypeError("color must match #RRGGBB");
  return value.toUpperCase() as HexColor;
}

export function validateSemanticColors(value: unknown, path = "palette"): SemanticColors {
  assertExactKeys(value, SEMANTIC_FIELDS, path);
  const result = {} as Record<SemanticField, HexColor>;
  for (const field of SEMANTIC_FIELDS) {
    const color = value[field];
    if (!isHexColor(color)) throw new TypeError(`${path}.${field} must match #RRGGBB`);
    result[field] = color.toUpperCase() as HexColor;
  }
  return result as SemanticColors;
}

const CUSTOM_KEYS = ["id", "name", "light", "dark"] as const;

export function validateCustomPalette(value: unknown, path = "customPalette"): CustomPalette {
  assertExactKeys(value, CUSTOM_KEYS, path);
  if (typeof value.id !== "string" || !CUSTOM_PRESET_ID_PATTERN.test(value.id)) {
    throw new TypeError(`${path}.id is invalid`);
  }
  if (BUILTIN_PALETTE_IDS.some((id) => id === value.id)) {
    throw new TypeError(`${path}.id conflicts with a built-in preset`);
  }
  if (typeof value.name !== "string") throw new TypeError(`${path}.name must be a string`);
  const name = value.name.trim();
  if (name.length === 0 || name.length > MAX_PRESET_NAME_LENGTH || /[\u0000-\u001F\u007F]/.test(name)) {
    throw new TypeError(`${path}.name must contain 1-${MAX_PRESET_NAME_LENGTH} printable characters`);
  }
  return {
    id: value.id as CustomPresetId,
    name,
    light: validateSemanticColors(value.light, `${path}.light`),
    dark: validateSemanticColors(value.dark, `${path}.dark`)
  };
}

const SETTINGS_KEYS = ["colorsEnabled", "activePreset", "customPalettes"] as const;
const LEGACY_SETTINGS_KEYS = ["activePreset", "customPalettes"] as const;

export function validateSettingsDocument(value: unknown): ConversationAccentSettings {
  const keys = isPlainObject(value) && Object.hasOwn(value, "colorsEnabled") ? SETTINGS_KEYS : LEGACY_SETTINGS_KEYS;
  assertExactKeys(value, keys, "settings");
  const colorsEnabled = Object.hasOwn(value, "colorsEnabled") ? value.colorsEnabled : true;
  if (typeof colorsEnabled !== "boolean") throw new TypeError("settings.colorsEnabled must be a boolean");
  if (typeof value.activePreset !== "string") throw new TypeError("settings.activePreset must be a string");
  if (!Array.isArray(value.customPalettes)) throw new TypeError("settings.customPalettes must be an array");
  if (value.customPalettes.length > MAX_CUSTOM_PALETTES) {
    throw new TypeError(`settings.customPalettes cannot exceed ${MAX_CUSTOM_PALETTES}`);
  }
  const customPalettes = value.customPalettes.map((entry, index) => validateCustomPalette(entry, `settings.customPalettes[${index}]`));
  const ids = new Set<CustomPresetId>();
  for (const custom of customPalettes) {
    if (ids.has(custom.id)) throw new TypeError(`duplicate custom preset id: ${custom.id}`);
    ids.add(custom.id);
  }
  const activePreset = value.activePreset as PresetId;
  if (!BUILTIN_PALETTE_IDS.some((id) => id === activePreset) && !ids.has(activePreset as CustomPresetId)) {
    throw new TypeError("settings.activePreset does not reference a known preset");
  }
  return { colorsEnabled, activePreset, customPalettes };
}

export function cloneSettings(value: ConversationAccentSettings): ConversationAccentSettings {
  return validateSettingsDocument(JSON.parse(JSON.stringify(value)) as unknown);
}

function updateSettings(current: ConversationAccentSettings, patch: Partial<ConversationAccentSettings>): ConversationAccentSettings {
  return validateSettingsDocument({ ...current, ...patch });
}

export function resolvePalette(settings: ConversationAccentSettings, id: PresetId = settings.activePreset): AccentPalette | null {
  if (BUILTIN_PALETTE_IDS.some((presetId) => presetId === id)) {
    return BUILTIN_PALETTES[id as BuiltinPresetId];
  }
  const custom = settings.customPalettes.find((entry) => entry.id === id);
  return custom === undefined ? null : { light: custom.light, dark: custom.dark };
}

function generatedId(): CustomPresetId {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `custom-${time}-${random}`.slice(0, 55) as CustomPresetId;
}

export function createCustomPalette(
  settings: ConversationAccentSettings,
  source?: AccentPalette | null,
  options: { id?: string; name?: string } = {}
): { settings: ConversationAccentSettings; custom: CustomPalette } {
  const current = validateSettingsDocument(settings);
  if (current.customPalettes.length >= MAX_CUSTOM_PALETTES) {
    throw new TypeError(`custom preset limit is ${MAX_CUSTOM_PALETTES}`);
  }
  const fallback = BUILTIN_PALETTES["github-markdown"];
  const sourcePalette = source ?? resolvePalette(current) ?? fallback;
  if (sourcePalette === null) throw new TypeError("a source palette is required");
  let id = (options.id ?? generatedId()) as CustomPresetId;
  while (current.customPalettes.some((entry) => entry.id === id)) id = generatedId();
  const custom = validateCustomPalette({
    id,
    name: options.name ?? `Custom ${current.customPalettes.length + 1}`,
    light: sourcePalette.light,
    dark: sourcePalette.dark
  });
  return {
    settings: updateSettings(current, {
      activePreset: custom.id,
      customPalettes: [...current.customPalettes, custom]
    }),
    custom
  };
}

export function saveCustomPalette(settings: ConversationAccentSettings, palette: CustomPalette): ConversationAccentSettings {
  const current = validateSettingsDocument(settings);
  const custom = validateCustomPalette(palette);
  const index = current.customPalettes.findIndex((entry) => entry.id === custom.id);
  if (index === -1) throw new TypeError(`unknown custom preset: ${custom.id}`);
  const customPalettes = [...current.customPalettes];
  customPalettes[index] = custom;
  return updateSettings(current, { customPalettes });
}

export function deleteCustomPalette(settings: ConversationAccentSettings, id: string): ConversationAccentSettings {
  const current = validateSettingsDocument(settings);
  const customPalettes = current.customPalettes.filter((entry) => entry.id !== id);
  if (customPalettes.length === current.customPalettes.length) throw new TypeError(`unknown custom preset: ${id}`);
  return updateSettings(current, {
    activePreset: current.activePreset === id ? "native" : current.activePreset,
    customPalettes
  });
}

export function setColorsEnabled(settings: ConversationAccentSettings, colorsEnabled: boolean): ConversationAccentSettings {
  const current = validateSettingsDocument(settings);
  return updateSettings(current, { colorsEnabled });
}

export function selectPreset(settings: ConversationAccentSettings, id: PresetId): ConversationAccentSettings {
  const current = validateSettingsDocument(settings);
  return updateSettings(current, { activePreset: id });
}

const IMPORT_KEYS = ["version", "customPalettes"] as const;

export function parseImportPayload(value: unknown): PaletteImportPayload {
  assertExactKeys(value, IMPORT_KEYS, "import");
  if (value.version !== 1) throw new TypeError("import.version must be 1");
  if (!Array.isArray(value.customPalettes)) throw new TypeError("import.customPalettes must be an array");
  if (value.customPalettes.length > MAX_CUSTOM_PALETTES) throw new TypeError(`import cannot exceed ${MAX_CUSTOM_PALETTES} presets`);
  const customPalettes = value.customPalettes.map((entry, index) => validateCustomPalette(entry, `import.customPalettes[${index}]`));
  const ids = new Set<CustomPresetId>();
  for (const custom of customPalettes) {
    if (ids.has(custom.id)) throw new TypeError(`duplicate imported preset id: ${custom.id}`);
    ids.add(custom.id);
  }
  return { version: 1, customPalettes };
}

export function mergeImportedPalettes(settings: ConversationAccentSettings, payload: unknown): ConversationAccentSettings {
  const current = validateSettingsDocument(settings);
  const imported = parseImportPayload(payload).customPalettes;
  const byId = new Map<CustomPresetId, CustomPalette>(current.customPalettes.map((entry) => [entry.id, entry]));
  for (const custom of imported) byId.set(custom.id, custom);
  const customPalettes = [...byId.values()];
  if (customPalettes.length > MAX_CUSTOM_PALETTES) throw new TypeError(`custom preset limit is ${MAX_CUSTOM_PALETTES}`);
  return updateSettings(current, { customPalettes });
}

export function exportCustomPalettes(settings: ConversationAccentSettings): PaletteImportPayload {
  const current = validateSettingsDocument(settings);
  return { version: 1, customPalettes: current.customPalettes };
}

function luminanceChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const parse = (color: string): number[] => {
    const normalized = normalizeHexColor(color);
    return [1, 3, 5].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  };
  const relative = (rgb: number[]): number => 0.2126 * luminanceChannel(rgb[0]!) + 0.7152 * luminanceChannel(rgb[1]!) + 0.0722 * luminanceChannel(rgb[2]!);
  const first = relative(parse(foreground));
  const second = relative(parse(background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
