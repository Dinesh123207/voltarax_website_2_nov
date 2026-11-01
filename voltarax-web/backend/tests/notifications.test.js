const test = require('node:test');
const assert = require('node:assert/strict');
const { eq } = require('drizzle-orm');
const { notificationOutbox } = require('../db/schema.ts');
const n = require('../services/notifications');
test('notifications default disabled and reject incomplete/invalid/demo configuration', () => {
  assert.equal(n.configured({}), false);
  const env = { NOTIFICATIONS_ENABLED: 'true', EMAIL_ENABLED: 'true', REDIS_URL: 'redis://127.0.0.1:16379', NOTIFICATION_RECIPIENTS: 'operator@example.test', SMTP_HOST: 'localhost', SMTP_FROM: 'test@example.test', SMTP_USER: 'fake', SMTP_PASS: 'synthetic' };
  assert.equal(n.configured(env), true); assert.equal(n.configured({ ...env, NOTIFICATION_RECIPIENTS: 'invalid' }), false);
  assert.equal(n.configured({ ...env, FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000', FIREBASE_PROJECT_ID: 'demo-voltarax', NODE_ENV: 'test' }), false);
  assert.throws(() => n.connectionOptions('https://example.test')); assert.equal(n.connectionOptions('rediss://localhost/1', true).maxRetriesPerRequest, null);
});
test('transactional outbox dispatch retries, skips duplicate delivery and preserves terminal failures with fake mail only', async t => {
  const c = await require('../db/client').open({ pglite: true, migrate: true }); t.after(() => c.close());
  const service = require('../services/operations').createOperations(c.db, { notificationsEnabled: true });
  await service.createAlert('test-site', { title: 'Synthetic issue', message: 'Unit test record', severity: 'warning' }, 'test-operator');
  const row = (await c.db.select().from(notificationOutbox))[0]; const jobs = new Map();
  const queue = { getJob: async id => jobs.get(id), add: async (name, data, opts) => { if (!jobs.has(opts.jobId)) jobs.set(opts.jobId, { data, opts, attemptsMade: 0, getState: async () => 'waiting' }); } };
  await n.dispatchOutbox(c.db, queue); await n.dispatchOutbox(c.db, queue); assert.equal(jobs.size, 1);
  const job = jobs.get(row.id); assert.equal(job.opts.attempts, 5); assert.equal(job.opts.backoff.type, 'exponential');
  const failing = n.createProcessor({ db: c.db, send: async () => { throw new Error('synthetic delivery failure'); } });
  await assert.rejects(failing(job)); job.attemptsMade = 1; await n.recordFailure(c.db, job);
  let sent = 0; const send = n.createProcessor({ db: c.db, send: async (record, message) => { sent++; assert.match(message.html, /Voltarax operations update/); assert.equal(record.id, row.id); } });
  await send(job); assert.equal((await send(job)).skipped, true); assert.equal(sent, 1);
  await c.db.update(notificationOutbox).set({ status: 'queued' }).where(eq(notificationOutbox.id, row.id)); job.attemptsMade = 5;
  await n.recordFailure(c.db, job); assert.equal((await c.db.select().from(notificationOutbox))[0].status, 'dead_letter');
  assert.equal((await send(job)).skipped, true);
});
