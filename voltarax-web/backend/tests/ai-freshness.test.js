const test = require('node:test');
const assert = require('node:assert/strict');
let value;
const config = require.resolve('../config/firebase');
require.cache[config] = { id: config, filename: config, loaded: true, exports: { db: {
  ref: () => ({ get: async () => ({ exists: () => value != null, val: () => value }) }),
} } };
const { getAiForecast } = require('../services/aiPredictions');

test('legacy AI output stays unavailable even with a fresh publication time', async () => {
  value = { status: 'ok', updated_at: Math.floor(Date.now() / 1000) - 7201 };
  assert.equal(await getAiForecast(), null);
  value = { status: 'ok' };
  assert.equal(await getAiForecast(), null);
  value = { status: 'ok', updated_at: Math.floor(Date.now() / 1000) };
  // A timestamp alone cannot validate schema, source age, identity or a model.
  assert.equal(await getAiForecast(), null);
});
