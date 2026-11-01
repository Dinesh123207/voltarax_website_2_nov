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
test('analysis stays bound to its input timestamp and never invents a missing temperature', () => {
  const ts = Math.floor(Date.now() / 1000) - 5;
  const result = evaluate({ ts, power_mw: 1000, light_lux: 30000 });
  assert.equal(result.ts, ts); assert.equal(result.cell_temp_c, null);
  assert.equal(result.performance_ratio, undefined); assert.equal(result.status, 'UNAVAILABLE');
  const failed = evaluate({ ts, power_mw: 1000, light_lux: 30000, temp_c: 25, sensors_ok: { ina219: false } });
  assert.equal(failed.status, 'UNAVAILABLE');
});
test('collector records offline observations without treating them as new measurements', async () => {
  const { collect } = require('../services/alertCollector');
  const calls = []; const now = 2000000000000;
  await collect({ siteId: 'solar_site', now, reading: { site_id: 'other', device_id: 'nodemcu-01' }, service: { syncSignals: async (...args) => calls.push(args) } });
  assert.equal(calls.length, 0);
  await collect({ siteId: 'solar_site', now, reading: { site_id: 'solar_site', device_id: 'nodemcu-01', ts: now / 1000 - 300, power_mw: 1000, light_lux: 30000, temp_c: 25 }, service: { syncSignals: async (...args) => calls.push(args) } });
  assert.equal(calls[0][1], now / 1000); assert.ok(calls[0][2].some(s => s.sourceKey === 'telemetry-offline'));
});
