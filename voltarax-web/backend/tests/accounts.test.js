const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createOtpService } = require('../services/otp');
process.env.JWT_SECRET = 'synthetic-session-secret-at-least-32-characters';
process.env.NODE_ENV = 'production';
const records = new Map();
const users = {
  findOne: async ({ email }) => [...records.values()].find(u => u.email === email),
  findById: id => ({ select: async () => records.get(id), then: resolve => Promise.resolve(records.get(id)).then(resolve) }),
  create: async data => {
    const user = { ...data, _id: `user-${records.size}`, emailVerified: false, isActive: true, siteIds: [], sessionVersion: 0,
      comparePassword: async input => input === data.password, toJSON() { const { password, comparePassword, toJSON, ...safe } = this; return safe; } };
    records.set(user._id, user); return user;
  },
  update: async (id, data) => { Object.assign(records.get(id), data); return records.get(id); },
  revokeSessions: async id => { records.get(id).sessionVersion++; },
  secureUpdate: async (id, data) => { records.get(id).sessionVersion++; Object.assign(records.get(id), data); return records.get(id); },
};
const path = require.resolve('../models/User');
require.cache[path] = { id: path, filename: path, loaded: true, exports: users };
const { createAuthRouter } = require('../routes/auth');
const { protect, requireSite } = require('../middleware/auth');

test('account lifecycle verifies email, scopes sites, rejects elevation and revokes cookie/native sessions', async t => {
  const challenges = new Map(), sent = [], audits = []; let enabled = true;
  const otp = createOtpService({ secret: 'synthetic-otp-secret-at-least-32-characters', generateCode: () => '001234', send: async data => sent.push(data),
    store: { transaction: async (key, update) => { const value = update(challenges.get(key) || null); if (value === undefined) return { committed: false }; challenges.set(key, value); return { committed: true, value }; } } });
  otp.configured = () => enabled;
  const app = express(); app.use(express.json(), cookieParser());
  app.use('/auth', createAuthRouter({ users, otp, audit: async entry => audits.push(entry) }));
  app.get('/site', protect, requireSite, (req, res) => res.json({ success: true }));
  app.use((err, req, res, next) => res.status(500).json({ success: false, message: 'Server error.' }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, body, headers = {}, method = 'POST') => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const credentials = { email: 'viewer@example.test', password: 'synthetic-password' };
  assert.equal((await request('/auth/register', { ...credentials, name: 'Test Viewer', role: 'admin' })).status, 422);
  enabled = false; assert.equal((await request('/auth/register', { ...credentials, name: 'Test Viewer' })).status, 503); assert.equal(records.size, 0); enabled = true;
  let response = await request('/auth/register', { ...credentials, name: 'Test Viewer' });
  assert.equal(response.status, 202); assert.equal(response.headers.get('set-cookie'), null);
  const viewer = [...records.values()][0]; assert.equal(viewer.role, 'viewer'); assert.deepEqual(viewer.siteIds, []);
  response = await request('/auth/otp/verify', { ...credentials, code: '999999' }); assert.equal(response.status, 401);
  response = await request('/auth/otp/verify', { ...credentials, code: '001234' }); assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/);
  assert.equal((await response.json()).token, undefined);
  const session = { Cookie: cookie.split(';')[0], 'x-voltarax-request': '1' };
  assert.equal((await fetch(base + '/auth/me', { headers: session })).status, 200);
  assert.equal((await fetch(base + '/site', { headers: session })).status, 403);
  viewer.siteIds = ['solar_site']; assert.equal((await fetch(base + '/site', { headers: session })).status, 200);
  assert.equal((await request('/auth/logout', {}, { Cookie: session.Cookie })).status, 403);
  assert.equal((await request('/auth/sensitive/request', { action: 'user-access', target: 'someone' }, session)).status, 403);
  response = await request('/auth/login', { ...credentials, client: 'native' }); const native = (await response.json()).token; assert.ok(native);
  assert.equal((await request('/auth/logout', {}, session)).status, 200);
  assert.equal((await fetch(base + '/auth/me', { headers: session })).status, 401);
  assert.equal((await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${native}` } })).status, 401);
  assert.equal((await request('/auth/otp/verify', { ...credentials, code: '001234' })).status, 401);

  const admin = await users.create({ name: 'Test Admin', email: 'admin@example.test', password: 'synthetic-password', role: 'admin' }); admin.emailVerified = true;
  response = await request('/auth/login', { email: admin.email, password: 'synthetic-password' });
  const adminHeaders = { Cookie: response.headers.get('set-cookie').split(';')[0], 'x-voltarax-request': '1' };
  assert.equal((await request('/auth/sensitive/request', { action: 'user-access', target: viewer._id }, adminHeaders)).status, 202);
  const access = { role: 'operator', siteIds: ['solar_site'], isActive: true, code: '001234' };
  assert.equal((await request(`/auth/users/${viewer._id}/access`, access, adminHeaders, 'PATCH')).status, 200);
  assert.equal(viewer.role, 'operator'); assert.equal(audits.length, 2);
  assert.equal((await request(`/auth/users/${viewer._id}/access`, access, adminHeaders, 'PATCH')).status, 401);
  assert.ok(sent.every(message => /^\d{6}$/.test(message.code)));
});
