# 「添加当前页到指定环境」按钮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 popup 弹窗里加一个按钮，把当前标签页的完整 host（hostname[:port]）一键加入选定环境的规则中。

**Architecture:** 新增纯函数 `hostFromUrl` 到 `src/match.js`（可在 node 单测）负责从 URL 提取 host；popup 复用它和 `EnvStorage.setConfig`，提供「选环境 + 添加当前页」控件，去重更新或顶端插入规则，保存后本地重渲染当前环境块。

**Tech Stack:** 原生 JavaScript + HTML/CSS，零依赖、零构建。`hostFromUrl` 用 `node --test` 单测。

---

## 文件结构

- `src/match.js`（修改）：新增并通过 UMD 导出 `hostFromUrl`。
- `test/match.test.js`（修改）：新增 `hostFromUrl` 单元测试。
- `src/popup.html`（修改）：在「当前环境」块与「标记开关」之间加入控件行（select + button + host 提示）。
- `src/popup.js`（修改）：渲染控件、默认选中、点击添加（去重 + 顶端插入）、保存后重渲染当前环境块。

不改动：`src/storage.js`、`src/background.js`、`src/content.js`、`src/options.*`、`manifest.json`。

---

## Task 1: 纯函数 `hostFromUrl`（TDD）

**Files:**
- Modify: `src/match.js`
- Test: `test/match.test.js`

- [ ] **Step 1: 写失败的测试**

在 `test/match.test.js` 末尾追加（注意：`matchEnvironment` 已从 `../src/match.js` 解构导入；本步新增解构 `hostFromUrl`，请把文件顶部的 require 行改为同时引入两者）。

把文件顶部：
```js
const { matchEnvironment } = require('../src/match.js');
```
改为：
```js
const { matchEnvironment, hostFromUrl } = require('../src/match.js');
```

并在文件末尾追加这些测试：
```js
test('hostFromUrl 普通域名', () => {
  assert.strictEqual(hostFromUrl('https://test.example.com/login'), 'test.example.com');
});

test('hostFromUrl 带端口', () => {
  assert.strictEqual(hostFromUrl('http://192.168.1.20:8080/x?y=1'), '192.168.1.20:8080');
});

test('hostFromUrl 带路径/查询/锚点只取 host', () => {
  assert.strictEqual(hostFromUrl('https://a.test.com/p/q?k=v#h'), 'a.test.com');
});

test('hostFromUrl 区分子域', () => {
  assert.notStrictEqual(hostFromUrl('https://a.test.com/'), hostFromUrl('https://b.test.com/'));
  assert.strictEqual(hostFromUrl('https://a.test.com/'), 'a.test.com');
  assert.strictEqual(hostFromUrl('https://b.test.com/'), 'b.test.com');
});

test('hostFromUrl 默认端口不带端口', () => {
  assert.strictEqual(hostFromUrl('https://test.example.com:443/'), 'test.example.com');
});

test('hostFromUrl 非 http(s) 返回 null', () => {
  assert.strictEqual(hostFromUrl('chrome://extensions'), null);
});

test('hostFromUrl 非法或空 URL 返回 null', () => {
  assert.strictEqual(hostFromUrl(''), null);
  assert.strictEqual(hostFromUrl('not a url'), null);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test test/match.test.js`
Expected: FAIL —— 报 `hostFromUrl is not a function`（新增的 7 条用例失败，原有 11 条仍通过）。

- [ ] **Step 3: 写最小实现**

在 `src/match.js` 的 factory 内（`matchEnvironment` 定义之后、`return` 之前）加入函数，并把 `return` 行加上 `hostFromUrl`。

加入函数：
```js
  function hostFromUrl(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u.host;
    } catch (e) {
      return null;
    }
  }
```

把原来的：
```js
  return { matchEnvironment, patternToRegExp };
```
改为：
```js
  return { matchEnvironment, patternToRegExp, hostFromUrl };
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test test/match.test.js`
Expected: PASS —— `# pass 18 # fail 0`（原 11 + 新 7）。

- [ ] **Step 5: 提交**

```bash
git add src/match.js test/match.test.js
git commit -m "feat: hostFromUrl 纯函数从 URL 提取 host"
```

---

## Task 2: popup「添加当前页」控件

**Files:**
- Modify: `src/popup.html`
- Modify: `src/popup.js`

- [ ] **Step 1: 在 popup.html 加入控件行**

在 `src/popup.html` 中，找到这一行：
```html
  <div class="toggles" id="features"></div>
```
在它**之前**插入控件行：
```html
  <div class="addrow" id="addRow">
    <select id="envSelect"></select>
    <button id="addCurrent">添加当前页 →</button>
  </div>
  <div class="muted" id="addHint"></div>
```

并在 `<style>` 块内（`a { ... }` 规则之后、`</style>` 之前）追加样式：
```css
    .addrow { display: flex; gap: 6px; margin-bottom: 6px; }
    .addrow select { flex: 1; padding: 4px; }
    .addrow button { padding: 4px 8px; cursor: pointer; }
    .muted { color: #888; font-size: 11px; margin-bottom: 10px; word-break: break-all; }
    button:disabled { cursor: not-allowed; opacity: 0.5; }
```

- [ ] **Step 2: 在 popup.js 接入逻辑**

`src/popup.js` 当前内容（供参考，整体替换为下方新版）：
```js
(function () {
  const { matchEnvironment } = globalThis.EnvMatch;
  const { getConfig, setConfig } = globalThis.EnvStorage;

  const FEATURE_LABELS = {
    border: '页面色条', favicon: '彩色 favicon', title: '标题前缀', badge: '图标徽章'
  };

  function renderEnv(cfg) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      const el = document.getElementById('env');
      const env = tab && tab.url ? matchEnvironment(tab.url, cfg.rules, cfg.environments) : null;
      if (env) {
        el.textContent = env.name.toUpperCase();
        el.style.background = env.color;
        el.classList.remove('none');
      } else {
        el.textContent = '未匹配';
        el.style.background = '';
        el.classList.add('none');
      }
    });
  }

  function renderFeatures(cfg) {
    const box = document.getElementById('features');
    box.innerHTML = '';
    Object.keys(FEATURE_LABELS).forEach(function (key) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!cfg.features[key];
      cb.addEventListener('change', function () {
        cfg.features[key] = cb.checked;
        setConfig({ features: cfg.features });
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + FEATURE_LABELS[key]));
      box.appendChild(label);
    });
  }

  document.getElementById('openOptions').addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  getConfig().then(function (cfg) { renderEnv(cfg); renderFeatures(cfg); });
})();
```

把整个 `src/popup.js` 替换为：
```js
(function () {
  const { matchEnvironment, hostFromUrl } = globalThis.EnvMatch;
  const { getConfig, setConfig, newId } = globalThis.EnvStorage;

  const FEATURE_LABELS = {
    border: '页面色条', favicon: '彩色 favicon', title: '标题前缀', badge: '图标徽章'
  };

  // 取当前活动标签，回调 (tab) —— tab 可能为 undefined
  function withActiveTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      cb(tabs[0]);
    });
  }

  function renderEnv(cfg, tab) {
    const el = document.getElementById('env');
    const env = tab && tab.url ? matchEnvironment(tab.url, cfg.rules, cfg.environments) : null;
    if (env) {
      el.textContent = env.name.toUpperCase();
      el.style.background = env.color;
      el.classList.remove('none');
    } else {
      el.textContent = '未匹配';
      el.style.background = '';
      el.classList.add('none');
    }
  }

  function renderFeatures(cfg) {
    const box = document.getElementById('features');
    box.innerHTML = '';
    Object.keys(FEATURE_LABELS).forEach(function (key) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!cfg.features[key];
      cb.addEventListener('change', function () {
        cfg.features[key] = cb.checked;
        setConfig({ features: cfg.features });
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + FEATURE_LABELS[key]));
      box.appendChild(label);
    });
  }

  // 渲染环境下拉；默认选中当前页已命中的环境，否则第一个
  function renderEnvSelect(cfg, tab) {
    const sel = document.getElementById('envSelect');
    sel.innerHTML = '';
    cfg.environments.forEach(function (env) {
      const opt = document.createElement('option');
      opt.value = env.id; opt.textContent = env.name;
      sel.appendChild(opt);
    });
    const matched = tab && tab.url ? matchEnvironment(tab.url, cfg.rules, cfg.environments) : null;
    if (matched) sel.value = matched.id;
  }

  // 渲染按钮可用态与 host 提示
  function renderAddRow(host) {
    const btn = document.getElementById('addCurrent');
    const hint = document.getElementById('addHint');
    if (host) {
      btn.disabled = false;
      hint.textContent = host;
    } else {
      btn.disabled = true;
      hint.textContent = '当前页不支持';
    }
  }

  // 点击添加：去重更新 envId，否则顶端插入新规则
  function addCurrent(cfg, host) {
    if (!host) return;
    const envId = document.getElementById('envSelect').value;
    const existing = cfg.rules.find(function (r) { return r.pattern === host; });
    if (existing) {
      existing.envId = envId;
    } else {
      cfg.rules.unshift({ id: newId('r'), pattern: host, envId: envId });
    }
    setConfig({ rules: cfg.rules }).then(function () {
      // 保存后重渲染当前环境块反映新归类
      withActiveTab(function (tab) { renderEnv(cfg, tab); });
    });
  }

  document.getElementById('openOptions').addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  getConfig().then(function (cfg) {
    withActiveTab(function (tab) {
      const host = tab && tab.url ? hostFromUrl(tab.url) : null;
      renderEnv(cfg, tab);
      renderFeatures(cfg);
      renderEnvSelect(cfg, tab);
      renderAddRow(host);
      document.getElementById('addCurrent').addEventListener('click', function () {
        addCurrent(cfg, host);
      });
    });
  });
})();
```

- [ ] **Step 3: 静态校验**

Run: `node --check src/popup.js`
Expected: 退出码 0，无输出。

确认 `src/popup.html` 中元素 id 与 popup.js 引用一致：`env`、`features`、`openOptions`、`envSelect`、`addCurrent`、`addHint`。

- [ ] **Step 4: 提交**

```bash
git add src/popup.html src/popup.js
git commit -m "feat: popup 添加当前页到指定环境按钮"
```

---

## Task 3: 手动验证

**Files:** 无（仅验证）

- [ ] **Step 1: 重新加载扩展**

`chrome://extensions` → 点该扩展的刷新按钮（已加载过则刷新，否则「加载已解压的扩展程序」选 `/Users/shig/self/code/env-tab-color`）。

- [ ] **Step 2: 逐项验证**

- [ ] 新增：打开一个 host 不在规则中的 http(s) 网站 → popup 选一个环境 → 点「添加当前页」→ 打开 options，该规则出现在规则列表**顶端**，且页面标记（色条等）立即按该环境出现。
- [ ] 区分子域：分别在 `a.<域>` 与 `b.<域>`（若可用）添加到不同环境，确认两条规则 pattern 不同、互不影响。
- [ ] 去重更新：在同一网站再次 popup 选**另一个**环境点添加 → options 中该规则的环境被改、位置不变，无重复规则。
- [ ] 优先级：先在 options 手动加一条宽泛规则（如 `test.com`）在前，再用 popup 添加一个具体 host（如 `a.test.com`）→ 具体规则插入顶端并生效（页面显示具体规则的环境）。
- [ ] 默认选中：在一个已命中某环境的页面打开 popup → 下拉默认选中该环境。
- [ ] 禁用态：在 `chrome://extensions` 页打开 popup → 按钮禁用、提示显示「当前页不支持」。
- [ ] 反馈：添加后 popup 顶部「当前环境」块即时更新为新环境。

- [ ] **Step 3: 运行单测确保未回归**

Run: `node --test test/match.test.js`
Expected: `# pass 18 # fail 0`。

---

## Self-Review 记录

- **Spec 覆盖**：粒度（完整 host）→ Task 1 `hostFromUrl` 用 `URL.host`；纯函数+导出 → Task 1；去重+顶端插入 → Task 2 `addCurrent`；popup UI（下拉/按钮/host 提示/禁用态/默认选中）→ Task 2；保存后重渲染当前环境块 → Task 2 `addCurrent` 回调；数据流经 storage.onChanged → 复用既有机制，无需改动；测试策略 → Task 1 单测 + Task 3 手动清单。不改动文件清单与 spec 一致。无遗漏。
- **占位符扫描**：各代码步骤均为完整可运行代码，无 TODO/TBD。
- **类型一致性**：`hostFromUrl(url)→string|null` 在 Task 1 定义、Task 2 使用一致；`EnvStorage` 的 `getConfig/setConfig/newId` 与既有 storage.js 导出一致；popup.html 元素 id（`env`/`features`/`openOptions`/`envSelect`/`addCurrent`/`addHint`）在 Task 2 的 html 与 js 间一一对应；规则字段 `{id,pattern,envId}` 与主体一致。
