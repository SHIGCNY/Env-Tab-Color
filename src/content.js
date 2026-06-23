(function () {
  const { matchEnvironment } = globalThis.EnvMatch;
  const { getConfig } = globalThis.EnvStorage;

  const BAR_ID = '__env_tab_color_bar__';
  let currentEnv = null;
  let features = null;
  let titleObserver = null;
  let baseTitle = null;

  function ensureBar() {
    let bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = BAR_ID;
      bar.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'height:4px',
        'z-index:2147483647', 'pointer-events:none',
        'font:600 11px/16px system-ui,sans-serif', 'text-align:center',
        'color:#fff'
      ].join(';');
      (document.documentElement || document.body).appendChild(bar);
    }
    return bar;
  }

  function applyBorder(env) {
    if (features.border && env) {
      const bar = ensureBar();
      bar.style.background = env.color;
      bar.style.height = '20px';
      bar.textContent = env.name.toUpperCase();
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
    currentEnv = matchEnvironment(location.href, cfg.rules, cfg.environments);
    render();
  }

  function init() {
    getConfig().then(recompute);
  }

  // 配置变化实时重渲染
  chrome.storage.onChanged.addListener(function () {
    if (document.readyState === 'loading') return; // DOM 未就绪，等 init 时再渲染
    getConfig().then(recompute);
  });

  // SPA 路由变化：URL 变了重新计算
  let lastHref = location.href;
  const headObserver = new MutationObserver(function () {
    if (location.href !== lastHref) {
      lastHref = location.href;
      getConfig().then(recompute);
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
