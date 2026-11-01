const test = require('node:test');
const assert = require('node:assert/strict');
const { createDeviceIngest } = require('../services/deviceIngest');
test('ingest is idempotent, rejects conflicting replay/time skew and never rolls latest back', async () => {
  const values = new Map(); let failBridge = false;
  const db = { ref: path => ({ on(event, listener) { queueMicrotask(listener); }, off() {},
    transaction: async update => { const current = values.get(path) ?? null; const value = update(current); if (value === undefined) return { committed: false, snapshot: { val: () => current } }; values.set(path, value); return { committed: true, snapshot: { val: () => value } }; },
    update: async updates => { if (failBridge) throw new Error('synthetic transient failure'); for (const [key, value] of Object.entries(updates)) values.set(key, value); },
  }) };
  const ingest = createDeviceIngest({ db, now: () => 2000000000000, primaryDevice: 'primary' });
  const reading = { ts: 2000000000, device_id: 'primary', site_id: 'solar_site', power_mw: 1000 };
  assert.equal((await ingest(reading)).status, 201); assert.equal((await ingest({ ...reading })).duplicate, true);
  assert.equal((await ingest({ ...reading, power_mw: 2000 })).status, 409);
  assert.equal((await ingest({ ...reading, ts: reading.ts + 301 })).status, 422);
  assert.equal((await ingest({ ...reading, ts: reading.ts - 86401 })).status, 422);
  const old = await ingest({ ...reading, ts: reading.ts - 10 }); assert.equal(old.outOfOrder, true);
  assert.equal(values.get('sites/solar_site/latest').ts, reading.ts);
  await ingest({ ...reading, device_id: 'secondary', ts: reading.ts + 1 }); assert.equal(values.get('sites/solar_site/latest').device_id, 'primary');
  failBridge = true; const next = { ...reading, ts: reading.ts + 2 }; await assert.rejects(ingest(next));
  failBridge = false; const repaired = await ingest(next); assert.equal(repaired.duplicate, true); assert.equal(values.get('solar_site/history/primary-2000000002').ts, next.ts);
});
