const test = require('node:test');
const assert = require('node:assert/strict');
const { createOtpService } = require('../services/otp');
function setup() {
  const values = new Map(); let clock = 1000000; let delivered; let queue = Promise.resolve();
  const store = { transaction(key, update) {
    const task = queue.then(() => { const next = update(values.get(key) || null); if (next === undefined) return { committed: false }; values.set(key, next); return { committed: true, value: next }; });
    queue = task.then(() => {}); return task;
  } };
  const service = createOtpService({ store, send: async message => { delivered = message; }, secret: 'test-only-otp-key-with-at-least-32-characters', now: () => clock, generateCode: () => '001234' });
  return { service, values, advance: ms => { clock += ms; }, delivered: () => delivered };
}
test('OTP is six digits, hashed at rest and consumed exactly once under concurrency', async () => {
  const t = setup(); await t.service.issue('a@example.com');
  assert.equal(t.delivered().code, '001234');
  assert.ok(!JSON.stringify([...t.values.values()]).includes('001234'));
  const results = await Promise.all([t.service.verify('a@example.com', '001234'), t.service.verify('a@example.com', '001234')]);
  assert.deepEqual(results, [true, false]);
});
test('OTP expires after ten minutes, enforces five attempts and throttles resends', async () => {
  const t = setup(); await t.service.issue('a@example.com');
  assert.equal((await t.service.issue('a@example.com')).issued, false);
  for (let i = 0; i < 5; i++) assert.equal(await t.service.verify('a@example.com', '999999'), false);
  assert.equal(await t.service.verify('a@example.com', '001234'), false);
  t.advance(60001); await t.service.issue('a@example.com'); t.advance(600000);
  assert.equal(await t.service.verify('a@example.com', '001234'), false);
});
test('verification is purpose bound and never accepts an absent challenge', async () => {
  const t = setup(); await t.service.issue('a@example.com', 'registration');
  assert.equal(await t.service.verify('a@example.com', '001234', 'sensitive'), false);
  assert.equal(await t.service.verify('b@example.com', '001234'), false);
});
