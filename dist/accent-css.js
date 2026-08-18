import { validateSemanticColors } from "./model.js";
const STYLE_PLUGIN = "dsh-conversation-accents";
const MARKDOWN_ACCENT_STYLE_KIND = "assistant-markdown-accents";
const TOOL_ACCENT_STYLE_KIND = "tool-accents";
const THINK_ACCENT_STYLE_KIND = "think-accents";
const THINK_MARKDOWN_STYLE_KIND = "think-markdown-layout";
const THINK_MARKDOWN_ATTRIBUTE = "data-dsh-think-markdown";
const ACCENTED_TOOL_NAMES = ["pwsh", "read", "edit", "write", "grep", "glob", "web_search"];
const GENERIC_TOOL_SELECTOR = `:is(${ACCENTED_TOOL_NAMES.map((tool) => `[data-tool="${tool}"]`).join(", ")})`;
const TOOL_ACCENT_CSS = [
  '[data-chat-flow-kind="tool-call"] [data-sample="bash"][data-variant="bash"][data-state="ok"] > :first-child,',
  `[data-chat-flow-kind="tool-call"] ${GENERIC_TOOL_SELECTOR}[data-state="ok"] [data-disclosure-row] > :first-child,`,
  '[data-chat-flow-kind="tool-call"] [data-variant="others"][data-state="ok"] [data-disclosure-row] > :first-child {',
  "  color: var(--dsw-alias-state-success-primary);",
  "}",
  '[data-chat-flow-kind="tool-call"] [data-sample="bash"][data-variant="bash"] > span:nth-last-child(3),',
  `[data-chat-flow-kind="tool-call"] ${GENERIC_TOOL_SELECTOR} [data-disclosure-row] > :nth-child(2) {`,
  "  color: var(--dsw-alias-state-business-primary);",
  "  font-weight: 600;",
  "}",
  '[data-chat-flow-kind="tool-call"] [data-variant="others"] [data-disclosure-row] > :nth-child(2) {',
  "  color: var(--dsw-alias-state-business-primary);",
  "  font-weight: 400;",
  "}"
].join("\n");
const THINK_ACCENT_CSS = [
  '[data-chat-flow-kind="assistant-step"] [data-variant="think"] { --dsh-think-gold: #806515; }',
  'body[data-ds-dark-theme] [data-chat-flow-kind="assistant-step"] [data-variant="think"] { --dsh-think-gold: #B79A52; }',
  '[data-chat-flow-kind="assistant-step"] [data-variant="think"][data-state="ok"] [data-disclosure-row] > :first-child,',
  '[data-chat-flow-kind="assistant-step"] [data-variant="think"][data-state="running"] [data-disclosure-row] > :nth-child(4),',
  '[data-chat-flow-kind="assistant-step"] [data-variant="think"][data-state="running"] [data-disclosure-row] + * { color: var(--dsh-think-gold); }',
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}] { color: var(--dsh-think-gold); }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}] strong,`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}] :is(a, code),`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] :is(h1, h2, h3, h4, h5, h6) { color: var(--dsh-think-gold); }`
].join("\n");
const THINK_MARKDOWN_CSS = [
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] { white-space: normal; }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}] strong { font-weight: 600; }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] > :is(p, ul, ol, blockquote, pre, h1, h2, h3, h4, h5, h6) { margin: 0 0 8px; }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] > :last-child { margin-bottom: 0; }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] :is(h1, h2, h3, h4, h5, h6) { font-size: 14px; line-height: 24px; }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] blockquote { border-left: 2px solid currentColor; padding-left: 10px; }`,
  `[data-chat-flow-kind="assistant-step"] [data-variant="think"] [${THINK_MARKDOWN_ATTRIBUTE}="body"] pre { white-space: pre-wrap; overflow-x: auto; }`
].join("\n");
function paletteVariables(colors) {
  return [
    `--dsh-conversation-strong: ${colors.strong};`,
    `--dsh-conversation-emphasis: ${colors.emphasis};`,
    `--dsh-conversation-heading: ${colors.heading};`,
    `--dsh-conversation-link: ${colors.link};`,
    `--dsh-conversation-quote: ${colors.quote};`,
    `--dsh-conversation-quote-border: ${colors.quoteBorder};`,
    `--dsh-conversation-inline-code: ${colors.inlineCodeText};`,
    `--dsh-conversation-inline-code-bg: ${colors.inlineCodeBackground};`,
    `--dsh-conversation-code-keyword: ${colors.codeKeyword};`,
    `--dsh-conversation-code-string: ${colors.codeString};`,
    `--dsh-conversation-code-function: ${colors.codeFunction};`,
    `--dsh-conversation-code-constant: ${colors.codeConstant};`,
    `--dsh-conversation-code-comment: ${colors.codeComment};`,
    `--dsh-conversation-code-parameter: ${colors.codeParameter};`,
    `--dsh-conversation-code-punctuation: ${colors.codePunctuation};`
  ].join(" ");
}
function modeCss(colors, prefix = "") {
  return `${prefix}[data-chat-flow-kind="assistant-step"] { ${paletteVariables(colors)} }`;
}
function semanticAccentCss() {
  const selector = '[data-chat-flow-kind="assistant-step"]';
  return [
    `${selector} strong { color: var(--dsh-conversation-strong); }`,
    `${selector} em { color: var(--dsh-conversation-emphasis); }`,
    `${selector} del { color: var(--dsh-conversation-emphasis); text-decoration-color: currentColor; }`,
    `${selector} :is(h1, h2, h3, h4, h5, h6) { color: var(--dsh-conversation-heading); }`,
    `${selector} a { color: var(--dsh-conversation-link); }`,
    `${selector} blockquote { color: var(--dsh-conversation-quote); border-left-color: var(--dsh-conversation-quote-border); }`,
    `${selector} :not(pre) > code { color: var(--dsh-conversation-inline-code); background: var(--dsh-conversation-inline-code-bg); }`,
    `${selector} th { color: var(--dsh-conversation-strong); }`,
    `${selector} li::marker { color: var(--dsh-conversation-emphasis); }`,
    `${selector} .md-code-block { --shiki-token-keyword: var(--dsh-conversation-code-keyword); --shiki-token-string: var(--dsh-conversation-code-string); --shiki-token-string-expression: var(--dsh-conversation-code-string); --shiki-token-function: var(--dsh-conversation-code-function); --shiki-token-constant: var(--dsh-conversation-code-constant); --shiki-token-comment: var(--dsh-conversation-code-comment); --shiki-token-parameter: var(--dsh-conversation-code-parameter); --shiki-token-punctuation: var(--dsh-conversation-code-punctuation); --shiki-token-link: var(--dsh-conversation-link); }`
  ].join("\n");
}
function buildAccentCss(palette) {
  if (palette === null) return "";
  const light = validateSemanticColors(palette.light, "palette.light");
  const dark = validateSemanticColors(palette.dark, "palette.dark");
  return `${modeCss(light)}
${modeCss(dark, "body[data-ds-dark-theme] ")}
${semanticAccentCss()}`;
}
export {
  MARKDOWN_ACCENT_STYLE_KIND,
  STYLE_PLUGIN,
  THINK_ACCENT_CSS,
  THINK_ACCENT_STYLE_KIND,
  THINK_MARKDOWN_ATTRIBUTE,
  THINK_MARKDOWN_CSS,
  THINK_MARKDOWN_STYLE_KIND,
  TOOL_ACCENT_CSS,
  TOOL_ACCENT_STYLE_KIND,
  buildAccentCss
};
