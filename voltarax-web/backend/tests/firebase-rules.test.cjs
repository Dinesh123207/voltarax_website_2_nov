const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, get, set, remove } = require('firebase/database');
test('RTDB rules isolate roles/sites/devices and reject client access to account secrets', async t => {
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST !== '127.0.0.1:9000') throw new Error('Run only through the localhost demo emulator');
  const env = await initializeTestEnvironment({ projectId: 'demo-voltarax', database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync(path.join(__dirname, '../../firebase.rules.json'), 'utf8').replaceAll('PASTE_FIREBASE_DEVICE_UID_HERE', 'test-device') } });
  t.after(() => env.cleanup());
  const reading = { ts: Math.floor(Date.now() / 1000), site_id: 'solar_site', device_id: 'nodemcu-01', power_mw: 1000, sensors_ok: { ina219: true } };
  await env.withSecurityRulesDisabled(async context => {
    await set(ref(context.database()), { access: { viewer: { sites: { solar_site: true } }, other: { sites: { elsewhere: true } } }, readings: { solar_site: { first: reading } }, users: { account: { password: 'synthetic-hash' } } });
  });
  const visitor = env.unauthenticatedContext().database();
  const viewer = env.authenticatedContext('viewer', { role: 'viewer' }).database();
  const other = env.authenticatedContext('other', { role: 'viewer' }).database();
  const admin = env.authenticatedContext('admin', { role: 'admin' }).database();
  const device = env.authenticatedContext('test-device').database();
  await assertFails(get(ref(visitor, 'readings/solar_site')));
  await assertSucceeds(get(ref(viewer, 'readings/solar_site')));
  await assertFails(get(ref(other, 'readings/solar_site')));
  await assertSucceeds(get(ref(admin, 'readings/solar_site')));
  await assertFails(get(ref(device, 'readings/solar_site')));
  await assertFails(set(ref(viewer, 'readings/solar_site/wrong'), reading));
  await assertSucceeds(set(ref(device, 'readings/solar_site/second'), reading));
  await assertSucceeds(set(ref(device, 'sites/solar_site/latest'), reading));
  await assertSucceeds(set(ref(device, 'solar_site/latest'), reading));
  await assertSucceeds(set(ref(device, 'solar_site/history/second'), reading));
  await assertFails(set(ref(device, 'readings/elsewhere/second'), { ...reading, site_id: 'elsewhere' }));
  await assertFails(set(ref(device, 'readings/solar_site/third'), { ...reading, device_id: 'another-device' }));
  await assertFails(set(ref(device, 'readings/solar_site/third'), { ...reading, humidity_pct: 101 }));
  await assertFails(set(ref(device, 'readings/solar_site/third'), { ...reading, ts: reading.ts + 600 }));
  await assertFails(set(ref(device, 'readings/solar_site/third'), { ...reading, unexpected: 'value' }));
  await assertFails(remove(ref(device, 'readings/solar_site/second')));
  await assertFails(set(ref(env.authenticatedContext('wrong-device').database(), 'sites/solar_site/latest'), reading));
  for (const node of ['users', 'authChallenges', 'auditLog', 'userEmails', 'access', 'bootstrap', 'content']) {
    await assertFails(get(ref(admin, node))); await assertFails(set(ref(admin, `${node}/forged`), { role: 'admin' }));
  }
});
