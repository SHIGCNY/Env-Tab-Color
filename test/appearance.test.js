const { test } = require('node:test');
const assert = require('node:assert');
const { barStyleFromSize, DEFAULTS } = require('../src/storage.js');

test('barStyleFromSize 默认 28px 还原当前硬编码', () => {
  assert.deepStrictEqual(barStyleFromSize(28), { padding: '12px 24px', borderRadius: '16px' });
});

test('barStyleFromSize 最小 16px 按比例派生', () => {
  assert.deepStrictEqual(barStyleFromSize(16), { padding: '7px 14px', borderRadius: '9px' });
});

test('barStyleFromSize 最大 48px 按比例派生', () => {
  assert.deepStrictEqual(barStyleFromSize(48), { padding: '21px 41px', borderRadius: '27px' });
});

test('DEFAULTS.appearance 为当前硬编码值', () => {
  assert.deepStrictEqual(DEFAULTS.appearance, { fontSize: 28, opacity: 0.25 });
});
