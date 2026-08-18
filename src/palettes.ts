export const SEMANTIC_FIELDS = [
  "strong",
  "emphasis",
  "heading",
  "link",
  "quote",
  "quoteBorder",
  "inlineCodeText",
  "inlineCodeBackground",
  "codeKeyword",
  "codeString",
  "codeFunction",
  "codeConstant",
  "codeComment",
  "codeParameter",
  "codePunctuation"
] as const;

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

export const FIELD_LABELS: Readonly<Record<SemanticField, { zh: string; en: string }>> = Object.freeze({
  strong: { zh: "普通重点", en: "Strong" },
  emphasis: { zh: "强调", en: "Emphasis" },
  heading: { zh: "标题", en: "Heading" },
  link: { zh: "链接", en: "Link" },
  quote: { zh: "引用文字", en: "Quote text" },
  quoteBorder: { zh: "引用边框", en: "Quote border" },
  inlineCodeText: { zh: "内联代码文字", en: "Inline code text" },
  inlineCodeBackground: { zh: "内联代码背景", en: "Inline code background" },
  codeKeyword: { zh: "代码关键字", en: "Code keyword" },
  codeString: { zh: "代码字符串", en: "Code string" },
  codeFunction: { zh: "代码函数", en: "Code function" },
  codeConstant: { zh: "代码常量", en: "Code constant" },
  codeComment: { zh: "代码注释", en: "Code comment" },
  codeParameter: { zh: "代码参数", en: "Code parameter" },
  codePunctuation: { zh: "代码标点", en: "Code punctuation" }
});

export const BUILTIN_PALETTE_IDS = [
  "native",
  "github-markdown",
  "catppuccin-mocha",
  "dracula",
  "nord",
  "tokyo-night",
  "gruvbox"
] as const;

export type BuiltinPresetId = typeof BUILTIN_PALETTE_IDS[number];

export const BUILTIN_LABELS: Readonly<Record<BuiltinPresetId, { zh: string; en: string }>> = Object.freeze({
  native: { zh: "系统默认", en: "Native" },
  "github-markdown": { zh: "GitHub Markdown", en: "GitHub Markdown" },
  "catppuccin-mocha": { zh: "Catppuccin Mocha", en: "Catppuccin Mocha" },
  dracula: { zh: "Dracula", en: "Dracula" },
  nord: { zh: "Nord", en: "Nord" },
  "tokyo-night": { zh: "Tokyo Night", en: "Tokyo Night" },
  gruvbox: { zh: "Gruvbox", en: "Gruvbox" }
});

const palette = (light: SemanticColors, dark: SemanticColors): AccentPalette => Object.freeze({
  light: Object.freeze(light),
  dark: Object.freeze(dark)
});

export const BUILTIN_PALETTES: Readonly<Record<BuiltinPresetId, AccentPalette | null>> = Object.freeze({
  native: null,
  "github-markdown": palette({
    strong: "#0969DA",
    emphasis: "#8250DF",
    heading: "#0969DA",
    link: "#0969DA",
    quote: "#57606A",
    quoteBorder: "#AFB8C1",
    inlineCodeText: "#8250DF",
    inlineCodeBackground: "#EFF1F3",
    codeKeyword: "#CF222E",
    codeString: "#0A3069",
    codeFunction: "#8250DF",
    codeConstant: "#0550AE",
    codeComment: "#6E7781",
    codeParameter: "#953800",
    codePunctuation: "#24292F"
  }, {
    strong: "#58A6FF",
    emphasis: "#D2A8FF",
    heading: "#58A6FF",
    link: "#58A6FF",
    quote: "#8B949E",
    quoteBorder: "#484F58",
    inlineCodeText: "#D2A8FF",
    inlineCodeBackground: "#2D333B",
    codeKeyword: "#FF7B72",
    codeString: "#A5D6FF",
    codeFunction: "#D2A8FF",
    codeConstant: "#79C0FF",
    codeComment: "#8B949E",
    codeParameter: "#FFA657",
    codePunctuation: "#C9D1D9"
  }),
  "catppuccin-mocha": palette({
    strong: "#1E66F5",
    emphasis: "#8839EF",
    heading: "#1E66F5",
    link: "#1E66F5",
    quote: "#6C6F85",
    quoteBorder: "#9CA0B0",
    inlineCodeText: "#8839EF",
    inlineCodeBackground: "#E6E9EF",
    codeKeyword: "#8839EF",
    codeString: "#40A02B",
    codeFunction: "#047D95",
    codeConstant: "#1E66F5",
    codeComment: "#7C7F93",
    codeParameter: "#C65300",
    codePunctuation: "#5C5F77"
  }, {
    strong: "#89B4FA",
    emphasis: "#CBA6F7",
    heading: "#89B4FA",
    link: "#89B4FA",
    quote: "#BAC2DE",
    quoteBorder: "#585B70",
    inlineCodeText: "#CBA6F7",
    inlineCodeBackground: "#313244",
    codeKeyword: "#CBA6F7",
    codeString: "#A6E3A1",
    codeFunction: "#74C7EC",
    codeConstant: "#89B4FA",
    codeComment: "#9399B2",
    codeParameter: "#FAB387",
    codePunctuation: "#CDD6F4"
  }),
  dracula: palette({
    strong: "#3D56C5",
    emphasis: "#7137B8",
    heading: "#3D56C5",
    link: "#2455C3",
    quote: "#5D6275",
    quoteBorder: "#A8AEC2",
    inlineCodeText: "#7137B8",
    inlineCodeBackground: "#ECECF4",
    codeKeyword: "#C5265E",
    codeString: "#2E7D32",
    codeFunction: "#6C3EB8",
    codeConstant: "#315AA9",
    codeComment: "#6D7488",
    codeParameter: "#A14C00",
    codePunctuation: "#3B3F51"
  }, {
    strong: "#8BE9FD",
    emphasis: "#BD93F9",
    heading: "#8BE9FD",
    link: "#8BE9FD",
    quote: "#D6D6D6",
    quoteBorder: "#6272A4",
    inlineCodeText: "#BD93F9",
    inlineCodeBackground: "#44475A",
    codeKeyword: "#FF79C6",
    codeString: "#F1FA8C",
    codeFunction: "#50FA7B",
    codeConstant: "#BD93F9",
    codeComment: "#9AA5CE",
    codeParameter: "#FFB86C",
    codePunctuation: "#F8F8F2"
  }),
  nord: palette({
    strong: "#4C6F97",
    emphasis: "#8C5E87",
    heading: "#4C6F97",
    link: "#3E6D9C",
    quote: "#4C566A",
    quoteBorder: "#A7B2C4",
    inlineCodeText: "#8C5E87",
    inlineCodeBackground: "#E5E9F0",
    codeKeyword: "#8C5E87",
    codeString: "#527A45",
    codeFunction: "#397886",
    codeConstant: "#4C6F97",
    codeComment: "#687386",
    codeParameter: "#9A5D46",
    codePunctuation: "#3B4252"
  }, {
    strong: "#88C0D0",
    emphasis: "#B48EAD",
    heading: "#88C0D0",
    link: "#88C0D0",
    quote: "#D8DEE9",
    quoteBorder: "#4C566A",
    inlineCodeText: "#B48EAD",
    inlineCodeBackground: "#3B4252",
    codeKeyword: "#B48EAD",
    codeString: "#A3BE8C",
    codeFunction: "#88C0D0",
    codeConstant: "#81A1C1",
    codeComment: "#7D8CA5",
    codeParameter: "#D08770",
    codePunctuation: "#ECEFF4"
  }),
  "tokyo-night": palette({
    strong: "#3457B2",
    emphasis: "#7A3E9D",
    heading: "#3457B2",
    link: "#3457B2",
    quote: "#5C6785",
    quoteBorder: "#A9B8D0",
    inlineCodeText: "#7A3E9D",
    inlineCodeBackground: "#E1E7F2",
    codeKeyword: "#7A3E9D",
    codeString: "#2D7D55",
    codeFunction: "#176C8B",
    codeConstant: "#3457B2",
    codeComment: "#687593",
    codeParameter: "#A75416",
    codePunctuation: "#46516B"
  }, {
    strong: "#7AA2F7",
    emphasis: "#BB9AF7",
    heading: "#7AA2F7",
    link: "#7DCFFF",
    quote: "#A9B1D6",
    quoteBorder: "#565F89",
    inlineCodeText: "#BB9AF7",
    inlineCodeBackground: "#2D3348",
    codeKeyword: "#BB9AF7",
    codeString: "#9ECE6A",
    codeFunction: "#7DCFFF",
    codeConstant: "#7AA2F7",
    codeComment: "#7F89B3",
    codeParameter: "#FF9E64",
    codePunctuation: "#C0CAF5"
  }),
  gruvbox: palette({
    strong: "#076678",
    emphasis: "#8F3F71",
    heading: "#076678",
    link: "#076678",
    quote: "#665C54",
    quoteBorder: "#BDAE93",
    inlineCodeText: "#8F3F71",
    inlineCodeBackground: "#EBDBB2",
    codeKeyword: "#8F3F71",
    codeString: "#79740E",
    codeFunction: "#427B58",
    codeConstant: "#076678",
    codeComment: "#7C6F64",
    codeParameter: "#AF3A03",
    codePunctuation: "#3C3836"
  }, {
    strong: "#83A598",
    emphasis: "#D3869B",
    heading: "#83A598",
    link: "#8EC07C",
    quote: "#D5C4A1",
    quoteBorder: "#665C54",
    inlineCodeText: "#D3869B",
    inlineCodeBackground: "#3C3836",
    codeKeyword: "#D3869B",
    codeString: "#B8BB26",
    codeFunction: "#8EC07C",
    codeConstant: "#83A598",
    codeComment: "#A89984",
    codeParameter: "#FE8019",
    codePunctuation: "#EBDBB2"
  })
});
