import {
  BUILTIN_LABELS,
  BUILTIN_PALETTE_IDS,
  FIELD_LABELS,
  SEMANTIC_FIELDS
} from "./palettes.js";

export const LOCALE_NAMESPACE = "settings.conversation-accents" as const;

export const zh: Record<string, string> = {
  nav: "会话配色",
  title: "会话内容配色",
  description: "助手 Markdown 语义强调与代码 token 配色",
  enabled: "启用元素配色",
  preset: "当前预设",
  create: "新建自定义预设",
  import: "导入 JSON",
  export: "导出 JSON",
  name: "预设名称",
  light: "浅色",
  dark: "深色",
  preview: "Markdown 预览",
  save: "保存",
  saved: "已保存",
  delete: "删除",
  invalid: "请修正无效字段",
  invalidImport: "导入失败：文件必须只包含完整的结构化颜色字段。",
  imported: "已导入",
  deleteConfirm: "删除这个自定义预设？",
  host: "Host 已同步",
  memory: "当前浏览器本地保存",
  loading: "正在读取 Host 设置",
  saving: "正在保存到 Host",
  persistenceError: "Host 保存失败，已保留在当前浏览器",
  retry: "重试保存",
  contrast: "以下颜色对比度偏低",
  nativePreview: "系统默认不注入任何会话内容样式。",
  plainText: "普通正文保持 DSH 原生颜色。",
  headingSample: "语义标题",
  quoteSample: "引用文字使用独立文字色和边框色。",
  linkSample: "链接",
  inlineSample: "inlineToken",
  strongSample: "重点",
  emphasisSample: "强调",
  deletedSample: "删除线",
  codeComment: "// 注释",
  codeKeyword: "const",
  codeFunction: "render",
  codeParameter: "value",
  codeString: "\"accent\"",
  codeConstant: "true",
  limit: "自定义预设数量已达上限"
};

export const en: Record<string, string> = {
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
  codeString: "\"accent\"",
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
