const test = require('node:test');
const assert = require('node:assert/strict');

test('timestamp range is pushed to Firebase without limiting before site filtering', async () => {
  const calls = [];
  const data = { a: { ts: 10, site_id: 'a' }, b: { ts: 20, site_id: 'b' }, c: { ts: 30, site_id: 'a' } };
  const ref = {
    orderByChild(field) { calls.push(['orderByChild', field]); return this; },
    startAt(n) { calls.push(['startAt', n]); return this; },
    endAt(n) { calls.push(['endAt', n]); return this; },
    limitToLast(n) { calls.push(['limitToLast', n]); return this; },
    async get() { return { val: () => data }; },
  };
  const config = require.resolve('../config/firebase');
  require.cache[config] = { id: config, filename: config, loaded: true, exports: { db: { ref: () => ref }, admin: {} } };
  const { FirebaseModel } = require('../services/firebaseModel');
  const rows = await new FirebaseModel('history').find({ site_id: 'a', ts: { $gte: 15, $lte: 40 } }).sort({ ts: -1 }).limit(1);
  assert.deepEqual(rows.map(r => r.ts), [30]);
  assert.deepEqual(calls, [['orderByChild', 'ts'], ['startAt', 15], ['endAt', 40]]);
});
