# 色条大小 / 透明度可配置 — 设计文档

日期：2026-06-24

## 背景

注入页面角落的环境色条（`content.js` 中 `applyBorder` 生成的 `bar`，显示 `DEV`/`TEST`/`PROD`）当前样式全部硬编码：

- 大小：字号 `28px`、内边距 `12px 24px`、圆角 `16px`
- 透明度：`opacity: 0.25`

目前用户唯一能配置的只有色条**位置**（四角）。本次新增「大小」和「透明度」两项可配置能力。

## 目标

- 用户可在设置页用**滑块**调整色条字号与透明度。
- **全局统一**：一套大小 / 透明度应用于所有环境（与现有 `position` 全局生效的设计一致）。
- 改动实时生效，无需刷新页面。

## 非目标（YAGNI）

- 不做「每个环境独立设置大小 / 透明度」。
- 不单独配置 padding / 圆角（随字号按比例派生）。
- 不改动颜色、位置、标题前缀、徽章等已有能力。

## 设计

### 1. 数据模型（`src/storage.js`）

`DEFAULTS` 新增 `appearance` 分组，默认值即当前硬编码值：

```js
appearance: { fontSize: 28, opacity: 0.25 }
```

`getConfig` 中沿用 `features` 的合并写法，避免老用户缺字段：

```js
cfg.appearance = Object.assign({}, DEFAULTS.appearance, cfg.appearance || {});
```

透明度存储为 `0–1` 小数（直接对应 CSS `opacity`）。

### 2. 派生计算（纯函数，可单测）

色条整体随字号按比例缩放，一个滑块即可控制大小。比例由当前 28px 基准固定：

```js
// barStyleFromSize(28) → { padding: '12px 24px', borderRadius: '16px' }
上下 padding = round(fontSize * 3 / 7)   // 28 → 12
左右 padding = round(fontSize * 6 / 7)   // 28 → 24
圆角        = round(fontSize * 4 / 7)   // 28 → 16
```

抽成 `src/storage.js` 导出的纯函数 `barStyleFromSize(fontSize)`，返回 `{ padding, borderRadius }`，便于在 node 下单测。

### 3. 渲染（`src/content.js`）

- 将字号 / padding / 圆角 / opacity 这些**可变样式**从 `ensureBar`（仅创建时设一次）移到 `applyBorder`（每次 render 都设置），使配置变更经 `storage.onChanged → safeReload → recompute → render` 实时刷新。
- `recompute` 多读取一个 `cfg.appearance`，存入模块级变量供 `applyBorder` 使用。

### 4. 配置 UI（`src/options.html` / `src/options.js`）

在「标记方式」区块下新增两个滑块，旁边实时显示当前值，沿用现有「改即存」风格：

- **色条字号**：`range 16–48`，step 1
- **色条透明度**：`range 5–100`（%），step 5；存储转为 `0–1`，UI 显示百分比

`save()` 中将 `appearance` 一并写入 `chrome.storage.sync`。

### 5. 测试（`test/appearance.test.js`）

对纯函数 `barStyleFromSize` 加断言：典型值 `28` 还原现状，边界值 `16` / `48` 的派生结果符合比例。`getConfig` 依赖 `chrome.storage`，不纳入 node 单测。

## 改动文件清单

- `src/storage.js` — 新增 `appearance` 默认值、合并逻辑、`barStyleFromSize` 纯函数并导出
- `src/content.js` — 可变样式移入 `applyBorder`，读取 `appearance`
- `src/options.html` — 新增两个滑块及其数值显示
- `src/options.js` — 渲染滑块、绑定即时保存
- `test/appearance.test.js` — 新增纯函数单测

## 兼容性

无新权限、无破坏性改动。老用户缺 `appearance` 字段时自动回落到默认值（28px / 0.25），表现与当前一致。
