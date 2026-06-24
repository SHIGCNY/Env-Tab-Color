# 色条大小 / 透明度可配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户在设置页用滑块调整环境色条的字号与透明度，全局统一、实时生效。

**Architecture:** 在 `storage.js` 的 `DEFAULTS` 增加 `appearance` 分组并提供纯函数 `barStyleFromSize`（字号→padding/圆角，可单测）；`content.js` 把可变样式从创建期移到每次渲染期以支持实时刷新；`options.html/js` 增加两个滑块并即时保存。

**Tech Stack:** 原生 JS（Chrome MV3 扩展）、`chrome.storage.sync`、`node:test` 单元测试。

---

## File Structure

- `src/storage.js` — 配置默认值与读写；新增 `appearance` 默认值、`getConfig` 合并、纯函数 `barStyleFromSize`
- `src/content.js` — 注入色条；可变样式移入 `applyBorder`，读取 `appearance`
- `src/options.html` — 设置页结构；新增两个滑块
- `src/options.js` — 设置页逻辑；渲染滑块并即时保存
- `test/appearance.test.js` — `barStyleFromSize` 与 `appearance` 默认值单测

---

### Task 1: storage 层 —— appearance 默认值与 barStyleFromSize 纯函数

**Files:**
- Modify: `src/storage.js`
- Test: `test/appearance.test.js`

- [ ] **Step 1: Write the failing test**

创建 `test/appearance.test.js`：

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { barStyleFromSize, DEFAULTS } = require('../src/storage.js');

test('barStyleFromSize 默认 28px 还原当前硬编码', () => {
  assert.deepStrictEqual(barStyleFromSize(28), { padding: '12px 24px', borderRadius: '16px' });
});

test('barStyleFromSize 最小 16px 按比例派生', () => {
  assert.deepStrictEqual(barStyleFromSize(16), { padding: '7px 14px', borderRadius: '9px' });
});

test('barStyleFromSize 最大 48px 按比例派生', () => {
  assert.deepStrictEqual(barStyleFromSize(48), { padding: '21px 41px', borderRadius: '27px' });
});

test('DEFAULTS.appearance 为当前硬编码值', () => {
  assert.deepStrictEqual(DEFAULTS.appearance, { fontSize: 28, opacity: 0.25 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/appearance.test.js`
Expected: FAIL —— `barStyleFromSize is not a function` 且 `DEFAULTS.appearance` 为 `undefined`。

- [ ] **Step 3: Write minimal implementation**

在 `src/storage.js` 的 `DEFAULTS` 中新增 `appearance`（放在 `position` 之后）：

```js
    features: { border: true, title: true, badge: true },
    position: 'bottom-left',
    appearance: { fontSize: 28, opacity: 0.25 }
```

在 `getConfig` 的 `chrome.storage.sync.get` 回调里，紧接 `features` 合并之后增加 `appearance` 合并：

```js
        // 合并 features，避免新增开关项缺字段
        cfg.features = Object.assign({}, DEFAULTS.features, cfg.features || {});
        cfg.appearance = Object.assign({}, DEFAULTS.appearance, cfg.appearance || {});
        resolve(cfg);
```

在 `newId` 函数之后、`return` 之前新增纯函数，并加入返回对象：

```js
  // 色条整体随字号按比例缩放（28px 基准：padding 12/24、圆角 16）
  function barStyleFromSize(fontSize) {
    return {
      padding: Math.round(fontSize * 3 / 7) + 'px ' + Math.round(fontSize * 6 / 7) + 'px',
      borderRadius: Math.round(fontSize * 4 / 7) + 'px'
    };
  }

  return { DEFAULTS, getConfig, setConfig, newId, barStyleFromSize };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/appearance.test.js`
Expected: PASS（4 tests）。

- [ ] **Step 5: Run full test suite for regression**

Run: `node --test test/`
Expected: PASS（`match.test.js` + `appearance.test.js` 全绿）。

- [ ] **Step 6: Commit**

```bash
git add src/storage.js test/appearance.test.js
git commit -m "feat: add appearance defaults and barStyleFromSize helper"
```

---

### Task 2: content 层 —— 渲染期应用可变样式

**Files:**
- Modify: `src/content.js`

注：此任务为 DOM/扩展运行时行为，依赖 `chrome.*`，不做 node 单测，用手动验证。

- [ ] **Step 1: 顶部解构引入 barStyleFromSize**

将文件顶部：

```js
  const { getConfig } = globalThis.EnvStorage;
```

改为：

```js
  const { getConfig, barStyleFromSize } = globalThis.EnvStorage;
```

- [ ] **Step 2: 新增模块级 appearance 变量**

在 `let position = 'bottom-left';` 之后新增：

```js
  let appearance = null;
```

- [ ] **Step 3: 从 ensureBar 移除可变样式**

将 `ensureBar` 中的 `bar.style.cssText = [...]` 改为只保留不变样式（移除 padding、border-radius、font-size、opacity）：

```js
      bar.style.cssText = [
        'position:fixed', 'z-index:2147483647', 'pointer-events:none',
        'font-weight:600', 'line-height:1', 'font-family:system-ui,sans-serif',
        'letter-spacing:.5px', 'color:#fff', 'box-shadow:0 1px 4px rgba(0,0,0,.25)'
      ].join(';');
```

- [ ] **Step 4: 在 applyBorder 中应用可变样式**

将 `applyBorder` 中命中分支改为：

```js
    if (features.border && env) {
      const bar = ensureBar();
      bar.style.background = env.color;
      bar.textContent = env.name.toUpperCase();
      bar.style.fontSize = appearance.fontSize + 'px';
      const s = barStyleFromSize(appearance.fontSize);
      bar.style.padding = s.padding;
      bar.style.borderRadius = s.borderRadius;
      bar.style.opacity = appearance.opacity;
      applyPosition(bar);
    } else {
```

- [ ] **Step 5: 在 recompute 中读取 appearance**

将 `recompute` 改为：

```js
  function recompute(cfg) {
    features = cfg.features;
    position = cfg.position || 'bottom-left';
    appearance = cfg.appearance;
    currentEnv = matchEnvironment(location.href, cfg.rules, cfg.environments);
    render();
  }
```

- [ ] **Step 6: 手动验证（加载扩展）**

1. Chrome 打开 `chrome://extensions`，开启「开发者模式」，「加载已解压的扩展程序」选 `src` 所在的项目根目录（含 `manifest.json`）。
2. 在扩展设置页加一条命中当前测试页的规则。
3. 打开命中页面，确认色条按默认 **28px / 透明度 0.25** 显示，外观与改动前一致。

Expected: 色条正常显示，字号/内边距/圆角/透明度与原先视觉一致。

- [ ] **Step 7: Commit**

```bash
git add src/content.js
git commit -m "feat: apply bar size and opacity at render time"
```

---

### Task 3: options 层 —— 字号 / 透明度滑块

**Files:**
- Modify: `src/options.html`
- Modify: `src/options.js`

注：此任务为设置页 UI，依赖 `chrome.storage`，用手动验证。

- [ ] **Step 1: 在 options.html 增加两个滑块**

在 `<div class="row"><span>色条位置</span>...</div>` 这一行之后新增：

```html
  <div class="row"><span>色条字号</span><input type="range" id="fontSize" min="16" max="48" step="1"><span id="fontSizeVal" class="muted"></span></div>
  <div class="row"><span>色条透明度</span><input type="range" id="opacity" min="5" max="100" step="5"><span id="opacityVal" class="muted"></span></div>
```

- [ ] **Step 2: 在 options.js 新增 renderAppearance**

在 `renderPosition` 函数之后新增：

```js
  function renderAppearance() {
    const fs = document.getElementById('fontSize');
    const fsVal = document.getElementById('fontSizeVal');
    fs.value = cfg.appearance.fontSize;
    fsVal.textContent = cfg.appearance.fontSize + 'px';
    fs.oninput = function () {
      cfg.appearance.fontSize = Number(fs.value);
      fsVal.textContent = fs.value + 'px';
      save();
    };
    const op = document.getElementById('opacity');
    const opVal = document.getElementById('opacityVal');
    const pct = Math.round(cfg.appearance.opacity * 100);
    op.value = pct;
    opVal.textContent = pct + '%';
    op.oninput = function () {
      cfg.appearance.opacity = Number(op.value) / 100;
      opVal.textContent = op.value + '%';
      save();
    };
  }
```

- [ ] **Step 3: 在 save() 写入 appearance**

将 `save` 改为：

```js
  function save() { return setConfig({
    environments: cfg.environments, rules: cfg.rules, features: cfg.features,
    position: cfg.position, appearance: cfg.appearance
  }); }
```

- [ ] **Step 4: 在 render() 调用 renderAppearance**

将 `render` 改为：

```js
  function render() { renderFeatures(); renderPosition(); renderAppearance(); renderEnvs(); renderRules(); }
```

- [ ] **Step 5: 手动验证（实时生效）**

1. `chrome://extensions` 点击扩展的「重新加载」。
2. 打开扩展设置页，确认出现「色条字号」「色条透明度」两个滑块，且数值显示为 `28px` / `25%`。
3. 打开一个命中规则的页面，拖动滑块：字号滑块改变时色条整体放大/缩小，透明度滑块改变时色条浓淡变化，**无需刷新页面**即实时更新。
4. 重新打开设置页，确认滑块值被持久化（仍为上次设置）。

Expected: 滑块实时联动色条，且配置持久化。

- [ ] **Step 6: Commit**

```bash
git add src/options.html src/options.js
git commit -m "feat: add bar size and opacity sliders to options page"
```

---

## 验收

- `node --test test/` 全绿。
- 设置页可调字号（16–48px）与透明度（5–100%），色条实时联动且持久化。
- 老用户无 `appearance` 字段时回落到 28px / 0.25，表现不变。
