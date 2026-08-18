import z from "@deepseek-ai/schemastery";

import {
  BUILTIN_PALETTE_IDS,
  SEMANTIC_FIELDS
} from "./palettes.js";
import {
  CUSTOM_PRESET_ID_PATTERN,
  HEX_COLOR_PATTERN,
  MAX_CUSTOM_PALETTES,
  MAX_PRESET_NAME_LENGTH,
  validateSettingsDocument
} from "./model.js";

const ColorSchema = z.string().pattern(HEX_COLOR_PATTERN).required();
const SemanticColorsSchema = z.object(Object.fromEntries(SEMANTIC_FIELDS.map((field) => [field, ColorSchema]))).required();
const builtInPresetPattern = BUILTIN_PALETTE_IDS
  .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const customPresetPattern = CUSTOM_PRESET_ID_PATTERN.source.replace(/^\^|\$$/g, "");
const ActivePresetPattern = new RegExp(`^(?:${builtInPresetPattern}|${customPresetPattern})$`);

export const CustomPaletteSchema = z.object({
  id: z.string().pattern(CUSTOM_PRESET_ID_PATTERN).required(),
  name: z.string().min(1).max(MAX_PRESET_NAME_LENGTH).required(),
  light: SemanticColorsSchema,
  dark: SemanticColorsSchema
}).required();

export const SettingsSchema = z.object({
  colorsEnabled: z.boolean().default(true),
  activePreset: z.string().pattern(ActivePresetPattern).default("native"),
  customPalettes: z.array(CustomPaletteSchema).max(MAX_CUSTOM_PALETTES).default([])
});

export const Config = z.object({
  defaultPreset: z.union([...BUILTIN_PALETTE_IDS]).default("native")
});

export function validateResolvedSettings(value: unknown): void {
  validateSettingsDocument(value);
}
