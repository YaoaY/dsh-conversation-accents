import type { ConversationAccentsConfig, ConversationAccentSettings, HostPluginContext } from "../dist/index.js";
import { apply } from "../dist/index.js";
import { BUILTIN_PALETTE_IDS } from "../dist/palettes.js";
import { DEFAULT_SETTINGS, createCustomPalette, selectPreset } from "../dist/model.js";

const config: ConversationAccentsConfig = { defaultPreset: "nord" };
const settings: ConversationAccentSettings = DEFAULT_SETTINGS;
const selected = selectPreset(settings, BUILTIN_PALETTE_IDS[1]!);
const custom = createCustomPalette(selected, null, { name: "Typed" });
const context = null as unknown as HostPluginContext;

apply(context, config);
custom.settings.customPalettes satisfies ConversationAccentSettings["customPalettes"];
