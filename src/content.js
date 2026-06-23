(function () {
  const { matchEnvironment } = globalThis.EnvMatch;
  const { getConfig } = globalThis.EnvStorage;

  const BAR_ID = '__env_tab_color_bar__';
  // 角落定位映射：position 值 → 要设置的 CSS 边距
  const POSITIONS = {
    'top-left': { top: '8px', left: '8px' },
    'top-right': { top: '8px', right: '8px' },
    'bottom-left': { bottom: '8px', left: '8px' },
    'bottom-right': { bottom: '8px', right: '8px' }
  };
  let currentEnv = null;
  let features = null;
  let position = 'bottom-left';
  let titleObserver = null;
  let baseTitle = null;

  // 角落悬浮标签：不占文档流、pointer-events 穿透，避免遮挡页面原有内容
  function ensureBar() {
    let bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = BAR_ID;
      bar.style.cssText = [
        'position:fixed', 'z-index:2147483647', 'pointer-events:none',
        'padding:12px 24px', 'border-radius:16px',
        'font:600 28px/1 system-ui,sans-serif', 'letter-spacing:.5px',
        'color:#fff', 'opacity:.25', 'box-shadow:0 1px 4px rgba(0,0,0,.25)'
      ].join(';');
      (document.documentElement || document.body).appendChild(bar);
    }
    return bar;
  }

  // 按 position 设置四角定位（先清四边，避免切换位置后残留）
  function applyPosition(bar) {
    bar.style.top = bar.style.right = bar.style.bottom = bar.style.left = '';
    const pos = POSITIONS[position] || POSITIONS['bottom-left'];
    Object.keys(pos).forEach(function (k) { bar.style[k] = pos[k]; });
  }

  function applyBorder(env) {
    if (features.border && env) {
      const bar = ensureBar();
      bar.style.background = env.color;
      bar.textContent = env.name.toUpperCase();
      applyPosition(bar);
    } else {
      const bar = document.getElementById(BAR_ID);
      if (bar) bar.remove();
    }
  }

  function stripPrefix(title) {
    return title.replace(/^[\u{1F300}-\u{1FAFF}⬀-⯿]?\s*\[[^\]]+\]\s*/u, '');
  }

  function applyTitle(env) {
    if (titleObserver) { titleObserver.disconnect(); titleObserver = null; }
    if (features.title && env) {
      baseTitle = stripPrefix(document.title);
      const prefix = '[' + env.name.toUpperCase() + '] ';
      document.title = prefix + baseTitle;
      const titleEl = document.querySelector('title');
      if (titleEl) {
        titleObserver = new MutationObserver(function () {
          const want = prefix + stripPrefix(document.title);
          if (document.title !== want) document.title = want;
        });
        titleObserver.observe(titleEl, { childList: true });
      }
    } else if (baseTitle != null) {
      document.title = stripPrefix(document.title);
      baseTitle = null;
    }
  }

  function render() {
    applyBorder(currentEnv);
    applyTitle(currentEnv);
  }

  function recompute(cfg) {
    features = cfg.features;
    position = cfg.position || 'bottom-left';
    currentEnv = matchEnvironment(location.href, cfg.rules, cfg.environments);
    render();
  }

  // 扩展上下文是否仍有效：重载/更新/禁用后，旧页面里的 content script
  // 会成为孤儿，chrome.runtime.id 变为 undefined
  function alive() { return !!(chrome.runtime && chrome.runtime.id); }

  // 停掉所有观察器，让孤儿 content script 优雅停机
  function teardown() {
    if (titleObserver) { titleObserver.disconnect(); titleObserver = null; }
    headObserver.disconnect();
  }

  // 统一的重算入口：上下文失效则自我清理，避免反复抛 "Extension context invalidated"
  function safeReload() {
    if (!alive()) { teardown(); return; }
    getConfig().then(recompute).catch(function () { teardown(); });
  }

  function init() { safeReload(); }

  // 配置变化实时重渲染
  chrome.storage.onChanged.addListener(function () {
    if (document.readyState === 'loading') return; // DOM 未就绪，等 init 时再渲染
    safeReload();
  });

  // SPA 路由变化：URL 变了重新计算
  let lastHref = location.href;
  const headObserver = new MutationObserver(function () {
    if (location.href !== lastHref) {
      lastHref = location.href;
      safeReload();
    }
  });

  function startObservers() {
    const target = document.head || document.documentElement;
    if (target) headObserver.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); startObservers(); });
  } else {
    init(); startObservers();
  }
})();
