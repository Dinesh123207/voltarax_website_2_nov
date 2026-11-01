const test = require('node:test');
const assert = require('node:assert/strict');
const { createDeviceRegistry } = require('../services/devices');
test('device registry hashes one-time keys, rejects duplicate registration, rotates and disables credentials', async () => {
  const rows = new Map(), events = []; let number = 0, queue = Promise.resolve();
  const registry = createDeviceRegistry({ generateKey: () => `synthetic-device-key-${++number}`, audit: async e => events.push(e), store: {
    get: async id => rows.get(id), list: async () => [...rows.values()],
    transaction(id, update) { const task = queue.then(() => { const value = update(rows.get(id) || null); if (value === undefined) return { committed: false }; rows.set(id, value); return { committed: true, value }; }); queue = task.then(() => {}); return task; },
  } });
  const device = { device_id: 'simulator', site_id: 'solar_site', name: 'Test only' };
  const results = await Promise.all([registry.create(device, 'admin'), registry.create(device, 'admin')]);
  assert.equal(results.filter(Boolean).length, 1);
  const first = results.find(Boolean); assert.equal(first.device.keyHash, undefined); assert.ok(!JSON.stringify([...rows.values()]).includes(first.key));
  assert.ok(await registry.authenticate(device.device_id, first.key));
  assert.equal(await registry.authenticate('another-device', first.key), null);
  const rotated = await registry.rotate(device.device_id, 'admin');
  assert.equal(await registry.authenticate(device.device_id, first.key), null); assert.ok(await registry.authenticate(device.device_id, rotated.key));
  await registry.update(device.device_id, { enabled: false, relayEnabled: false }, 'admin');
  assert.equal(await registry.authenticate(device.device_id, rotated.key), null);
  assert.ok((await registry.list()).every(row => !('keyHash' in row) && !('key' in row)));
  assert.ok(!JSON.stringify(events).includes('synthetic-device-key'));
  assert.equal((await registry.get(device.device_id)).relayEnabled, false);
});
