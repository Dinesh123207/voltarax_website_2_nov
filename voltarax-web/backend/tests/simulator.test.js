const test = require('node:test');
const assert = require('node:assert/strict');
const { demoEmulator, simulatorAllowed } = require('../config/testMode');
const { syntheticReading, localApi, sendReading } = require('../../../tools/device-simulator/index.cjs');
test('simulator defaults to marked synthetic data and cannot send to production/unconfirmed targets', async () => {
  const reading = syntheticReading({ ts: 2000000000 }); assert.equal(reading.simulated, true);
  assert.equal(demoEmulator({}), false);
  for (const env of [{ FIREBASE_DATABASE_EMULATOR_HOST: 'external.test:9000', FIREBASE_PROJECT_ID: 'demo-test' }, { FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000', FIREBASE_PROJECT_ID: 'real-project' }, { FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000', FIREBASE_PROJECT_ID: 'demo-test', NODE_ENV: 'production' }]) assert.throws(() => demoEmulator(env));
  assert.equal(simulatorAllowed({ FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000', FIREBASE_PROJECT_ID: 'demo-test', NODE_ENV: 'test', DEVICE_SIMULATOR_ENABLED: 'true' }), true);
  for (const url of ['https://example.test', 'http://127.0.0.1.example.test', 'http://user:pass@localhost', 'http://localhost/path']) assert.throws(() => localApi(url));
  let calls = 0;
  await assert.rejects(sendReading({ url: 'http://127.0.0.1:5000', key: 'synthetic-test-key', reading, fetcher: async () => { calls++; return { ok: true, json: async () => ({ simulatorAllowed: false }) }; } })); assert.equal(calls, 1);
  const result = await sendReading({ url: 'http://127.0.0.1:5000', key: 'synthetic-test-key', reading, fetcher: async (url, options) => { calls++; assert.equal(options.redirect, 'error'); return url.endsWith('/health') ? { ok: true, json: async () => ({ simulatorAllowed: true }) } : { ok: true, status: 201 }; } });
  assert.equal(result.status, 201);
  let touched = false;
  await assert.rejects(require('../../../tools/device-simulator/prepare-demo.cjs').prepareDemo({}, { ref() { touched = true; } })); assert.equal(touched, false);
});
