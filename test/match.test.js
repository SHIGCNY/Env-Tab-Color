const { test } = require('node:test');
const assert = require('node:assert');
const { matchEnvironment, hostFromUrl } = require('../src/match.js');

const envs = [
  { id: 'e-dev', name: 'dev', color: '#22c55e' },
  { id: 'e-test', name: 'test', color: '#f59e0b' },
  { id: 'e-prod', name: 'prod', color: '#ef4444' }
];

test('纯子串命中', () => {
  const rules = [{ id: 'r1', pattern: 'test.example.com', envId: 'e-test' }];
  const env = matchEnvironment('https://test.example.com/login', rules, envs);
  assert.strictEqual(env.id, 'e-test');
});

test('无规则命中返回 null', () => {
  const rules = [{ id: 'r1', pattern: 'test.example.com', envId: 'e-test' }];
  assert.strictEqual(matchEnvironment('https://prod.example.com/', rules, envs), null);
});

test('通配符匹配子域', () => {
  const rules = [{ id: 'r1', pattern: '*.dev.example.com', envId: 'e-dev' }];
  const env = matchEnvironment('https://app.dev.example.com/', rules, envs);
  assert.strictEqual(env.id, 'e-dev');
});

test('通配符匹配 IP 段', () => {
  const rules = [{ id: 'r1', pattern: '192.168.*', envId: 'e-dev' }];
  const env = matchEnvironment('http://192.168.1.20:8080/', rules, envs);
  assert.strictEqual(env.id, 'e-dev');
});

test('大小写不敏感', () => {
  const rules = [{ id: 'r1', pattern: 'TEST-', envId: 'e-test' }];
  const env = matchEnvironment('https://test-portal.corp/', rules, envs);
  assert.strictEqual(env.id, 'e-test');
});

test('多规则按顺序第一条命中胜出', () => {
  const rules = [
    { id: 'r1', pattern: 'example.com', envId: 'e-prod' },
    { id: 'r2', pattern: 'test.example.com', envId: 'e-test' }
  ];
  const env = matchEnvironment('https://test.example.com/', rules, envs);
  assert.strictEqual(env.id, 'e-prod');
});

test('envId 失效（环境被删）视为不命中', () => {
  const rules = [{ id: 'r1', pattern: 'test.example.com', envId: 'e-gone' }];
  assert.strictEqual(matchEnvironment('https://test.example.com/', rules, envs), null);
});

test('特殊正则字符按字面处理', () => {
  const rules = [{ id: 'r1', pattern: 'a.b+c', envId: 'e-dev' }];
  assert.strictEqual(matchEnvironment('https://axbxc.com/', rules, envs), null);
  const env = matchEnvironment('https://a.b+c.com/', rules, envs);
  assert.strictEqual(env.id, 'e-dev');
});

test('pattern 中的字面空格按字面处理（不当作通配符）', () => {
  const rules = [{ id: 'r1', pattern: 'my domain.com', envId: 'e-dev' }];
  assert.strictEqual(matchEnvironment('https://myXdomain.com/', rules, envs), null);
});

test('通配符路径大小写不敏感', () => {
  const rules = [{ id: 'r1', pattern: '*.DEV.example.com', envId: 'e-dev' }];
  const env = matchEnvironment('https://app.dev.example.com/', rules, envs);
  assert.strictEqual(env.id, 'e-dev');
});

test('同时含空格与通配符：空格字面、*通配', () => {
  const rules = [{ id: 'r1', pattern: 'a *b', envId: 'e-dev' }];
  // 旧实现会把字面空格也当通配符从而误命中 'aXXXb'，新实现不应命中
  assert.strictEqual(matchEnvironment('https://aXXXb.com/', rules, envs), null);
  // 空格按字面、* 通配，应命中 'a XXXb'
  assert.strictEqual(matchEnvironment('a XXXb', rules, envs).id, 'e-dev');
});

test('hostFromUrl 普通域名', () => {
  assert.strictEqual(hostFromUrl('https://test.example.com/login'), 'test.example.com');
});

test('hostFromUrl 带端口', () => {
  assert.strictEqual(hostFromUrl('http://192.168.1.20:8080/x?y=1'), '192.168.1.20:8080');
});

test('hostFromUrl 带路径/查询/锚点只取 host', () => {
  assert.strictEqual(hostFromUrl('https://a.test.com/p/q?k=v#h'), 'a.test.com');
});

test('hostFromUrl 区分子域', () => {
  assert.notStrictEqual(hostFromUrl('https://a.test.com/'), hostFromUrl('https://b.test.com/'));
  assert.strictEqual(hostFromUrl('https://a.test.com/'), 'a.test.com');
  assert.strictEqual(hostFromUrl('https://b.test.com/'), 'b.test.com');
});

test('hostFromUrl 默认端口不带端口', () => {
  assert.strictEqual(hostFromUrl('https://test.example.com:443/'), 'test.example.com');
});

test('hostFromUrl 非 http(s) 返回 null', () => {
  assert.strictEqual(hostFromUrl('chrome://extensions'), null);
});

test('hostFromUrl 非法或空 URL 返回 null', () => {
  assert.strictEqual(hostFromUrl(''), null);
  assert.strictEqual(hostFromUrl('not a url'), null);
});
