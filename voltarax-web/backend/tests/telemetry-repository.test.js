const test = require('node:test');
const assert = require('node:assert/strict');
const { createTelemetryRepository } = require('../services/telemetryRepository');
function fakeDb(initial) {
  const store = structuredClone(initial); const calls = [];
  return { store, calls, ref(path = '') {
    let min = -Infinity, max = Infinity, before = null, count = Infinity;
    const q = {
      orderByChild(field) { assert.equal(field, 'ts'); return this; },
      startAt(n) { min = n; return this; }, endAt(n) { max = n; return this; },
      endBefore(ts, key) { before = { ts, key }; return this; },
      limitToLast(n) { count = n; return this; },
      push() { return { key: 'new-key' }; },
      async update(updates) { Object.assign(store, updates); },
      async get() {
        if (path.endsWith('/complete') || path.endsWith('/latest')) return { val: () => store[path] || null };
        assert.ok(Number.isFinite(count), 'history reads must have a server limit'); calls.push({ path, count });
        let rows = Object.entries(store[path] || {}).filter(([k, r]) => r.ts >= min && r.ts <= max && (!before || r.ts < before.ts || (r.ts === before.ts && k < before.key)));
        rows.sort(([ak, a], [bk, b]) => a.ts - b.ts || ak.localeCompare(bk)); rows = rows.slice(-count);
        return { forEach(fn) { rows.forEach(([key, value]) => fn({ key, val: () => value })); } };
      },
    }; return q;
  } };
}
test('pages past other sites, merges old and new history, and keeps tied timestamps', async () => {
  const db = fakeDb({ 'solar_site/history': { a: { ts: 1, site_id: 'a', device_id: 'd' }, b: { ts: 2, site_id: 'a', device_id: 'd' }, c: { ts: 3, site_id: 'b' }, d: { ts: 4, site_id: 'b' } },
    'readings/a': { newer: { ts: 2, site_id: 'a', device_id: 'd', power_mw: 10 }, other: { ts: 2, site_id: 'a', device_id: 'e' } } });
  const repo = createTelemetryRepository(db, { pageSize: 2 });
  const rows = await repo.find({ site_id: 'a' }).sort({ ts: -1 }).limit(3);
  assert.equal(rows.length, 3); assert.ok(rows.every(r => r.site_id === 'a'));
  assert.equal(rows.find(r => r.device_id === 'd' && r.ts === 2).power_mw, 10);
  assert.ok(db.calls.length >= 3);
  const bounded = await repo.find({ site_id: 'a', ts: { $gte: 2, $lte: 2 } }).sort({ ts: 1 });
  assert.equal(bounded.length, 2);
});
test('writes one atomic compatibility update and validates site paths', async () => {
  const db = fakeDb({}); const repo = createTelemetryRepository(db);
  await repo.create({ ts: 10, device_id: 'd' });
  assert.deepEqual(db.store['readings/solar_site/new-key'], db.store['solar_site/history/new-key']);
  assert.equal((await repo.latest()).ts, 10);
  await assert.rejects(async () => repo.find({ site_id: '../invalid' }), /Invalid site/);
});
test('migration marker disables legacy reads only for that site', async () => {
  const db = fakeDb({ 'migrations/site_history/a/complete': true, 'readings/a': { k: { site_id: 'a', ts: 1 } } });
  const rows = await createTelemetryRepository(db).find({ site_id: 'a' }).limit(1);
  assert.equal(rows.length, 1); assert.deepEqual(db.calls.map(c => c.path), ['readings/a']);
});
