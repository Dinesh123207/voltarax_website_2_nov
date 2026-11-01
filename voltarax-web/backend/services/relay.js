const { transact } = require('./firebaseTransaction');
const { randomBytes } = require('node:crypto');
function createRelayService({ store, registry, audit, enabled = false, now = Date.now, makeId = () => randomBytes(16).toString('hex') }) {
  const seconds = () => Math.floor(now() / 1000);
  async function read(deviceId) {
    const current = await store.get(deviceId);
    if (!current) return current;
    await store.history(deviceId, current);
    if (current.status !== 'pending') return current;
    const [device, ack] = await Promise.all([registry.get(deviceId), store.ack(deviceId, current.id)]);
    let status, reason;
    const timely = ack && ack.command_id === current.id && typeof ack.success === 'boolean' && Number.isFinite(ack.received_at) && ack.received_at <= now() + 5000 && ack.received_at >= current.created_at * 1000 && ack.received_at < current.expires_at * 1000 && Number.isInteger(ack.ts) && ack.ts >= current.created_at && ack.ts < current.expires_at;
    if (!enabled || device?.enabled !== true || device?.relayEnabled !== true) { status = 'failed'; reason = 'disabled'; }
    else if (timely) { status = ack.success === true && ack.output === current.desired ? 'applied' : 'failed'; reason = status === 'applied' ? 'gpio-acknowledged' : 'device-reported-failure'; }
    else if (seconds() >= current.expires_at) { status = 'timed_out'; reason = 'No timely acknowledgement'; }
    if (!status) return current;
    const next = { ...current, status, reason, completed_at: seconds(), acknowledgement: timely ? ack : null };
    await audit({ actorId: 'relay-reconciler', action: `relay-${status}-attempt`, targetId: deviceId, commandId: current.id, desired: current.desired });
    const result = await store.transaction(deviceId, value => value?.id === current.id && value.status === 'pending' ? next : undefined);
    if (result.committed) { await store.history(deviceId, next); await audit({ actorId: 'relay-reconciler', action: `relay-${status}`, targetId: deviceId, commandId: current.id, desired: current.desired }); }
    return result.value;
  }
  return {
    read,
    async reconcilePending() { for (const id of await store.pending()) await read(id); },
    async issue(deviceId, desired, actorId, requestId) {
      if (!enabled) return { status: 503, error: 'Relay control is disabled in server configuration.' };
      const device = await registry.get(deviceId);
      if (!device || device.site_id !== (process.env.SOLAR_SITE_ID || 'solar_site') || device.enabled !== true || device.relayEnabled !== true) return { status: 403, error: 'Device relay permission is unavailable.' };
      await read(deviceId);
      const command = { id: makeId(), device_id: deviceId, site_id: device.site_id, channel: 'load', desired, status: 'pending', created_at: seconds(), expires_at: seconds() + 30, created_by: actorId, request_id: requestId || null };
      await audit({ actorId, action: 'relay-command-attempt', targetId: deviceId, commandId: command.id, desired, requestId });
      const result = await store.transaction(deviceId, current => current?.status === 'pending' ? undefined : command);
      if (!result.committed) return { status: 409, error: 'A command is already pending for this device.' };
      await store.history(deviceId, command);
      await audit({ actorId, action: 'relay-command-created', targetId: deviceId, commandId: command.id, desired, requestId });
      return { status: 202, command };
    },
    async acknowledge(deviceId, input) {
      const current = await read(deviceId);
      if (!current || current.id !== input.command_id) return { status: 404, error: 'Command not found.' };
      const existing = await store.ack(deviceId, current.id);
      if (existing) {
        if (['command_id', 'ts', 'success', 'output', 'reason'].some(key => existing[key] !== input[key])) return { status: 409, error: 'A different acknowledgement already exists.' };
        return { status: 200, command: await read(deviceId), duplicate: true };
      }
      if (current.status !== 'pending') return { status: 409, error: 'Command is no longer pending.' };
      if (input.ts < current.created_at || input.ts >= current.expires_at) return { status: 422, error: 'Invalid acknowledgement timestamp.' };
      await store.putAck(deviceId, current.id, { ...input, received_at: now() });
      return { status: 200, command: await read(deviceId) };
    },
    async pending(deviceId) { if (!enabled) return null; const current = await read(deviceId); return current?.status === 'pending' ? current : null; },
    async history(deviceId, limit = 50) { await read(deviceId); return store.list(deviceId, limit); },
  };
}
let service;
function getRelayService() {
  if (!service) {
    const { db } = require('../config/firebase');
    service = createRelayService({ enabled: process.env.RELAY_CONTROL_ENABLED === 'true', registry: require('./devices').getRegistry(), audit: require('./auditLog').audit, store: {
      get: async id => (await db.ref(`relayCommands/${id}`).get()).val(),
      transaction: async (id, update) => { const r = await transact(db.ref(`relayCommands/${id}`), update); return { committed: r.committed, value: r.snapshot.val() }; },
      ack: async (device, command) => (await db.ref(`relayAcks/${device}/${command}`).get()).val(),
      putAck: async (device, command, value) => transact(db.ref(`relayAcks/${device}/${command}`), current => current === null ? value : undefined),
      history: async (device, command) => transact(db.ref(`relayHistory/${device}/${command.id}`), current => current?.status !== 'pending' && current?.status && command.status === 'pending' ? undefined : command),
      list: async (device, limit) => Object.values((await db.ref(`relayHistory/${device}`).orderByChild('created_at').limitToLast(limit).get()).val() || {}).reverse(),
      pending: async () => Object.keys((await db.ref('relayCommands').orderByChild('status').equalTo('pending').limitToFirst(100).get()).val() || {}),
    } });
  }
  return service;
}
function startRelayReconciler(logger) {
  let stopped = false, timer;
  const tick = async () => {
    try { await getRelayService().reconcilePending(); } catch { logger.error({ event: 'relay-reconcile-failed' }, 'Relay status unavailable'); }
    if (!stopped) { timer = setTimeout(tick, 5000); timer.unref(); }
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}
module.exports = { createRelayService, getRelayService, startRelayReconciler };
