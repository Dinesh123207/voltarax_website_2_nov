const test = require('node:test');
const assert = require('node:assert/strict');
let raw, analysis;
function mock(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports }; }
mock('../models/SolarTelemetry', { latest: async () => raw, find: () => ({ sort() { return this; }, lean: async () => [] }) });
mock('../models/SolarAnalysis', { findOne: () => ({ lean: async () => analysis }) });
const { latest, dashboard, panels } = require('../services/dashboardData');
test('stale or missing telemetry never becomes current zero power or offline panel counts', async () => {
  raw = { ts: Math.floor(Date.now() / 1000) - 3600, power_mw: 1000 }; analysis = { ts: raw.ts, health_score: 100 };
  assert.equal((await latest()).reading, null);
  const data = await dashboard(); assert.equal(data.current_power_kw, null); assert.equal(data.panels_offline, null); assert.equal(data.panels_optimal, null); assert.ok(data.last_seen); assert.equal(data.status, 'UNAVAILABLE');
  assert.ok((await panels()).every(row => row.power_w === null && row.status === 'unknown'));
  raw = { ts: Math.floor(Date.now() / 1000), power_mw: 0 }; analysis = { ts: raw.ts - 5, health_score: 100 };
  assert.equal((await latest()).analysis, null); assert.equal((await dashboard()).current_power_kw, 0);
  raw = { ts: Math.floor(Date.now() / 1000) - 90, power_mw: 0 };
  assert.ok((await latest()).reading); assert.equal((await dashboard()).current_power_kw, 0);
});
