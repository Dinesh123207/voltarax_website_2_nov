const test = require('node:test');
const assert = require('node:assert/strict');
const { bootstrapAdmin } = require('../services/bootstrapAdmin');
test('bootstrap is explicitly enabled, once only and never creates a verified/default account', async () => {
  let claimed = false, created, logged;
  const deps = { env: { BOOTSTRAP_ADMIN_ENABLED: 'true', ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'synthetic-test-password', ADMIN_NAME: 'Test Admin' },
    users: { find: () => ({ limit() { return this; }, lean: async () => [] }), create: async data => { created = data; return { _id: 'test-admin' }; } },
    lock: { claim: async () => { if (claimed) return false; claimed = true; return true; }, complete: async () => {} }, audit: async data => { logged = data; } };
  await assert.rejects(bootstrapAdmin({ ...deps, env: {} }), /disabled/);
  assert.equal(await bootstrapAdmin(deps), 'test-admin');
  assert.equal(created.role, 'admin'); assert.equal(created.emailVerified, undefined); assert.equal(logged.action, 'admin-bootstrap');
  await assert.rejects(bootstrapAdmin(deps), /claimed/);
});
