const { transact } = require('./firebaseTransaction');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const digest = key => createHash('sha256').update(key).digest('hex');
const publicDevice = row => { if (!row) return null; const { keyHash, ...safe } = row; return safe; };
function createDeviceRegistry({ store, audit, now = Date.now, generateKey = () => randomBytes(32).toString('base64url') }) {
  async function change(id, action, actorId, patch) {
    await audit({ actorId, targetId: id, action: `${action}-attempt` });
    const result = await store.transaction(id, current => current ? { ...current, ...patch, updated_at: new Date(now()).toISOString() } : undefined);
    if (!result.committed) return null;
    await audit({ actorId, targetId: id, action: `${action}-applied` });
    return publicDevice(result.value);
  }
  return {
    async create(input, actorId) {
      const key = generateKey(), stamp = new Date(now()).toISOString();
      const row = { device_id: input.device_id, site_id: input.site_id, name: input.name, enabled: true, relayEnabled: false, keyHash: digest(key), created_at: stamp, updated_at: stamp, last_seen: null, firmware_version: null };
      await audit({ actorId, targetId: row.device_id, action: 'device-register-attempt' });
      const result = await store.transaction(row.device_id, current => current === null ? row : undefined);
      if (!result.committed) return null;
      await audit({ actorId, targetId: row.device_id, action: 'device-register-applied' });
      return { device: publicDevice(result.value), key };
    },
    async rotate(id, actorId) {
      const key = generateKey(); const device = await change(id, 'device-key-rotate', actorId, { keyHash: digest(key) });
      return device ? { device, key } : null;
    },
    update: (id, input, actorId) => change(id, 'device-configure', actorId, input),
    async authenticate(id, key) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id || '') || typeof key !== 'string' || key.length > 256) return null;
      const row = await store.get(id);
      const stored = Buffer.from(row?.keyHash || '0'.repeat(64), 'hex'), supplied = Buffer.from(digest(key), 'hex');
      const valid = stored.length === supplied.length && timingSafeEqual(stored, supplied);
      return valid && row?.enabled === true ? publicDevice(row) : null;
    },
    get: async id => publicDevice(await store.get(id)),
    list: async () => (await store.list()).map(publicDevice),
    seen: (id, version) => store.transaction(id, current => current ? { ...current, last_seen: new Date(now()).toISOString(), firmware_version: version || null } : undefined),
  };
}
let registry;
function getRegistry() {
  if (!registry) {
    const { db } = require('../config/firebase');
    registry = createDeviceRegistry({ audit: require('./auditLog').audit, store: {
      get: async id => (await db.ref(`devices/${id}`).get()).val(),
      list: async () => { const snap = await db.ref('devices').orderByKey().limitToLast(200).get(); return Object.values(snap.val() || {}); },
      transaction: async (id, update) => { const result = await transact(db.ref(`devices/${id}`), update); return { committed: result.committed, value: result.snapshot.val() }; },
    } });
  }
  return registry;
}
module.exports = { createDeviceRegistry, getRegistry };
