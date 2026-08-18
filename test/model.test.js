import test from "node:test";
import assert from "node:assert/strict";

import {
  BUILTIN_PALETTE_IDS,
  BUILTIN_PALETTES,
  SEMANTIC_FIELDS
} from "../dist/palettes.js";
import {
  DEFAULT_SETTINGS,
  createCustomPalette,
  deleteCustomPalette,
  isHexColor,
  mergeImportedPalettes,
  saveCustomPalette,
  selectPreset,
  setColorsEnabled,
  validateSettingsDocument
} from "../dist/model.js";
import { SettingsSchema } from "../dist/schema.js";

test("every built-in preset has complete light and dark semantic colors", () => {
  assert.deepEqual(BUILTIN_PALETTE_IDS, [
    "native",
    "github-markdown",
    "catppuccin-mocha",
    "dracula",
    "nord",
    "tokyo-night",
    "gruvbox"
  ]);
  assert.equal(BUILTIN_PALETTES.native, null);
  for (const id of BUILTIN_PALETTE_IDS.filter((value) => value !== "native")) {
    const preset = BUILTIN_PALETTES[id];
    for (const mode of ["light", "dark"]) {
      assert.deepEqual(Object.keys(preset[mode]), [...SEMANTIC_FIELDS], `${id}.${mode}`);
      for (const field of SEMANTIC_FIELDS) {
        assert.match(preset[mode][field], /^#[0-9A-F]{6}$/, `${id}.${mode}.${field}`);
      }
      assert.equal(preset[mode].strong, preset[mode].heading, `${id}.${mode}.strong must use the blue heading accent`);
      assert.equal(preset[mode].inlineCodeText, preset[mode].emphasis, `${id}.${mode}.inlineCodeText must use the purple emphasis accent`);
    }
  }
});

test("color validation accepts only #RRGGBB", () => {
  assert.equal(isHexColor("#12ABef"), true);
  for (const value of ["red", "#fff", "#12345678", "rgb(1,2,3)", "var(--x)", "#GG0000", "#12345;"]) {
    assert.equal(isHexColor(value), false, value);
  }
});

test("legacy settings enable colors and every mutation preserves disabled", () => {
  const legacy = { activePreset: "native", customPalettes: [] };
  assert.deepEqual(validateSettingsDocument(legacy), DEFAULT_SETTINGS);
  assert.deepEqual(SettingsSchema(legacy), DEFAULT_SETTINGS);

  const disabled = setColorsEnabled(DEFAULT_SETTINGS, false);
  assert.equal(disabled.colorsEnabled, false);
  const created = createCustomPalette(disabled, BUILTIN_PALETTES.nord, { id: "custom-disabled", name: "Disabled" });
  assert.equal(created.settings.colorsEnabled, false);
  assert.equal(saveCustomPalette(created.settings, created.custom).colorsEnabled, false);
  assert.equal(selectPreset(created.settings, "nord").colorsEnabled, false);
  assert.equal(mergeImportedPalettes(disabled, { version: 1, customPalettes: [created.custom] }).colorsEnabled, false);
  assert.equal(deleteCustomPalette(created.settings, created.custom.id).colorsEnabled, false);
  assert.throws(() => validateSettingsDocument({ ...legacy, colorsEnabled: "yes" }));
  assert.throws(() => validateSettingsDocument({ ...legacy, css: "body{}" }));
});

test("custom presets can be created, edited, selected, and deleted", () => {
  const created = createCustomPalette(DEFAULT_SETTINGS, BUILTIN_PALETTES.nord, {
    id: "custom-work",
    name: "Work"
  });
  assert.equal(created.settings.activePreset, "custom-work");
  assert.equal(created.settings.customPalettes.length, 1);
  assert.equal(created.custom.dark.codeKeyword, BUILTIN_PALETTES.nord.dark.codeKeyword);

  const edited = saveCustomPalette(created.settings, {
    ...created.custom,
    name: "Work edited",
    dark: { ...created.custom.dark, strong: "#ABCDEF" }
  });
  assert.equal(edited.customPalettes[0].name, "Work edited");
  assert.equal(edited.customPalettes[0].dark.strong, "#ABCDEF");

  const removed = deleteCustomPalette(edited, "custom-work");
  assert.deepEqual(removed, { colorsEnabled: true, activePreset: "native", customPalettes: [] });
});

test("Host schema and cross-field validation enforce complete settings", () => {
  const created = createCustomPalette(DEFAULT_SETTINGS, BUILTIN_PALETTES.dracula, {
    id: "custom-schema",
    name: "Schema"
  }).settings;
  assert.deepEqual(validateSettingsDocument(SettingsSchema(created)), created);
  assert.throws(() => validateSettingsDocument({ activePreset: "custom-missing", customPalettes: [] }));
  assert.throws(() => SettingsSchema({ activePreset: "native", customPalettes: [{ id: "custom-bad" }] }));
});

test("imports reject CSS, extra fields, invalid colors, and incomplete palettes", () => {
  const created = createCustomPalette(DEFAULT_SETTINGS, BUILTIN_PALETTES["github-markdown"], {
    id: "custom-import",
    name: "Import"
  }).custom;
  const good = mergeImportedPalettes(DEFAULT_SETTINGS, { version: 1, customPalettes: [created] });
  assert.equal(good.customPalettes[0].id, "custom-import");

  assert.throws(() => mergeImportedPalettes(DEFAULT_SETTINGS, {
    version: 1,
    customPalettes: [{ ...created, css: ":root{color:red}" }]
  }));
  assert.throws(() => mergeImportedPalettes(DEFAULT_SETTINGS, {
    version: 1,
    customPalettes: [{ ...created, light: { ...created.light, strong: "var(--bad)" } }]
  }));
  const { codeKeyword, ...incomplete } = created.dark;
  assert.ok(codeKeyword);
  assert.throws(() => mergeImportedPalettes(DEFAULT_SETTINGS, {
    version: 1,
    customPalettes: [{ ...created, dark: incomplete }]
  }));
  assert.throws(() => mergeImportedPalettes(DEFAULT_SETTINGS, {
    version: 1,
    css: "body{}",
    customPalettes: []
  }));
});
