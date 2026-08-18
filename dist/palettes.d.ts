export declare const SEMANTIC_FIELDS: readonly ["strong", "emphasis", "heading", "link", "quote", "quoteBorder", "inlineCodeText", "inlineCodeBackground", "codeKeyword", "codeString", "codeFunction", "codeConstant", "codeComment", "codeParameter", "codePunctuation"];
export type SemanticField = typeof SEMANTIC_FIELDS[number];
export type HexColor = `#${string}`;
export interface SemanticColors {
    readonly strong: HexColor;
    readonly emphasis: HexColor;
    readonly heading: HexColor;
    readonly link: HexColor;
    readonly quote: HexColor;
    readonly quoteBorder: HexColor;
    readonly inlineCodeText: HexColor;
    readonly inlineCodeBackground: HexColor;
    readonly codeKeyword: HexColor;
    readonly codeString: HexColor;
    readonly codeFunction: HexColor;
    readonly codeConstant: HexColor;
    readonly codeComment: HexColor;
    readonly codeParameter: HexColor;
    readonly codePunctuation: HexColor;
}
export interface AccentPalette {
    readonly light: SemanticColors;
    readonly dark: SemanticColors;
}
export declare const FIELD_LABELS: Readonly<Record<SemanticField, {
    zh: string;
    en: string;
}>>;
export declare const BUILTIN_PALETTE_IDS: readonly ["native", "github-markdown", "catppuccin-mocha", "dracula", "nord", "tokyo-night", "gruvbox"];
export type BuiltinPresetId = typeof BUILTIN_PALETTE_IDS[number];
export declare const BUILTIN_LABELS: Readonly<Record<BuiltinPresetId, {
    zh: string;
    en: string;
}>>;
export declare const BUILTIN_PALETTES: Readonly<Record<BuiltinPresetId, AccentPalette | null>>;
