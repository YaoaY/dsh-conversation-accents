import type {
  AccentPalette,
  BuiltinPresetId,
  SemanticColors,
  SemanticField
} from "./palettes.js";
import type {
  ConversationAccentSettings,
  CustomPalette,
  PaletteImportPayload,
  PresetId
} from "./model.js";

import {
  MARKDOWN_ACCENT_STYLE_KIND,
  STYLE_PLUGIN,
  THINK_ACCENT_CSS,
  THINK_ACCENT_STYLE_KIND,
  THINK_MARKDOWN_CSS,
  THINK_MARKDOWN_STYLE_KIND,
  TOOL_ACCENT_CSS,
  TOOL_ACCENT_STYLE_KIND,
  buildAccentCss
} from "./accent-css.js";
import { LOCALE_NAMESPACE, en, zh } from "./locales.js";
import { createTrailingSaveQueue, withTimeout } from "./persistence.js";
import { installThinkMarkdown, renderThinkMarkdownHtml } from "./think-markdown.js";

import {
  BUILTIN_PALETTE_IDS,
  SEMANTIC_FIELDS
} from "./palettes.js";
import {
  DEFAULT_SETTINGS,
  MAX_CUSTOM_PALETTES,
  MAX_PRESET_NAME_LENGTH,
  cloneSettings,
  contrastRatio,
  createCustomPalette,
  deleteCustomPalette,
  exportCustomPalettes,
  isHexColor,
  mergeImportedPalettes,
  resolvePalette,
  saveCustomPalette,
  selectPreset,
  setColorsEnabled,
  validateCustomPalette,
  validateSemanticColors,
  validateSettingsDocument
} from "./model.js";

type PersistenceKind = "loading" | "memory" | "saving" | "host" | "error";
type Translate = (key: string) => string;
type SetState<T> = (value: T | ((current: T) => T)) => void;
type IconComponent = (props: { size?: number; className?: string }) => unknown;
type ModuleRequire = (specifier: string) => any;

type InputEvent<T extends HTMLInputElement | HTMLSelectElement = HTMLInputElement> = {
  target: T;
  preventDefault(): void;
};

interface ReactRuntime {
  createElement(...args: any[]): any;
  useEffect(effect: () => void | (() => void), dependencies: readonly unknown[]): void;
  useRef<T>(value: T): { current: T };
  useState<T>(value: T): [T, SetState<T>];
}

interface StoreState {
  settings: ConversationAccentSettings;
  persistence: PersistenceKind;
  error: string;
  revision: number;
}

interface StoreActions {
  sync(settings: ConversationAccentSettings, persistence: PersistenceKind, error: string, revision: number): void;
}

interface PaletteDraft {
  id: string;
  name: string;
  light: Record<SemanticField, string>;
  dark: Record<SemanticField, string>;
}

interface ConversationAccentsSectionProps {
  t: Translate;
  useStore<T>(selector: (state: StoreState) => T): T;
  setColorsEnabled(enabled: boolean): void;
  selectPreset(id: PresetId): void;
  createCustom(): void;
  previewCustom(custom: CustomPalette): void;
  cancelPreview(): void;
  saveCustom(custom: CustomPalette): void;
  deleteCustom(id: string): void;
  importCustom(payload: unknown): void;
  exportCustom(): PaletteImportPayload;
  retryHost(): void;
}

interface ClientContext {
  connection: { isLoopback: boolean };
  logger: { warn(error: unknown): void };
  effect<T>(factory: () => T, name: string): T;
  locale: {
    bind(namespace: string): Translate;
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void;
  };
  slots: {
    inject(name: string, callback: () => unknown): void;
    register(options: Record<string, any>, component: (props: ConversationAccentsSectionProps) => unknown): () => void;
  };
}

interface ClientPluginHandoff {
  id: string;
  factory(require: ModuleRequire): Record<string, unknown>;
}

declare global {
  interface Window {
    __ModuleLoader__: {
      load(handoff: ClientPluginHandoff): void;
    };
  }
}

window.__ModuleLoader__.load({
  id: "dsh-conversation-accents",
  factory: (require) => {
    const React = require("react") as ReactRuntime;
    const { defineStore } = require("@deepseek-ai/dsh-client-runtime/client") as {
      defineStore(declaration: Record<string, unknown>): unknown;
    };
    const {
      IconBrowseOutline16,
      IconCheckOutline16,
      IconDownloadOutline16,
      IconPlusOutline16,
      IconRefreshOutline16,
      IconTrashOutline16,
      IconWarningOutline16
    } = require("@deepseek-ai/dsh-client-ui-primitives") as Record<string, IconComponent>;

    const h = React.createElement;
    const SETTINGS_ENDPOINT = "/plugins/dsh-conversation-accents/settings";
    const HOST_REQUEST_TIMEOUT_MS = 5000;
    const LOCAL_STORAGE_KEY = "dsh-conversation-accents.settings.v1";
    const CHANNEL_NAME = "dsh-conversation-accents";

    const shared = {
      border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: "6px",
      boxSizing: "border-box",
      color: "var(--dsw-alias-label-primary)",
      background: "var(--dsw-alias-bg-layer-1)",
      font: "inherit"
    };

    function readLocalSettings(): ConversationAccentSettings {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw === null ? cloneSettings(DEFAULT_SETTINGS) : validateSettingsDocument(JSON.parse(raw));
      } catch {
        return cloneSettings(DEFAULT_SETTINGS);
      }
    }

    function writeLocalSettings(settings: ConversationAccentSettings): void {
      try {
        if (settings.colorsEnabled && settings.activePreset === "native" && settings.customPalettes.length === 0) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } else {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
        }
      } catch {
        // Locked-down browsers can reject storage; the in-memory state still applies.
      }
    }

    function parseHostEnvelope(body: unknown): ConversationAccentSettings {
      if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).join(",") !== "value") {
        throw new TypeError("Host settings response is invalid");
      }
      return validateSettingsDocument((body as { value: unknown }).value);
    }

    async function readHostSettings(): Promise<ConversationAccentSettings> {
      return withTimeout(async (signal) => {
        const response = await fetch(SETTINGS_ENDPOINT, {
          method: "GET",
          credentials: "same-origin",
          headers: { accept: "application/json" },
          ...(signal === undefined ? {} : { signal })
        });
        if (!response.ok) throw new Error(`Host settings read failed (${response.status})`);
        return parseHostEnvelope(await response.json());
      }, { timeoutMs: HOST_REQUEST_TIMEOUT_MS });
    }

    async function writeHostSettings(
      settings: ConversationAccentSettings,
      signal?: AbortSignal
    ): Promise<ConversationAccentSettings> {
      const response = await fetch(SETTINGS_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({ value: settings }),
        ...(signal === undefined ? {} : { signal })
      });
      if (!response.ok) throw new Error(`Host settings write failed (${response.status})`);
      return parseHostEnvelope(await response.json());
    }

    const store = defineStore({
      init: () => ({
        settings: cloneSettings(DEFAULT_SETTINGS),
        persistence: "loading",
        error: "",
        revision: 0
      }),
      actions: {
        sync: (
          draft: StoreState,
          settings: ConversationAccentSettings,
          persistence: PersistenceKind,
          error: string,
          revision: number
        ) => {
          draft.settings = cloneSettings(settings);
          draft.persistence = persistence;
          draft.error = error;
          draft.revision = revision;
        }
      }
    });

    function actionButtonStyle({ danger = false, disabled = false }: { danger?: boolean; disabled?: boolean } = {}) {
      return {
        ...shared,
        alignItems: "center",
        background: "transparent",
        color: danger ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-label-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        fontSize: "12px",
        gap: "6px",
        justifyContent: "center",
        lineHeight: "18px",
        minHeight: "32px",
        opacity: disabled ? 0.5 : 1,
        padding: "6px 10px"
      };
    }

    function ActionButton({ icon: Icon, label, danger, disabled, onClick, type = "button" }: {
      icon?: IconComponent;
      label: string;
      danger?: boolean;
      disabled?: boolean;
      onClick?: () => void;
      type?: "button" | "submit" | "reset";
    }) {
      return h("button", {
        type,
        disabled,
        onClick,
        title: label,
        style: actionButtonStyle({ danger: danger ?? false, disabled: disabled ?? false })
      }, [
        Icon ? h(Icon, { key: "icon", size: 16 }) : null,
        h("span", { key: "label" }, label)
      ]);
    }

    function ToggleSwitch({ checked, label, onChange }: {
      checked: boolean;
      label: string;
      onChange(checked: boolean): void;
    }) {
      return h("button", {
        type: "button",
        role: "switch",
        "aria-checked": checked,
        onClick: () => onChange(!checked),
        style: {
          alignItems: "center",
          background: "transparent",
          border: 0,
          color: "var(--dsw-alias-label-primary)",
          cursor: "pointer",
          display: "grid",
          font: "inherit",
          fontSize: "13px",
          gap: "12px",
          gridTemplateColumns: "minmax(0, 1fr) 28px",
          lineHeight: "20px",
          padding: 0,
          textAlign: "left",
          width: "100%"
        }
      }, [
        h("span", { key: "label" }, label),
        h("span", {
          key: "track",
          "aria-hidden": "true",
          style: {
            background: checked ? "var(--dsw-alias-state-business-primary)" : "var(--dsw-alias-border-l2)",
            borderRadius: "8px",
            boxSizing: "border-box",
            height: "16px",
            padding: "2px",
            position: "relative",
            transition: "background-color 120ms ease",
            width: "28px"
          }
        }, h("span", {
          style: {
            background: "var(--dsw-alias-bg-layer-1)",
            borderRadius: "6px",
            display: "block",
            height: "12px",
            transform: checked ? "translateX(12px)" : "translateX(0)",
            transition: "transform 120ms ease",
            width: "12px"
          }
        }))
      ]);
    }

    function modeButtonStyle(active: boolean) {
      return {
        border: 0,
        borderRadius: "5px",
        background: active ? "var(--dsw-alias-interactive-bg-active)" : "transparent",
        color: "var(--dsw-alias-label-primary)",
        cursor: "pointer",
        flex: "1 1 0",
        font: "inherit",
        fontSize: "12px",
        lineHeight: "18px",
        minWidth: 0,
        padding: "5px 10px"
      };
    }

    function validPaletteColors(custom: unknown): custom is CustomPalette {
      if (custom === null || typeof custom !== "object") return false;
      try {
        const candidate = custom as { light?: unknown; dark?: unknown };
        validateSemanticColors(candidate.light);
        validateSemanticColors(candidate.dark);
        return true;
      } catch {
        return false;
      }
    }

    function lowContrastFields(colors: SemanticColors, mode: "light" | "dark"): SemanticField[] {
      const surface = mode === "light" ? "#FFFFFF" : "#111318";
      const codeSurface = mode === "light" ? "#F6F8FA" : "#1F2328";
      const warnings: SemanticField[] = [];
      const textFields: readonly SemanticField[] = ["strong", "emphasis", "heading", "link", "quote"];
      for (const field of textFields) {
        const threshold = field === "heading" ? 3 : 4.5;
        if (contrastRatio(colors[field], surface) < threshold) warnings.push(field);
      }
      if (contrastRatio(colors.inlineCodeText, colors.inlineCodeBackground) < 4.5) warnings.push("inlineCodeText");
      const codeFields: readonly SemanticField[] = ["codeKeyword", "codeString", "codeFunction", "codeConstant", "codeComment", "codeParameter", "codePunctuation"];
      for (const field of codeFields) {
        if (contrastRatio(colors[field], codeSurface) < 3) warnings.push(field);
      }
      return [...new Set(warnings)];
    }

    function ColorField({ field, value, t, onChange }: {
      field: SemanticField;
      value: string;
      t: Translate;
      onChange(value: string): void;
    }) {
      const valid = isHexColor(value);
      const colorValue = valid ? value : "#000000";
      return h("div", {
        style: {
          display: "grid",
          gap: "6px",
          gridTemplateColumns: "34px minmax(0, 1fr)",
          alignItems: "center",
          minWidth: 0
        }
      }, [
        h("span", {
          key: "label",
          style: {
            color: "var(--dsw-alias-label-secondary)",
            fontSize: "12px",
            gridColumn: "1 / -1",
            lineHeight: "18px",
            minWidth: 0
          }
        }, t(`field.${field}`)),
        h("input", {
          key: "picker",
          type: "color",
          value: colorValue,
          "aria-label": `${t(`field.${field}`)} color`,
          onChange: (event: InputEvent) => onChange(event.target.value.toUpperCase()),
          style: {
            border: 0,
            background: "transparent",
            cursor: "pointer",
            height: "30px",
            padding: 0,
            width: "34px"
          }
        }),
        h("input", {
          key: "text",
          type: "text",
          value,
          maxLength: 7,
          spellCheck: false,
          "aria-invalid": !valid,
           "aria-label": `${t(`field.${field}`)} hex value`,
          onChange: (event: InputEvent) => onChange(event.target.value.toUpperCase()),
          style: {
            ...shared,
            borderColor: valid ? "var(--dsw-alias-border-l2)" : "var(--dsw-alias-state-error-primary)",
            fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)",
            fontSize: "12px",
            height: "30px",
            minWidth: 0,
            padding: "5px 7px",
            width: "100%"
          }
        })
      ]);
    }

    function Preview({ colors, mode, t }: {
      colors: SemanticColors | null;
      mode: "light" | "dark";
      t: Translate;
    }) {
      if (colors === null) {
        return h("div", {
          style: {
            ...shared,
            color: "var(--dsw-alias-label-secondary)",
            fontSize: "12px",
            lineHeight: "18px",
            padding: "14px"
          }
        }, t("nativePreview"));
      }
      const codeBackground = "var(--dsw-alias-markdown-code-block)";
      return h("div", {
        style: {
          ...shared,
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "minmax(0, 1fr)",
          padding: "14px"
        }
      }, [
        h("div", {
          key: "heading",
          style: { color: colors.heading, fontSize: "16px", fontWeight: 600, lineHeight: "24px" }
        }, t("headingSample")),
        h("p", {
          key: "body",
          style: { margin: 0, fontSize: "13px", lineHeight: "21px", overflowWrap: "anywhere" }
        }, [
          `${t("plainText")} `,
          h("strong", { key: "strong", style: { color: colors.strong } }, t("strongSample")),
          ", ",
          h("em", { key: "em", style: { color: colors.emphasis } }, t("emphasisSample")),
          ", ",
          h("del", { key: "del", style: { color: colors.emphasis } }, t("deletedSample")),
          ", ",
          h("a", { key: "link", href: "#", onClick: (event: { preventDefault(): void }) => event.preventDefault(), style: { color: colors.link } }, t("linkSample")),
          ", ",
          h("code", {
            key: "inline",
            style: {
              background: colors.inlineCodeBackground,
              borderRadius: "4px",
              color: colors.inlineCodeText,
              fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)",
              padding: "2px 5px"
            }
          }, t("inlineSample"))
        ]),
        h("blockquote", {
          key: "quote",
          style: {
            borderLeft: `3px solid ${colors.quoteBorder}`,
            color: colors.quote,
            fontSize: "12px",
            lineHeight: "19px",
            margin: 0,
            paddingLeft: "10px"
          }
        }, t("quoteSample")),
        h("pre", {
          key: "code",
          style: {
            background: codeBackground,
            borderRadius: "6px",
            color: colors.codePunctuation,
            fontFamily: "var(--ds-font-family-code, ui-monospace, monospace)",
            fontSize: "12px",
            lineHeight: "19px",
            margin: 0,
            overflowX: "auto",
            padding: "10px 12px"
          }
        }, h("code", null, [
          h("span", { key: "comment", style: { color: colors.codeComment } }, `${t("codeComment")}\n`),
          h("span", { key: "keyword", style: { color: colors.codeKeyword } }, t("codeKeyword")),
          " ",
          h("span", { key: "function", style: { color: colors.codeFunction } }, t("codeFunction")),
          h("span", { key: "punctuation-1", style: { color: colors.codePunctuation } }, "("),
          h("span", { key: "parameter", style: { color: colors.codeParameter } }, t("codeParameter")),
          h("span", { key: "punctuation-2", style: { color: colors.codePunctuation } }, ") {\n  return "),
          h("span", { key: "string", style: { color: colors.codeString } }, t("codeString")),
          h("span", { key: "punctuation-3", style: { color: colors.codePunctuation } }, " === "),
          h("span", { key: "constant", style: { color: colors.codeConstant } }, t("codeConstant")),
          h("span", { key: "punctuation-4", style: { color: colors.codePunctuation } }, ";\n}")
        ]))
      ]);
    }

    function downloadJson(payload: unknown): void {
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "dsh-conversation-accents.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }

    function ConversationAccentsSection(props: ConversationAccentsSectionProps) {
      const { t, useStore } = props;
      const snapshot = useStore((state) => state);
      const settings = snapshot.settings;
      const selected = settings.customPalettes.find((entry) => entry.id === settings.activePreset) ?? null;
      const selectedSignature = selected === null ? "" : JSON.stringify(selected);
      const [mode, setMode] = React.useState<"light" | "dark">("light");
      const [draft, setDraft] = React.useState<PaletteDraft | null>(selected === null ? null : JSON.parse(selectedSignature) as PaletteDraft);
      const [message, setMessage] = React.useState<string>("");
      const fileRef = React.useRef<HTMLInputElement | null>(null);

      React.useEffect(() => {
        setDraft(selected === null ? null : JSON.parse(selectedSignature) as PaletteDraft);
        setMessage("");
      }, [selectedSignature]);

      React.useEffect(() => () => props.cancelPreview(), []);

      const activePalette = draft !== null && draft.id === settings.activePreset && validPaletteColors(draft)
        ? { light: draft.light, dark: draft.dark }
        : resolvePalette(settings);
      const previewColors = activePalette === null ? null : activePalette[mode];
      const warnings = previewColors === null ? [] : lowContrastFields(previewColors, mode);
      const draftValid = draft !== null && validPaletteColors(draft) && draft.name.trim().length > 0 && draft.name.trim().length <= 40;

      const updateDraftColor = (field: SemanticField, value: string): void => {
        if (draft === null) return;
        const next = {
          ...draft,
          [mode]: { ...draft[mode], [field]: value }
        };
        setDraft(next);
        setMessage("");
        if (validPaletteColors(next)) props.previewCustom(next);
      };

      const statusKey = snapshot.persistence === "host"
        ? "host"
        : snapshot.persistence === "saving"
          ? "saving"
          : snapshot.persistence === "loading"
            ? "loading"
            : snapshot.persistence === "error"
              ? "persistenceError"
              : "memory";

      const controls = [
        h(ToggleSwitch, {
          key: "colors-enabled",
          checked: settings.colorsEnabled,
          label: t("enabled"),
          onChange: (enabled: boolean) => {
            props.cancelPreview();
            props.setColorsEnabled(enabled);
          }
        }),
        h("div", {
          key: "selector",
          style: {
            display: "grid",
            gap: "8px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            alignItems: "end"
          }
        }, [
          h("label", { key: "select-label", style: { display: "grid", gap: "6px" } }, [
            h("span", {
              key: "text",
              style: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", lineHeight: "18px" }
            }, t("preset")),
            h("select", {
              key: "select",
              value: settings.activePreset,
              onChange: (event: InputEvent<HTMLSelectElement>) => {
                props.cancelPreview();
                props.selectPreset(event.target.value as PresetId);
              },
              style: {
                ...shared,
                cursor: "pointer",
                fontSize: "13px",
                height: "34px",
                minWidth: 0,
                padding: "5px 30px 5px 9px",
                width: "100%"
              }
            }, [
              ...BUILTIN_PALETTE_IDS.map((id) => h("option", { key: id, value: id }, t(`preset.${id}`))),
              ...settings.customPalettes.map((custom) => h("option", { key: custom.id, value: custom.id }, custom.name))
            ])
          ]),
          h(ActionButton, {
            key: "new",
            icon: IconPlusOutline16,
            label: t("create"),
            disabled: settings.customPalettes.length >= MAX_CUSTOM_PALETTES,
            onClick: () => {
              try {
                props.createCustom();
              } catch {
                setMessage(t("limit"));
              }
            }
          })
        ]),
        h("div", {
          key: "transfer",
          style: { display: "flex", flexWrap: "wrap", gap: "8px" }
        }, [
          h(ActionButton, {
            key: "import",
            icon: IconBrowseOutline16,
            label: t("import"),
            onClick: () => fileRef.current?.click()
          }),
          h(ActionButton, {
            key: "export",
            icon: IconDownloadOutline16,
            label: t("export"),
            onClick: () => downloadJson(props.exportCustom())
          }),
          h("input", {
            key: "file",
            ref: fileRef,
            type: "file",
            accept: "application/json,.json",
            style: { display: "none" },
            onChange: async (event: InputEvent) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file === undefined) return;
              try {
                props.importCustom(JSON.parse(await file.text()));
                setMessage(t("imported"));
              } catch {
                setMessage(t("invalidImport"));
              }
            }
          })
        ])
      ];

      if (draft !== null) {
        controls.push(h("div", {
          key: "editor",
          style: {
            borderTop: "1px solid var(--dsw-alias-border-l2)",
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "minmax(0, 1fr)",
            minWidth: 0,
            paddingTop: "14px"
          }
        }, [
          h("div", {
            key: "name-row",
            style: {
              display: "grid",
              gap: "8px",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
              alignItems: "end",
              minWidth: 0
            }
          }, [
            h("label", { key: "name", style: { display: "grid", gap: "6px", minWidth: 0 } }, [
              h("span", {
                key: "label",
                style: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", lineHeight: "18px" }
              }, t("name")),
              h("input", {
                key: "input",
                type: "text",
                value: draft.name,
                maxLength: MAX_PRESET_NAME_LENGTH,
                onChange: (event: InputEvent) => {
                  setDraft({ ...draft, name: event.target.value });
                  setMessage("");
                },
                style: {
                  ...shared,
                  fontSize: "13px",
                  height: "34px",
                  minWidth: 0,
                  padding: "6px 9px",
                  width: "100%"
                }
              })
            ]),
            h("div", {
              key: "mode",
              role: "group",
              "aria-label": `${t("light")} / ${t("dark")}`,
              style: {
                ...shared,
                display: "inline-flex",
                gap: "2px",
                minWidth: 0,
                padding: "2px"
              }
            }, [
              h("button", {
                key: "light",
                type: "button",
                "aria-pressed": mode === "light",
                onClick: () => setMode("light"),
                style: modeButtonStyle(mode === "light")
              }, t("light")),
              h("button", {
                key: "dark",
                type: "button",
                "aria-pressed": mode === "dark",
                onClick: () => setMode("dark"),
                style: modeButtonStyle(mode === "dark")
              }, t("dark"))
            ])
          ]),
          h("div", {
            key: "colors",
            style: {
              display: "grid",
              gap: "9px 18px",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
              minWidth: 0
            }
          }, SEMANTIC_FIELDS.map((field) => h(ColorField, {
            key: field,
            field,
            value: draft[mode][field],
            t,
            onChange: (value: string) => updateDraftColor(field, value)
          }))),
          h("div", {
            key: "editor-actions",
            style: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end" }
          }, [
            h(ActionButton, {
              key: "delete",
              icon: IconTrashOutline16,
              label: t("delete"),
              danger: true,
              onClick: () => {
                if (window.confirm(t("deleteConfirm"))) props.deleteCustom(draft.id);
              }
            }),
            h(ActionButton, {
              key: "save",
              icon: IconCheckOutline16,
              label: t("save"),
              disabled: !draftValid,
              onClick: () => {
                try {
                  props.saveCustom(validateCustomPalette(draft));
                  setMessage(t("saved"));
                } catch {
                  setMessage(t("invalid"));
                }
              }
            })
          ])
        ]));
      }

      controls.push(h("div", {
        key: "preview-section",
        style: { display: "grid", gap: "8px" }
      }, [
        h("div", {
          key: "preview-label",
          style: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", lineHeight: "18px" }
        }, `${t("preview")} · ${t(mode)}`),
        h(Preview, { key: "preview", colors: previewColors, mode, t }),
        warnings.length > 0 ? h("div", {
          key: "contrast",
          role: "status",
          style: {
            alignItems: "flex-start",
            color: "var(--dsw-alias-state-warn-primary)",
            display: "flex",
            fontSize: "12px",
            gap: "6px",
            lineHeight: "18px"
          }
        }, [
          h(IconWarningOutline16, { key: "icon", size: 16 }),
          h("span", { key: "text" }, `${t("contrast")}: ${warnings.map((field) => t(`field.${field}`)).join(", ")}`)
        ]) : null
      ]));

      if (snapshot.persistence === "error") {
        controls.push(h(ActionButton, {
          key: "retry-host-save",
          icon: IconRefreshOutline16,
          label: t("retry"),
          onClick: props.retryHost
        }));
      }

      controls.push(h("div", {
        key: "status",
        role: "status",
        style: {
          color: snapshot.persistence === "error" ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-label-tertiary)",
          display: "flex",
          flexWrap: "wrap",
          fontSize: "12px",
          gap: "8px",
          lineHeight: "18px"
        }
      }, [
        h("span", { key: "persistence" }, t(statusKey)),
        snapshot.error ? h("span", { key: "error" }, snapshot.error) : null,
        message ? h("span", { key: "message" }, message) : null
      ]));

      return h("section", {
        style: {
          display: "grid",
          gap: "14px",
          gridTemplateColumns: "minmax(0, 1fr)",
          minWidth: 0,
          padding: "8px 0 24px"
        }
      }, [
        h("div", { key: "heading", style: { display: "grid", gap: "3px" } }, [
          h("div", {
            key: "title",
            style: { color: "var(--dsw-alias-label-primary)", fontSize: "14px", lineHeight: "22px" }
          }, t("title")),
          h("div", {
            key: "description",
            style: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px", lineHeight: "18px" }
          }, t("description"))
        ]),
        ...controls
      ]);
    }

    function apply(ctx: ClientContext): void {
      let current = readLocalSettings();
      let boundActions: StoreActions | undefined;
      let revision = 0;
      let stateEpoch = 0;
      let persistence: PersistenceKind = ctx.connection.isLoopback ? "loading" : "memory";
      let error = "";
      let hostReady = false;
      let visualsReady = !ctx.connection.isLoopback;
      let disposed = false;
      const styleElements = new Map<string, HTMLStyleElement>();
      const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(CHANNEL_NAME) : null;

      const publish = () => {
        revision += 1;
        boundActions?.sync(current, persistence, error, revision);
      };

      const removeStyle = (kind: string): void => {
        styleElements.get(kind)?.remove();
        styleElements.delete(kind);
      };

      const setStyle = (kind: string, css: string | null): void => {
        if (css === null) {
          removeStyle(kind);
          return;
        }
        const existing = styleElements.get(kind);
        if (existing !== undefined) {
          if (existing.textContent !== css) existing.textContent = css;
          return;
        }
        const element = document.createElement("style");
        element.setAttribute("data-plugin", STYLE_PLUGIN);
        element.setAttribute("data-plugin-css", kind);
        element.textContent = css;
        document.head.appendChild(element);
        styleElements.set(kind, element);
      };

      const reconcileVisuals = (override?: AccentPalette): void => {
        const accentsEnabled = visualsReady && current.colorsEnabled;
        const palette = accentsEnabled ? override ?? resolvePalette(current) : null;
        setStyle(MARKDOWN_ACCENT_STYLE_KIND, palette === null ? null : buildAccentCss(palette));
        setStyle(TOOL_ACCENT_STYLE_KIND, accentsEnabled ? TOOL_ACCENT_CSS : null);
        setStyle(THINK_ACCENT_STYLE_KIND, accentsEnabled ? THINK_ACCENT_CSS : null);
      };

      const adoptSettings = (next: unknown): void => {
        current = validateSettingsDocument(next);
        stateEpoch += 1;
        visualsReady = true;
        reconcileVisuals();
        writeLocalSettings(current);
      };

      const sameSettings = (next: ConversationAccentSettings): boolean => JSON.stringify(current) === JSON.stringify(next);

      const hostSaveQueue = createTrailingSaveQueue<ConversationAccentSettings>({
        write: (settings, signal) => writeHostSettings(settings, signal),
        clone: cloneSettings,
        timeoutMs: HOST_REQUEST_TIMEOUT_MS,
        onAccepted: (accepted) => adoptSettings(accepted),
        onState: (snapshot) => {
          if (disposed) return;
          if (snapshot.phase === "saving") {
            persistence = "saving";
            error = "";
          } else if (snapshot.phase === "ready") {
            persistence = "host";
            error = "";
          } else if (snapshot.phase === "error") {
            persistence = "error";
            error = snapshot.error?.message ?? "Host settings save failed";
            ctx.logger.warn(snapshot.error);
          }
          publish();
        }
      });

      const queueHostSave = (settings: ConversationAccentSettings): void => hostSaveQueue.enqueue(settings);

      const commit = (
        next: ConversationAccentSettings,
        options: { broadcast?: boolean; host?: boolean } = {}
      ): void => {
        adoptSettings(next);
        publish();
        if (options.broadcast !== false) channel?.postMessage({ type: "settings", value: current });
        if (ctx.connection.isLoopback && hostReady && options.host !== false) queueHostSave(current);
      };

      const initializeHost = async (): Promise<void> => {
        if (!ctx.connection.isLoopback) {
          publish();
          return;
        }
        const loadEpoch = stateEpoch;
        try {
          const hosted = await readHostSettings();
          if (disposed) return;
          hostReady = true;
          if (stateEpoch !== loadEpoch) {
            queueHostSave(current);
            return;
          }
          adoptSettings(hosted);
          persistence = "host";
          error = "";
          publish();
        } catch (cause) {
          if (disposed) return;
          visualsReady = true;
          reconcileVisuals();
          persistence = "memory";
          error = cause instanceof Error ? cause.message : String(cause);
          publish();
          ctx.logger.warn(cause);
        }
      };

      const adoptExternal = (value: unknown): void => {
        const next = validateSettingsDocument(value);
        if (sameSettings(next)) return;
        adoptSettings(next);
        publish();
        if (ctx.connection.isLoopback && hostReady) queueHostSave(current);
      };

      const onChannelMessage = (event: MessageEvent<unknown>): void => {
        if (typeof event.data !== "object" || event.data === null) return;
        const message = event.data as { type?: unknown; value?: unknown };
        if (message.type !== "settings") return;
        try {
          adoptExternal(message.value);
        } catch {
          // Ignore malformed cross-tab messages.
        }
      };

      const onStorage = (event: StorageEvent): void => {
        if (event.key !== LOCAL_STORAGE_KEY) return;
        try {
          adoptExternal(event.newValue === null ? cloneSettings(DEFAULT_SETTINGS) : JSON.parse(event.newValue));
        } catch {
          // Ignore malformed external storage writes.
        }
      };

      channel?.addEventListener("message", onChannelMessage);
      window.addEventListener("storage", onStorage);
      setStyle(THINK_MARKDOWN_STYLE_KIND, THINK_MARKDOWN_CSS);
      ctx.effect(installThinkMarkdown, "conversation-accents: Think Markdown");
      reconcileVisuals();
      publish();
      initializeHost();

      const localeNamespace = LOCALE_NAMESPACE;
      const t = ctx.locale.bind(localeNamespace);
      ctx.effect(() => ctx.locale.register(localeNamespace, { zh, en }), "conversation-accents: locale");
      ctx.effect(() => () => {
        disposed = true;
        hostSaveQueue.dispose();
        for (const element of styleElements.values()) element.remove();
        styleElements.clear();
        channel?.removeEventListener("message", onChannelMessage);
        channel?.close();
        window.removeEventListener("storage", onStorage);
      }, "conversation-accents: lifecycle");

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "conversation-accents",
        order: 25,
        label: () => t("nav"),
        store,
        locale: localeNamespace,
        inject: (actions: StoreActions) => {
          boundActions = actions;
          publish();
          return {
            setColorsEnabled: (enabled: boolean) => commit(setColorsEnabled(current, enabled)),
            selectPreset: (id: PresetId) => commit(selectPreset(current, id)),
            createCustom: () => {
              const created = createCustomPalette(current, resolvePalette(current));
              commit(created.settings);
              return created.custom.id;
            },
            previewCustom: (custom: CustomPalette) => {
              const palette = validateCustomPalette(custom);
              if (current.activePreset === palette.id) reconcileVisuals({ light: palette.light, dark: palette.dark });
            },
            cancelPreview: () => reconcileVisuals(),
            saveCustom: (custom: CustomPalette) => commit(saveCustomPalette(current, custom)),
            deleteCustom: (id: string) => commit(deleteCustomPalette(current, id)),
            importCustom: (payload: unknown) => commit(mergeImportedPalettes(current, payload)),
            exportCustom: () => exportCustomPalettes(current),
            retryHost: () => hostSaveQueue.retry()
          };
        }
      }, ConversationAccentsSection));
    }

    return {
      apply,
      inject: ["slots", "locale", "connection"],
      __test: {
        buildAccentCss,
        lowContrastFields,
        readHostSettings,
        renderThinkMarkdownHtml,
        writeHostSettings
      }
    };
  }
});
