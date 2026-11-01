const test = require('node:test');
const assert = require('node:assert/strict');
let value;
const config = require.resolve('../config/firebase');
require.cache[config] = { id: config, filename: config, loaded: true, exports: { db: {
  ref: () => ({ get: async () => ({ exists: () => value != null, val: () => value }) }),
} } };
const { getAiForecast } = require('../services/aiPredictions');

test('stale or undated AI output is unavailable', async () => {
  value = { status: 'ok', updated_at: Math.floor(Date.now() / 1000) - 7201 };
  assert.equal(await getAiForecast(), null);
  value = { status: 'ok' };
  assert.equal(await getAiForecast(), null);
  value = { status: 'ok', updated_at: Math.floor(Date.now() / 1000) };
  assert.equal((await getAiForecast()).status, 'ok');
});
