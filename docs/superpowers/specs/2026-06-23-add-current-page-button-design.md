# 「添加当前页到指定环境」按钮 — 设计文档

**日期**：2026-06-23
**状态**：已确认，待实现
**关联**：扩展主体见 `2026-06-23-env-tab-color-extension-design.md`

## 1. 背景与目标

当前规则只能在 options 配置页手动添加。本功能在 popup 弹窗里加一个按钮，让用户把**当前标签页**一键加入选定环境，免去打开设置、手输 URL 的步骤。

典型场景：用户打开 `a.test.com`，在 popup 选「dev」并点「添加当前页」，该域名即归入 dev 环境并立即生效。

## 2. 规则粒度

生成的规则 `pattern` 使用**完整主机名 + 端口**（`URL.host`，即 `hostname[:port]`，默认端口时不含端口）。

- 保留完整子域，因此 `a.test.com` 与 `b.test.com` 是不同 host，生成各自独立的规则，可分别归到不同环境。
- 不含协议、路径、查询串，整个 host 下所有页面均命中。

## 3. 纯函数 `hostFromUrl`

新增纯函数，放进 `src/match.js`（与 `matchEnvironment` 同属可在 node 单测的纯逻辑），通过 UMD 一并导出。

```
hostFromUrl(url) → string | null
```

- 用 `URL` 解析；仅接受 `http:`/`https:` 协议，返回其 `.host`（`hostname[:port]`）。
- 非 http(s)（如 `chrome://`、`file://`）或无法解析的 URL → 返回 `null`。

## 4. 添加行为（含去重与优先级）

popup 中点「添加当前页」按钮时：

1. 取当前活动标签 URL，调用 `hostFromUrl` 得到 `host`。
2. 若 `host` 为 `null`（非 http(s) 页）→ 按钮本就处于禁用态，不触发。
3. 在 `cfg.rules` 中查找 `pattern === host` 的现有规则：
   - **命中** → 把该规则的 `envId` 改为下拉选中的环境（原地更新，不改位置）。
   - **未命中** → 新建规则 `{ id: newId('r'), pattern: host, envId: 选中环境 }`，**插入到 `cfg.rules` 数组的最顶端（index 0）**。
4. `setConfig({ rules: cfg.rules })` 持久化。

**为何插入顶端**：匹配逻辑是「列表从上到下第一条命中」+ 子串匹配。若已存在更宽泛的规则（如 `test.com` 或 `*.test.com`）排在前面，新加的具体 host 规则放末尾将永不命中。插入顶端保证更具体的 host 规则优先生效。

## 5. popup UI

在 popup 现有「当前环境」显示块与「标记开关」之间，加一行控件：

- 一个 `<select>`：列出所有环境（option 文本为环境名，value 为 envId）；默认选中**当前页已命中的环境**，未命中则选第一个环境。
- 一个按钮「添加当前页 →」。
- 按钮下方小字显示将要添加的 host（如 `test.example.com:8080`）。
- 当前标签为非 http(s) 页（`hostFromUrl` 返回 `null`）时：按钮 `disabled`，小字显示「当前页不支持」。

**操作反馈**：添加/更新后，重新渲染 popup 顶部「当前环境」显示块，使其立即反映新归类结果（无需重开 popup）。

## 6. 数据流

popup `setConfig` → `chrome.storage.sync.set` → content script 与 background 经 `chrome.storage.onChanged` 自动重算并刷新页面标记与图标徽章。popup 自身在保存后本地重渲染当前环境块。

## 7. 受影响文件

- `src/match.js`：新增并导出 `hostFromUrl`。
- `test/match.test.js`：新增 `hostFromUrl` 单元测试。
- `src/popup.html`：新增下拉 + 按钮 + host 提示的控件行。
- `src/popup.js`：渲染控件、默认选中逻辑、点击添加（去重 + 顶端插入）、保存后重渲染当前环境块。
- options 页、storage.js、background.js、content.js、manifest.json：**不改动**。

## 8. 测试策略

- **`hostFromUrl`（单元测试）**：
  - 普通域名：`https://test.example.com/login` → `test.example.com`
  - 带端口：`http://192.168.1.20:8080/x?y=1` → `192.168.1.20:8080`
  - 带路径/查询串只取 host：`https://a.test.com/p/q?k=v#h` → `a.test.com`
  - 区分子域：`a.test.com` 与 `b.test.com` 返回不同值
  - 默认端口不带端口：`https://test.example.com:443/` → `test.example.com`
  - 非 http(s)：`chrome://extensions` → `null`
  - 非法/空 URL：`''`、`'not a url'` → `null`
- **popup 交互（手动验证）**：
  - 新增：当前页 host 不在规则中 → 选环境点添加 → 规则出现在 options 列表**顶端**，页面标记立即生效。
  - 去重更新：当前页 host 已有规则 → 选另一环境点添加 → 该规则环境被改、位置不变，无重复规则。
  - 优先级：已有宽泛规则在前时，添加具体 host 后具体规则生效（顶端插入起效）。
  - 禁用态：在 `chrome://` 页打开 popup → 按钮禁用、提示「当前页不支持」。
  - 反馈：添加后 popup 顶部环境块即时更新。

## 9. 范围之外（YAGNI）

- 不支持在 popup 里编辑 host 后再添加（固定用 `URL.host`）。
- 不做「按子域/按域名」粒度切换（固定完整 host）。
- 不在 popup 里展示/管理完整规则列表（仍在 options 页）。
