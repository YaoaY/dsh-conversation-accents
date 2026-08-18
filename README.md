# DSH Conversation Accents

为 DSH Web 的助手回复、工具调用和 Think 内容增加更清晰的语义配色。

[English](README_EN.md)

> 这是一个社区维护的 Alpha 插件，与 DeepSeek 官方无隶属或背书关系。

## 效果对比

| 原生 DSH | 启用插件 |
|---|---|
| ![原生效果 1](docs/images/A1.png) | ![插件效果 1](docs/images/B1.png) |
| ![原生效果 2](docs/images/A2.png) | ![插件效果 2](docs/images/B2.png) |

## 主要功能

- 为标题、重点、链接、引用、行内代码和代码 token 提供语义配色。
- 为成功的工具调用和 Think 区域增加易辨识的颜色。
- 内置 7 套配色，支持浅色与深色模式。
- 支持创建、编辑、导入和导出自定义配色。
- 可随时关闭插件配色，不会删除已经保存的设置。
- 设置保存到 DSH Host；不可用时自动保存在当前浏览器。

插件只修改会话内容，不会改变 DSH 的导航、输入框和页面主题。

## 设置页面

![会话配色设置页面](docs/images/settings.png)

安装后，在 DSH 的 **设置 -> 会话配色** 中可以：

- 开启或关闭全部配色。
- 选择内置配色。
- 分别编辑浅色和深色颜色。
- 调整行内代码文字与背景色。
- 导入或导出自定义配色 JSON。

## 安装

需要已安装 DSH Web。推荐直接从 npm 安装，无需克隆源码或本地编译：

```bash
dsh plugin --profile web add dsh-conversation-accents@alpha
```

安装或更新后重启 DSH Web，并在浏览器中强制刷新页面。

卸载：

```bash
dsh plugin --profile web remove dsh-conversation-accents
```

## 兼容性

当前版本针对 DSH `0.1.0-rc.6` 开发和测试。

插件需要读取 DSH 会话页面的 DOM 属性。DSH 升级后，如果会话结构发生变化，请重新运行测试并检查助手回复、工具调用和 Think 区域。

## 隐私与安全

- 不收集分析数据，不上传会话内容。
- 配色设置只保存在 DSH Host 或浏览器本地存储中。
- 自定义配色只接受结构化字段和 `#RRGGBB` 颜色，不接受任意 CSS。
- Think Markdown 使用安全默认配置，不执行原始 HTML。

安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告。

## 开发

源码位于 `src/`，构建产物位于 `dist/`。

```bash
npm ci
npm test
npm run build
npm run pack:check
```

贡献说明见 [CONTRIBUTING.md](CONTRIBUTING.md)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT](LICENSE)
