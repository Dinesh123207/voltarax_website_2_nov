const test = require('node:test');
const assert = require('node:assert/strict');
const { createRelayService } = require('../services/relay');
function setup(enabled = true) {
  let stamp = 2000000000000, command = null, nextId = 0, queue = Promise.resolve(); const acks = new Map(), history = new Map(), logs = [];
  const device = { enabled: true, relayEnabled: true, site_id: 'solar_site' };
  const service = createRelayService({ enabled, now: () => stamp, makeId: () => `test-command-${++nextId}`, registry: { get: async () => device }, audit: async e => logs.push(e), store: {
    get: async () => command, ack: async (id, key) => acks.get(key), putAck: async (id, key, value) => { if (!acks.has(key)) acks.set(key, value); },
    transaction(id, update) { const task = queue.then(() => { const value = update(command); if (value === undefined) return { committed: false, value: command }; command = value; return { committed: true, value }; }); queue = task.then(() => {}); return task; },
    history: async (id, value) => history.set(value.id, value), list: async () => [...history.values()],
  } });
  return { service, device, logs, advance: ms => { stamp += ms; }, ack: (id, value) => acks.set(id, value), now: () => stamp };
}
test('relay defaults disabled, serializes commands and requires a matching acknowledgement', async () => {
  assert.equal((await setup(false).service.issue('device', true, 'admin')).status, 503);
  const t = setup(); const first = await t.service.issue('device', true, 'admin'); assert.equal(first.command.status, 'pending');
  assert.equal((await t.service.issue('device', false, 'admin')).status, 409);
  const result = await t.service.acknowledge('device', { command_id: first.command.id, ts: first.command.created_at, success: true, output: true });
  assert.equal(result.command.status, 'applied'); assert.equal(result.command.acknowledgement.output, true);
  assert.equal((await t.service.acknowledge('device', { command_id: first.command.id, ts: first.command.created_at, success: true, output: true })).duplicate, true);
  assert.ok(t.logs.some(log => log.action === 'relay-command-created' && log.commandId === first.command.id));
});
test('late/mismatched/missing acknowledgements never become an applied command', async () => {
  const t = setup(); const first = await t.service.issue('device', true, 'admin');
  t.advance(31000); assert.equal((await t.service.read('device')).status, 'timed_out');
  assert.equal((await t.service.acknowledge('device', { command_id: first.command.id, ts: first.command.created_at, success: true, output: true })).status, 409);
  const second = await t.service.issue('device', true, 'admin');
  const mismatch = await t.service.acknowledge('device', { command_id: second.command.id, ts: second.command.created_at, success: true, output: false }); assert.equal(mismatch.command.status, 'failed');
  const third = await t.service.issue('device', false, 'admin'); t.device.enabled = false;
  assert.equal((await t.service.read('device')).status, 'failed'); assert.equal((await t.service.issue('device', true, 'admin')).status, 403);
});
test('a server-timestamped acknowledgement received before the deadline survives a later reconciliation', async () => {
  const t = setup(); const { command } = await t.service.issue('device', false, 'admin');
  t.ack(command.id, { command_id: command.id, ts: command.created_at + 1, received_at: t.now() + 1000, success: true, output: false });
  t.advance(60000); assert.equal((await t.service.read('device')).status, 'applied');
});
