import {
  BUILTIN_PALETTE_IDS,
  BUILTIN_PALETTES,
  SEMANTIC_FIELDS
} from "./palettes.js";
const MAX_CUSTOM_PALETTES = 24;
const MAX_PRESET_NAME_LENGTH = 40;
const CUSTOM_PRESET_ID_PATTERN = /^custom-[a-z0-9][a-z0-9-]{0,47}$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_SETTINGS = Object.freeze({
  colorsEnabled: true,
  activePreset: "native",
  customPalettes: Object.freeze([])
});
function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) return true;
  return Object.prototype.toString.call(value) === "[object Object]" && prototype.constructor?.name === "Object";
}
function assertExactKeys(value, keys, path) {
  if (!isPlainObject(value)) throw new TypeError(`${path} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${path} contains unsupported or missing fields`);
  }
}
function isHexColor(value) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}
function normalizeHexColor(value) {
  if (!isHexColor(value)) throw new TypeError("color must match #RRGGBB");
  return value.toUpperCase();
}
function validateSemanticColors(value, path = "palette") {
  assertExactKeys(value, SEMANTIC_FIELDS, path);
  const result = {};
  for (const field of SEMANTIC_FIELDS) {
    const color = value[field];
    if (!isHexColor(color)) throw new TypeError(`${path}.${field} must match #RRGGBB`);
    result[field] = color.toUpperCase();
  }
  return result;
}
const CUSTOM_KEYS = ["id", "name", "light", "dark"];
function validateCustomPalette(value, path = "customPalette") {
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
    id: value.id,
    name,
    light: validateSemanticColors(value.light, `${path}.light`),
    dark: validateSemanticColors(value.dark, `${path}.dark`)
  };
}
const SETTINGS_KEYS = ["colorsEnabled", "activePreset", "customPalettes"];
const LEGACY_SETTINGS_KEYS = ["activePreset", "customPalettes"];
function validateSettingsDocument(value) {
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
  const ids = /* @__PURE__ */ new Set();
  for (const custom of customPalettes) {
    if (ids.has(custom.id)) throw new TypeError(`duplicate custom preset id: ${custom.id}`);
    ids.add(custom.id);
  }
  const activePreset = value.activePreset;
  if (!BUILTIN_PALETTE_IDS.some((id) => id === activePreset) && !ids.has(activePreset)) {
    throw new TypeError("settings.activePreset does not reference a known preset");
  }
  return { colorsEnabled, activePreset, customPalettes };
}
function cloneSettings(value) {
  return validateSettingsDocument(JSON.parse(JSON.stringify(value)));
}
function updateSettings(current, patch) {
  return validateSettingsDocument({ ...current, ...patch });
}
function resolvePalette(settings, id = settings.activePreset) {
  if (BUILTIN_PALETTE_IDS.some((presetId) => presetId === id)) {
    return BUILTIN_PALETTES[id];
  }
  const custom = settings.customPalettes.find((entry) => entry.id === id);
  return custom === void 0 ? null : { light: custom.light, dark: custom.dark };
}
function generatedId() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `custom-${time}-${random}`.slice(0, 55);
}
function createCustomPalette(settings, source, options = {}) {
  const current = validateSettingsDocument(settings);
  if (current.customPalettes.length >= MAX_CUSTOM_PALETTES) {
    throw new TypeError(`custom preset limit is ${MAX_CUSTOM_PALETTES}`);
  }
  const fallback = BUILTIN_PALETTES["github-markdown"];
  const sourcePalette = source ?? resolvePalette(current) ?? fallback;
  if (sourcePalette === null) throw new TypeError("a source palette is required");
  let id = options.id ?? generatedId();
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
function saveCustomPalette(settings, palette) {
  const current = validateSettingsDocument(settings);
  const custom = validateCustomPalette(palette);
  const index = current.customPalettes.findIndex((entry) => entry.id === custom.id);
  if (index === -1) throw new TypeError(`unknown custom preset: ${custom.id}`);
  const customPalettes = [...current.customPalettes];
  customPalettes[index] = custom;
  return updateSettings(current, { customPalettes });
}
function deleteCustomPalette(settings, id) {
  const current = validateSettingsDocument(settings);
  const customPalettes = current.customPalettes.filter((entry) => entry.id !== id);
  if (customPalettes.length === current.customPalettes.length) throw new TypeError(`unknown custom preset: ${id}`);
  return updateSettings(current, {
    activePreset: current.activePreset === id ? "native" : current.activePreset,
    customPalettes
  });
}
function setColorsEnabled(settings, colorsEnabled) {
  const current = validateSettingsDocument(settings);
  return updateSettings(current, { colorsEnabled });
}
function selectPreset(settings, id) {
  const current = validateSettingsDocument(settings);
  return updateSettings(current, { activePreset: id });
}
const IMPORT_KEYS = ["version", "customPalettes"];
function parseImportPayload(value) {
  assertExactKeys(value, IMPORT_KEYS, "import");
  if (value.version !== 1) throw new TypeError("import.version must be 1");
  if (!Array.isArray(value.customPalettes)) throw new TypeError("import.customPalettes must be an array");
  if (value.customPalettes.length > MAX_CUSTOM_PALETTES) throw new TypeError(`import cannot exceed ${MAX_CUSTOM_PALETTES} presets`);
  const customPalettes = value.customPalettes.map((entry, index) => validateCustomPalette(entry, `import.customPalettes[${index}]`));
  const ids = /* @__PURE__ */ new Set();
  for (const custom of customPalettes) {
    if (ids.has(custom.id)) throw new TypeError(`duplicate imported preset id: ${custom.id}`);
    ids.add(custom.id);
  }
  return { version: 1, customPalettes };
}
function mergeImportedPalettes(settings, payload) {
  const current = validateSettingsDocument(settings);
  const imported = parseImportPayload(payload).customPalettes;
  const byId = new Map(current.customPalettes.map((entry) => [entry.id, entry]));
  for (const custom of imported) byId.set(custom.id, custom);
  const customPalettes = [...byId.values()];
  if (customPalettes.length > MAX_CUSTOM_PALETTES) throw new TypeError(`custom preset limit is ${MAX_CUSTOM_PALETTES}`);
  return updateSettings(current, { customPalettes });
}
function exportCustomPalettes(settings) {
  const current = validateSettingsDocument(settings);
  return { version: 1, customPalettes: current.customPalettes };
}
function luminanceChannel(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
function contrastRatio(foreground, background) {
  const parse = (color) => {
    const normalized = normalizeHexColor(color);
    return [1, 3, 5].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  };
  const relative = (rgb) => 0.2126 * luminanceChannel(rgb[0]) + 0.7152 * luminanceChannel(rgb[1]) + 0.0722 * luminanceChannel(rgb[2]);
  const first = relative(parse(foreground));
  const second = relative(parse(background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
export {
  CUSTOM_PRESET_ID_PATTERN,
  DEFAULT_SETTINGS,
  HEX_COLOR_PATTERN,
  MAX_CUSTOM_PALETTES,
  MAX_PRESET_NAME_LENGTH,
  cloneSettings,
  contrastRatio,
  createCustomPalette,
  deleteCustomPalette,
  exportCustomPalettes,
  isHexColor,
  mergeImportedPalettes,
  normalizeHexColor,
  parseImportPayload,
  resolvePalette,
  saveCustomPalette,
  selectPreset,
  setColorsEnabled,
  validateCustomPalette,
  validateSemanticColors,
  validateSettingsDocument
};
