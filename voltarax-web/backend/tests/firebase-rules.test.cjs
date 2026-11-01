const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, get, set, remove, serverTimestamp } = require('firebase/database');
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
  await assertFails(get(ref(viewer, 'solar_site/history')));
  const command = { id: 'command-current', device_id: 'nodemcu-01', site_id: 'solar_site', status: 'pending', desired: true, channel: 'load', created_at: reading.ts - 1, expires_at: reading.ts + 29 };
  await env.withSecurityRulesDisabled(async context => {
    await set(ref(context.database(), 'devices'), { 'nodemcu-01': { enabled: true, relayEnabled: true, site_id: 'solar_site', keyHash: 'synthetic-hash' }, secondary: { enabled: true, relayEnabled: false, site_id: 'solar_site' } });
    await set(ref(context.database(), 'deviceAccess/mapped-device'), { device_id: 'secondary', site_id: 'solar_site', enabled: true });
    await set(ref(context.database(), 'relayCommands/nodemcu-01'), command);
  });
  await assertSucceeds(get(ref(device, 'devices/nodemcu-01/enabled')));
  await assertSucceeds(get(ref(device, 'relayCommands/nodemcu-01')));
  await assertFails(get(ref(device, 'devices/nodemcu-01')));
  await assertFails(set(ref(device, 'relayCommands/nodemcu-01'), command));
  const ack = { command_id: command.id, ts: reading.ts, received_at: serverTimestamp(), success: true, output: true, reason: 'none' };
  await assertFails(set(ref(device, `relayAcks/nodemcu-01/${command.id}`), { ...ack, received_at: 0 }));
  await assertSucceeds(set(ref(device, `relayAcks/nodemcu-01/${command.id}`), ack));
  await assertFails(set(ref(device, `relayAcks/nodemcu-01/${command.id}`), ack));
  await assertFails(set(ref(env.authenticatedContext('wrong-device').database(), `relayAcks/nodemcu-01/${command.id}`), ack));
  const mapped = env.authenticatedContext('mapped-device').database();
  await assertSucceeds(set(ref(mapped, 'readings/solar_site/secondary'), { ...reading, device_id: 'secondary' }));
  await assertFails(set(ref(mapped, 'readings/solar_site/impostor'), reading));
  await env.withSecurityRulesDisabled(async context => {
    await set(ref(context.database(), 'devices/secondary/enabled'), false);
    await set(ref(context.database(), 'relayCommands/nodemcu-01'), { ...command, id: 'expired-command', created_at: reading.ts - 100, expires_at: reading.ts - 70 });
  });
  await assertFails(set(ref(mapped, 'readings/solar_site/disabled'), { ...reading, device_id: 'secondary' }));
  await assertFails(set(ref(device, 'relayAcks/nodemcu-01/expired-command'), { ...ack, command_id: 'expired-command', ts: reading.ts - 99 }));
});
