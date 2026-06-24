(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof globalThis !== 'undefined') globalThis.EnvStorage = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const DEFAULTS = {
    environments: [
      { id: 'e-dev', name: 'dev', color: '#22c55e' },
      { id: 'e-test', name: 'test', color: '#f59e0b' },
      { id: 'e-prod', name: 'prod', color: '#ef4444' }
    ],
    rules: [],
    features: { border: true, title: true, badge: true },
    position: 'bottom-left',
    appearance: { fontSize: 28, opacity: 0.25 }
  };

  function getConfig() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(DEFAULTS, function (cfg) {
        // 合并 features，避免新增开关项缺字段
        cfg.features = Object.assign({}, DEFAULTS.features, cfg.features || {});
        cfg.appearance = Object.assign({}, DEFAULTS.appearance, cfg.appearance || {});
        resolve(cfg);
      });
    });
  }

  function setConfig(partial) {
    return new Promise(function (resolve) {
      chrome.storage.sync.set(partial, resolve);
    });
  }

  function newId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  // 色条整体随字号按比例缩放（28px 基准：padding 12/24、圆角 16）
  function barStyleFromSize(fontSize) {
    return {
      padding: Math.round(fontSize * 3 / 7) + 'px ' + Math.round(fontSize * 6 / 7) + 'px',
      borderRadius: Math.round(fontSize * 4 / 7) + 'px'
    };
  }

  return { DEFAULTS, getConfig, setConfig, newId, barStyleFromSize };
});
