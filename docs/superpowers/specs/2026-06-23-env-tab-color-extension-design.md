# 环境标签着色扩展 — 设计文档

**日期**：2026-06-23
**状态**：已确认，待实现

## 1. 背景与目标

同一套系统通常部署为开发（dev）、测试（test）、生产（prod）等多套环境，除 URL 外页面外观完全一致。开发者在多个环境间切换时，极易看错当前所在环境，在生产环境上误操作。

本扩展根据用户配置的 URL 规则识别当前标签页所属环境，并以多种可独立开关的视觉标记加以区分，降低误操作风险。

- **目标平台**：Chrome / Edge（Manifest V3，一份代码同时上两家商店）。
- **产品目标**：发布到商店、追求装机量与影响力。
- **技术原则**：原生 JS + HTML/CSS，零依赖、零构建。

## 2. 数据模型

配置存储于 `chrome.storage.sync`（跨设备同步）。

```js
{
  environments: [
    { id: string, name: string, color: string }  // color 为 #RRGGBB
  ],
  rules: [
    { id: string, pattern: string, envId: string }  // 有序列表
  ],
  features: {
    border:  boolean,   // 页面边框/顶部色条
    favicon: boolean,   // 彩色 favicon
    title:   boolean,   // 标签标题前缀
    badge:   boolean    // 扩展图标徽章
  }
}
```

**预置默认值**（首次安装写入）：

- environments：
  - `{ name: "dev",  color: "#22c55e" }`（绿）
  - `{ name: "test", color: "#f59e0b" }`（橙）
  - `{ name: "prod", color: "#ef4444" }`（红）
- rules：空（由用户添加）。
- features：四项全部 `true`。

环境支持用户自定义：可增删、改名、改色，数量不限。

## 3. 匹配逻辑

核心为一个纯函数，被 content script 与 background 共用，便于单元测试。

```
matchEnvironment(url, rules, environments) → environment | null
```

规则：

- 每条 `pattern` 采用**包含匹配 + 通配符 `*`**：
  - 不含 `*` 时，URL 包含该子串即命中（如 `test-`）。
  - 含 `*` 时，`*` 匹配任意字符序列（如 `*.dev.example.com`、`192.168.*`）。
  - 匹配针对完整 URL 字符串，大小写不敏感。
- 按 `rules` 列表**从上到下**，**第一条命中**的规则决定环境。
- 若无规则命中，返回 `null`（不施加任何标记）。
- 通过 `envId` 关联到对应 `environment`；若 `envId` 已失效（环境被删除），视为不命中。

## 4. 四种视觉标记

每种标记由 `features` 中对应开关独立控制。

| 标记 | 实现方式 | 负责模块 |
|---|---|---|
| 页面边框/顶部色条 | 注入一个 `position:fixed`、`pointer-events:none`、极高 z-index 的覆盖层，顶部显示色条 + 环境名文字 | content script |
| 彩色 favicon | 动态生成环境色小圆点叠加/替换 favicon（canvas 生成 data URL，写入 `<link rel="icon">`） | content script |
| 标签标题前缀 | 给 `document.title` 添加形如 `🔴[PROD] ` 的前缀 | content script |
| 扩展图标徽章 | 按 tabId 设置 badge 文字（取环境名首字母，如 P/T/D）+ 背景色 | background service worker |

**鲁棒性要求**：

- content script 使用 `MutationObserver` 监听 `<title>` 与 `<head>` 变化，兜住 SPA 路由切换导致的标题/favicon 被页面自身重置。
- favicon 标记需处理「页面原本无 favicon」的情况（直接创建 `<link>`）。
- 覆盖层不得拦截页面交互（`pointer-events:none`），不得影响页面布局。

## 5. 组件架构

- **content script**（注入所有页面，`<all_urls>`）：
  - 读取配置 → 调用 `matchEnvironment` → 应用边框 / favicon / 标题三类标记。
  - 监听 `chrome.storage` 变化，配置更新时实时重渲染。
  - 通过 `MutationObserver` 维持标记在 SPA 下的持久性。
- **background（service worker）**：
  - 监听 `chrome.tabs.onUpdated` / `onActivated`，按 tabId 设置图标徽章（`chrome.action.setBadgeText` / `setBadgeBackgroundColor`）。
  - 首次安装写入默认配置。
- **options 配置页**：
  - 管理环境：增删、改名、改色（颜色选择器）。
  - 管理规则：增删、编辑 pattern 与所属环境、拖动排序。
  - 四个标记方式的总开关。
- **popup**（点击扩展图标弹出）：
  - 显示当前活动标签命中的环境名（或「未匹配」）。
  - 快速开关四种标记。
  - 入口跳转 options 配置页。

## 6. 权限

`manifest.json` 声明：

- `permissions`: `storage`、`tabs`、`scripting`
- `host_permissions`: `<all_urls>`（注入内容脚本所需）
- `action`（popup + 徽章）、`options_page`

## 7. 文件结构

```
manifest.json
src/match.js          # 纯匹配函数（content / background 共用）
src/content.js        # 边框 / favicon / 标题标记
src/background.js     # 徽章 + 默认配置 + 配置广播
src/options.html
src/options.js        # 配置页逻辑
src/popup.html
src/popup.js          # 弹窗逻辑
src/storage.js        # 配置读写与默认值（共用）
test/match.test.js    # 匹配逻辑单元测试
icons/                # 16/48/128 图标
```

## 8. 测试策略

- **匹配逻辑（`matchEnvironment`）**：单元测试，覆盖
  - 纯子串命中 / 不命中
  - 通配符 `*` 各种位置（前缀、后缀、中间、多个）
  - 大小写不敏感
  - 多规则优先级（第一条命中胜出）
  - 无规则命中返回 `null`
  - `envId` 失效时的处理
- **视觉注入**：手动验证清单
  - 普通多页面网站
  - SPA（路由切换后标记仍在）
  - 原本无 favicon 的页面
  - `chrome://` 等受限页（应安全跳过，不报错）
  - 四个开关分别开/关的组合

## 9. 范围之外（YAGNI）

- 不做正则匹配（通配符已够用）。
- 不做 Firefox 适配（后续如需再单独适配）。
- 不做账号/云端配置，仅 `chrome.storage.sync`。
- 不做按标签页临时覆盖环境的功能。
