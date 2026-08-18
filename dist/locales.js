import {
  BUILTIN_LABELS,
  BUILTIN_PALETTE_IDS,
  FIELD_LABELS,
  SEMANTIC_FIELDS
} from "./palettes.js";
const LOCALE_NAMESPACE = "settings.conversation-accents";
const zh = {
  nav: "\u4F1A\u8BDD\u914D\u8272",
  title: "\u4F1A\u8BDD\u5185\u5BB9\u914D\u8272",
  description: "\u52A9\u624B Markdown \u8BED\u4E49\u5F3A\u8C03\u4E0E\u4EE3\u7801 token \u914D\u8272",
  enabled: "\u542F\u7528\u5143\u7D20\u914D\u8272",
  preset: "\u5F53\u524D\u9884\u8BBE",
  create: "\u65B0\u5EFA\u81EA\u5B9A\u4E49\u9884\u8BBE",
  import: "\u5BFC\u5165 JSON",
  export: "\u5BFC\u51FA JSON",
  name: "\u9884\u8BBE\u540D\u79F0",
  light: "\u6D45\u8272",
  dark: "\u6DF1\u8272",
  preview: "Markdown \u9884\u89C8",
  save: "\u4FDD\u5B58",
  saved: "\u5DF2\u4FDD\u5B58",
  delete: "\u5220\u9664",
  invalid: "\u8BF7\u4FEE\u6B63\u65E0\u6548\u5B57\u6BB5",
  invalidImport: "\u5BFC\u5165\u5931\u8D25\uFF1A\u6587\u4EF6\u5FC5\u987B\u53EA\u5305\u542B\u5B8C\u6574\u7684\u7ED3\u6784\u5316\u989C\u8272\u5B57\u6BB5\u3002",
  imported: "\u5DF2\u5BFC\u5165",
  deleteConfirm: "\u5220\u9664\u8FD9\u4E2A\u81EA\u5B9A\u4E49\u9884\u8BBE\uFF1F",
  host: "Host \u5DF2\u540C\u6B65",
  memory: "\u5F53\u524D\u6D4F\u89C8\u5668\u672C\u5730\u4FDD\u5B58",
  loading: "\u6B63\u5728\u8BFB\u53D6 Host \u8BBE\u7F6E",
  saving: "\u6B63\u5728\u4FDD\u5B58\u5230 Host",
  persistenceError: "Host \u4FDD\u5B58\u5931\u8D25\uFF0C\u5DF2\u4FDD\u7559\u5728\u5F53\u524D\u6D4F\u89C8\u5668",
  retry: "\u91CD\u8BD5\u4FDD\u5B58",
  contrast: "\u4EE5\u4E0B\u989C\u8272\u5BF9\u6BD4\u5EA6\u504F\u4F4E",
  nativePreview: "\u7CFB\u7EDF\u9ED8\u8BA4\u4E0D\u6CE8\u5165\u4EFB\u4F55\u4F1A\u8BDD\u5185\u5BB9\u6837\u5F0F\u3002",
  plainText: "\u666E\u901A\u6B63\u6587\u4FDD\u6301 DSH \u539F\u751F\u989C\u8272\u3002",
  headingSample: "\u8BED\u4E49\u6807\u9898",
  quoteSample: "\u5F15\u7528\u6587\u5B57\u4F7F\u7528\u72EC\u7ACB\u6587\u5B57\u8272\u548C\u8FB9\u6846\u8272\u3002",
  linkSample: "\u94FE\u63A5",
  inlineSample: "inlineToken",
  strongSample: "\u91CD\u70B9",
  emphasisSample: "\u5F3A\u8C03",
  deletedSample: "\u5220\u9664\u7EBF",
  codeComment: "// \u6CE8\u91CA",
  codeKeyword: "const",
  codeFunction: "render",
  codeParameter: "value",
  codeString: '"accent"',
  codeConstant: "true",
  limit: "\u81EA\u5B9A\u4E49\u9884\u8BBE\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650"
};
const en = {
  nav: "Conversation accents",
  title: "Conversation accents",
  description: "Assistant Markdown semantics and code-token colors",
  enabled: "Enable element accents",
  preset: "Current preset",
  create: "New custom preset",
  import: "Import JSON",
  export: "Export JSON",
  name: "Preset name",
  light: "Light",
  dark: "Dark",
  preview: "Markdown preview",
  save: "Save",
  saved: "Saved",
  delete: "Delete",
  invalid: "Correct invalid fields",
  invalidImport: "Import failed: the file must contain only complete structured color fields.",
  imported: "Imported",
  deleteConfirm: "Delete this custom preset?",
  host: "Synced with Host",
  memory: "Saved in this browser",
  loading: "Loading Host settings",
  saving: "Saving to Host",
  persistenceError: "Host save failed; kept in this browser",
  retry: "Retry save",
  contrast: "Low contrast for",
  nativePreview: "Native injects no conversation-content styles.",
  plainText: "Plain body text keeps the native DSH color.",
  headingSample: "Semantic heading",
  quoteSample: "Quotes use a dedicated text and border color.",
  linkSample: "link",
  inlineSample: "inlineToken",
  strongSample: "strong",
  emphasisSample: "emphasis",
  deletedSample: "deleted",
  codeComment: "// comment",
  codeKeyword: "const",
  codeFunction: "render",
  codeParameter: "value",
  codeString: '"accent"',
  codeConstant: "true",
  limit: "The custom preset limit has been reached"
};
for (const id of BUILTIN_PALETTE_IDS) {
  zh[`preset.${id}`] = BUILTIN_LABELS[id].zh;
  en[`preset.${id}`] = BUILTIN_LABELS[id].en;
}
for (const field of SEMANTIC_FIELDS) {
  zh[`field.${field}`] = FIELD_LABELS[field].zh;
  en[`field.${field}`] = FIELD_LABELS[field].en;
}
export {
  LOCALE_NAMESPACE,
  en,
  zh
};
