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
