importScripts('match.js', 'storage.js');

const { matchEnvironment } = self.EnvMatch;
const { getConfig, DEFAULTS } = self.EnvStorage;

// 首次安装写入默认配置（不覆盖已有值）
chrome.runtime.onInstalled.addListener(function () {
  getConfig().then(function (cfg) {
    chrome.storage.sync.set(cfg);
  });
});

function badgeLabel(name) {
  return (name || '').trim().charAt(0).toUpperCase() || '?';
}

async function updateBadge(tabId, url) {
  if (!url || !/^https?:/i.test(url)) {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
    return;
  }
  const cfg = await getConfig();
  const env = cfg.features.badge ? matchEnvironment(url, cfg.rules, cfg.environments) : null;
  if (env) {
    chrome.action.setBadgeText({ tabId: tabId, text: badgeLabel(env.name) });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: env.color });
  } else {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
  }
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    updateBadge(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(function (info) {
  chrome.tabs.get(info.tabId, function (tab) {
    if (tab) updateBadge(tab.id, tab.url);
  });
});

// 配置变更后刷新当前所有标签的徽章
chrome.storage.onChanged.addListener(function () {
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (t) { updateBadge(t.id, t.url); });
  });
});
