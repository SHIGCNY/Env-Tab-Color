(function () {
  const { matchEnvironment } = globalThis.EnvMatch;
  const { getConfig } = globalThis.EnvStorage;

  const BAR_ID = '__env_tab_color_bar__';
  const ICON_REL = 'icon';
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

  function faviconDataUrl(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return canvas.toDataURL('image/png');
  }

  function applyFavicon(env) {
    const existing = Array.prototype.slice.call(
      document.querySelectorAll('link[rel~="icon"]')
    );
    if (features.favicon && env) {
      const href = faviconDataUrl(env.color);
      if (existing.length) {
        existing.forEach(function (l) { l.dataset.envOrig = l.dataset.envOrig || l.href; l.href = href; });
      } else {
        const link = document.createElement('link');
        link.rel = ICON_REL;
        link.dataset.envInjected = '1';
        link.href = href;
        document.head.appendChild(link);
      }
    } else {
      existing.forEach(function (l) {
        if (l.dataset.envInjected) l.remove();
        else if (l.dataset.envOrig) { l.href = l.dataset.envOrig; delete l.dataset.envOrig; }
      });
    }
  }

  function stripPrefix(title) {
    return title.replace(/^[\u{1F300}-\u{1FAFF}⬀-⯿]?\s*\[[^\]]+\]\s*/u, '');
  }

  function applyTitle(env) {
    if (titleObserver) { titleObserver.disconnect(); titleObserver = null; }
    if (features.title && env) {
      baseTitle = stripPrefix(document.title);
      const prefix = '\u{1F534}[' + env.name.toUpperCase() + '] ';
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
    applyFavicon(currentEnv);
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
  chrome.storage.onChanged.addListener(function () { getConfig().then(recompute); });

  // SPA 路由变化：URL 变了重新计算
  let lastHref = location.href;
  const headObserver = new MutationObserver(function () {
    if (location.href !== lastHref) {
      lastHref = location.href;
      getConfig().then(recompute);
    } else {
      // favicon 被页面重置时补回
      if (features && currentEnv && features.favicon) applyFavicon(currentEnv);
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
