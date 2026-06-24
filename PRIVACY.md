# 隐私政策 / Privacy Policy

**环境标签着色 / Env Tab Color**

最后更新：2026-06-24

## 中文

本扩展尊重并保护你的隐私。以下说明本扩展如何处理数据。

### 我们收集什么

本扩展**不收集、不上传、不出售、不转移**任何个人数据。

扩展仅在你的浏览器本地处理以下信息：

- **标签页 URL**：用于按你设置的规则判断当前页面属于哪个环境（dev / test / prod），从而决定是否显示色条、标题前缀或图标徽章。URL 仅在本地内存中即时处理，**不会被存储或发送到任何服务器**。
- **你的配置**：包括环境列表、匹配规则、标记开关、色条位置等。这些配置通过浏览器自带的 `chrome.storage.sync` 存储，**仅保存在你的浏览器及你登录的浏览器账号同步空间内**，由浏览器在你的设备间同步，不经过本扩展开发者的任何服务器。

### 我们不做什么

- 不使用任何分析、统计或追踪工具。
- 不包含任何远程代码，所有逻辑均随扩展打包在本地运行。
- 不与任何第三方共享数据。

### 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 在浏览器本地及账号同步空间保存你的配置 |
| `tabs` | 读取标签页 URL，以更新工具栏图标徽章 |
| `<all_urls>`（host 权限） | 需要在任意网站上判断其所属环境并显示标记 |

### 联系方式

如有疑问，请通过本扩展的代码仓库提交 issue。

---

## English

This extension respects and protects your privacy. This document explains how the extension handles data.

### What we collect

This extension does **not** collect, upload, sell, or transfer any personal data.

It processes the following information **locally in your browser only**:

- **Tab URL**: used to determine which environment (dev / test / prod) the current page belongs to, based on rules you define, in order to decide whether to show a color bar, title prefix, or icon badge. The URL is processed in memory in real time and is **never stored or sent to any server**.
- **Your configuration**: environment list, matching rules, feature toggles, color-bar position, etc. Stored via the browser's built-in `chrome.storage.sync`, kept **only within your browser and your signed-in browser account's sync space**, and synced across your devices by the browser — never through any server operated by the extension's developer.

### What we do not do

- We use no analytics, telemetry, or tracking.
- We include no remote code; all logic is bundled and runs locally.
- We share no data with any third party.

### Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save your configuration locally and in your account's sync space |
| `tabs` | Read the tab URL to update the toolbar icon badge |
| `<all_urls>` (host permission) | Required to detect the environment of any website and display markers |

### Contact

For questions, please open an issue in this extension's code repository.
