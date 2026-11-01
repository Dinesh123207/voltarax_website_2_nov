const test = require('node:test');
const assert = require('node:assert/strict');
const values = new Map(); let sequence = 0; let queue = Promise.resolve();
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const snap = value => ({ val: () => clone(value), exists: () => value != null });
const db = { ref(path) {
  let field, expected;
  const api = { on(event, listener) { queueMicrotask(listener); }, off() {},
    push: () => ({ key: `user-${sequence++}` }),
    orderByChild(key) { field = key; return this; }, equalTo(value) { expected = value; return this; }, limitToFirst() { return this; },
    get: async () => field ? snap(Object.fromEntries([...values.entries()].filter(([key, row]) => key.startsWith(path + '/') && row[field] === expected).map(([key, row]) => [key.slice(path.length + 1), row]))) : snap(values.get(path)),
    set: async value => values.set(path, clone(value)), update: async patch => values.set(path, { ...values.get(path), ...patch }),
    transaction(update) {
      const task = queue.then(() => { const value = update(clone(values.get(path) ?? null)); if (value === undefined) return { committed: false, snapshot: snap(values.get(path)) }; values.set(path, clone(value)); return { committed: true, snapshot: snap(value) }; }); queue = task.then(() => {}); return task;
    },
  }; return api;
} };
const path = require.resolve('../services/firebaseModel');
require.cache[path] = { id: path, filename: path, loaded: true, exports: { db, clone, FirebaseQuery: class {} } };
const User = require('../models/User');
test('user repository reserves a normalized email once and atomically revokes sessions with sensitive changes', async () => {
  const data = { email: ' Case@Example.test ', password: 'synthetic-password', name: 'Test User', role: 'viewer' };
  const results = await Promise.allSettled([User.create(data), User.create(data)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const user = await User.findOne({ email: 'case@example.test' });
  assert.ok(await user.comparePassword(data.password)); assert.equal(user.emailVerified, false); assert.deepEqual(user.siteIds, []);
  assert.equal(user.toJSON().password, undefined);
  const first = await User.secureUpdate(user._id, { role: 'operator', siteIds: ['solar_site'] });
  assert.equal(first.role, 'operator'); assert.equal(first.sessionVersion, 1);
  const second = await User.secureUpdate(user._id, { password: 'synthetic-already-hashed' });
  assert.equal(second.sessionVersion, 2); assert.equal(values.get(`users/${user._id}`).password, 'synthetic-already-hashed');
  await assert.rejects(User.secureUpdate('missing', { role: 'admin' }), /unavailable/);
});
