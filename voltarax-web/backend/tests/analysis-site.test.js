const test = require('node:test');
const assert = require('node:assert/strict');
const store = { 'solar_site/analysis': { site_id: 'other', ts: 20, health_score: 100 }, 'sites/a/analysis': { site_id: 'a', ts: 10, health_score: 50 } };
const path = require.resolve('../services/firebaseModel');
require.cache[path] = { id: path, filename: path, loaded: true, exports: {
  clone: v => v, db: { ref: p => ({ on(event, listener) { queueMicrotask(listener); }, off() {}, get: async () => ({ val: () => store[p] || null }), update: async values => Object.assign(store, values), transaction: async update => { const value = update(store[p] || null); if (value === undefined) return { committed: false, snapshot: { val: () => store[p] } }; store[p] = value; return { committed: true, snapshot: { val: () => value } }; } }) },
} };
const Analysis = require('../models/SolarAnalysis');
test('analysis excludes another site even when its legacy value is newer', async () => {
  assert.equal((await Analysis.findOne({ site_id: 'a' }).lean()).health_score, 50);
  assert.equal(await Analysis.findOne({ site_id: 'missing' }), null);
  await Analysis.findOneAndUpdate({ site_id: 'a' }, { ts: 30, health_score: 75 });
  assert.equal(store['sites/a/analysis'].health_score, 75);
  assert.equal(store['solar_site/analysis'].site_id, 'other');
  await Analysis.findOneAndUpdate({ site_id: 'a' }, { ts: 20, health_score: 100 });
  assert.equal(store['sites/a/analysis'].ts, 30);
});
