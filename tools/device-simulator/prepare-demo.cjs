// Provision a synthetic device only in the explicitly enabled loopback demo emulator.
const { createHash } = require('node:crypto');
const { simulatorAllowed } = require('../../voltarax-web/backend/config/testMode');
async function prepareDemo(env, db) {
  if (!simulatorAllowed(env)) throw new Error('Demo emulator mode is required');
  const device = env.SIMULATOR_DEVICE_ID || 'simulator-01', site = env.SIMULATOR_SITE_ID || 'solar_site', key = env.SIMULATOR_DEVICE_KEY;
  if (!/^simulator-[A-Za-z0-9_-]{1,54}$/.test(device) || !/^[A-Za-z0-9_-]{1,64}$/.test(site) || typeof key !== 'string' || key.length < 32 || key.length > 256) throw new Error('Invalid local simulator identity/key');
  const row = { device_id: device, site_id: site, name: 'Synthetic local simulator', enabled: true, relayEnabled: false, keyHash: createHash('sha256').update(key).digest('hex'), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_seen: null, firmware_version: null };
  const result = await require('../../voltarax-web/backend/services/firebaseTransaction').transact(db.ref(`devices/${device}`), current => current === null ? row : undefined);
  if (!result.committed && (result.snapshot.val()?.keyHash !== row.keyHash || result.snapshot.val()?.site_id !== site)) throw new Error('A different simulator device already exists');
}
async function main() {
  if (!simulatorAllowed()) throw new Error('Demo emulator mode is required');
  const { db, app } = require('../../voltarax-web/backend/config/firebase');
  try { await prepareDemo(process.env, db); console.log('Synthetic demo device is prepared. No key is logged.'); }
  finally { await app.delete(); }
}
if (require.main === module) main().catch(() => { console.error('Simulator setup refused. Check the isolated demo configuration and local key.'); process.exitCode = 1; });
module.exports = { prepareDemo };
