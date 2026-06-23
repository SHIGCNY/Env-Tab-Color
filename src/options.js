(function () {
  const { getConfig, setConfig, newId } = globalThis.EnvStorage;
  let cfg = null;

  const FEATURE_LABELS = {
    border: '页面色条', favicon: '彩色 favicon', title: '标题前缀', badge: '图标徽章'
  };

  function save() { return setConfig({
    environments: cfg.environments, rules: cfg.rules, features: cfg.features
  }); }

  function renderFeatures() {
    const box = document.getElementById('features');
    box.innerHTML = '';
    Object.keys(FEATURE_LABELS).forEach(function (key) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!cfg.features[key];
      cb.addEventListener('change', function () {
        cfg.features[key] = cb.checked; save();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + FEATURE_LABELS[key]));
      box.appendChild(label);
    });
  }

  function renderEnvs() {
    const ul = document.getElementById('envList');
    ul.innerHTML = '';
    cfg.environments.forEach(function (env) {
      const li = document.createElement('li');
      li.className = 'row';
      const name = document.createElement('input');
      name.type = 'text'; name.value = env.name;
      name.addEventListener('input', function () { env.name = name.value; save(); });
      const color = document.createElement('input');
      color.type = 'color'; color.value = env.color;
      color.addEventListener('input', function () { env.color = color.value; save(); });
      const del = document.createElement('button');
      del.textContent = '删除';
      del.addEventListener('click', function () {
        cfg.environments = cfg.environments.filter(function (e) { return e.id !== env.id; });
        save().then(render);
      });
      li.append(color, name, del);
      ul.appendChild(li);
    });
  }

  function renderRules() {
    const ul = document.getElementById('ruleList');
    ul.innerHTML = '';
    cfg.rules.forEach(function (rule, idx) {
      const li = document.createElement('li');
      li.className = 'row';
      const pattern = document.createElement('input');
      pattern.type = 'text'; pattern.value = rule.pattern;
      pattern.placeholder = '例如 *.dev.example.com';
      pattern.addEventListener('input', function () { rule.pattern = pattern.value; save(); });
      const sel = document.createElement('select');
      cfg.environments.forEach(function (env) {
        const opt = document.createElement('option');
        opt.value = env.id; opt.textContent = env.name;
        if (env.id === rule.envId) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () { rule.envId = sel.value; save(); });
      const up = document.createElement('button');
      up.textContent = '↑'; up.disabled = idx === 0;
      up.addEventListener('click', function () {
        const t = cfg.rules[idx - 1]; cfg.rules[idx - 1] = rule; cfg.rules[idx] = t;
        save().then(render);
      });
      const down = document.createElement('button');
      down.textContent = '↓'; down.disabled = idx === cfg.rules.length - 1;
      down.addEventListener('click', function () {
        const t = cfg.rules[idx + 1]; cfg.rules[idx + 1] = rule; cfg.rules[idx] = t;
        save().then(render);
      });
      const del = document.createElement('button');
      del.textContent = '删除';
      del.addEventListener('click', function () {
        cfg.rules = cfg.rules.filter(function (r) { return r.id !== rule.id; });
        save().then(render);
      });
      li.append(pattern, sel, up, down, del);
      ul.appendChild(li);
    });
  }

  function render() { renderFeatures(); renderEnvs(); renderRules(); }

  document.getElementById('addEnv').addEventListener('click', function () {
    cfg.environments.push({ id: newId('e'), name: 'new', color: '#3b82f6' });
    save().then(render);
  });
  document.getElementById('addRule').addEventListener('click', function () {
    const firstEnv = cfg.environments[0];
    cfg.rules.push({ id: newId('r'), pattern: '', envId: firstEnv ? firstEnv.id : '' });
    save().then(render);
  });

  getConfig().then(function (c) { cfg = c; render(); });
})();
