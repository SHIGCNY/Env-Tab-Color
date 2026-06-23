(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof globalThis !== 'undefined') globalThis.EnvMatch = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // 把含通配符 * 的 pattern 编译成正则；其余字符按字面转义
  function patternToRegExp(pattern) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, function (ch) {
      return ch === '*' ? ' ' : '\\' + ch; // 先占位保留 *
    });
    const withWildcard = escaped.split(' ').join('.*');
    return new RegExp(withWildcard, 'i');
  }

  function matchEnvironment(url, rules, environments) {
    if (!url || !Array.isArray(rules)) return null;
    for (const rule of rules) {
      if (!rule || !rule.pattern) continue;
      let hit;
      if (rule.pattern.indexOf('*') === -1) {
        hit = url.toLowerCase().indexOf(rule.pattern.toLowerCase()) !== -1;
      } else {
        hit = patternToRegExp(rule.pattern).test(url);
      }
      if (!hit) continue;
      const env = (environments || []).find(function (e) { return e.id === rule.envId; });
      if (env) return env;
    }
    return null;
  }

  return { matchEnvironment, patternToRegExp };
});
