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
