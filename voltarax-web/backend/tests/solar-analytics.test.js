const test = require('node:test');
const assert = require('node:assert/strict');
const modelPath = require.resolve('../models/SolarAnalysis');
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: {} };
const { evaluate } = require('../services/solarAnalytics');

test('missing essential readings cannot result in a healthy score', () => {
  const result = evaluate({ ts: Date.now() / 1000, sensors_ok: {} });
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.health_score, null);
  assert.match(result.alerts[0], /Insufficient/);
});
