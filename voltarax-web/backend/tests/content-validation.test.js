const test = require('node:test'), assert = require('node:assert/strict'), express = require('express');
test('actual public content router rejects honeypot and oversized input before storage', async t => {
  const modelPath = require.resolve('../models/Content'), previous = require.cache[modelPath], writes = [];
  const create = async body => { writes.push(body); return { _id: 'synthetic-record' }; };
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: { Contact: { create }, DemoRequest: { create }, Subscriber: {}, Post: {} } };
  t.after(() => { if (previous) require.cache[modelPath] = previous; else delete require.cache[modelPath]; });
  // Public validation does not need the account repository. Fail closed on any
  // unrelated protected route instead of initializing a Firebase credential.
  const authPath = require.resolve('../middleware/auth'), previousAuth = require.cache[authPath];
  const denied = (_req, res) => res.sendStatus(401);
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { protect: denied, requireAdmin: denied } };
  t.after(() => { if (previousAuth) require.cache[authPath] = previousAuth; else delete require.cache[authPath]; });
  const routerPath = require.resolve('../routes/content'); delete require.cache[routerPath];
  const app = express(); app.use(express.json({ limit: '10kb' }), require('../routes/content'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port;
  const payload = { name: 'Synthetic Person', email: 'synthetic@local.test', subject: 'Test', message: 'Synthetic input for validation only.', website: '' };
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  for (const endpoint of ['/contact', '/demo']) {
    assert.equal((await post(endpoint, { ...payload, website: 'filled-by-synthetic-bot' })).status, 422);
    assert.equal((await post(endpoint, { ...payload, name: 'x'.repeat(101) })).status, 422);
    assert.equal((await post(endpoint, { ...payload, message: 'x'.repeat(2001) })).status, 422);
    assert.equal((await post(endpoint, { ...payload, role: 'admin' })).status, 422);
  }
  assert.equal(writes.length, 0);
  assert.equal((await post('/contact', payload)).status, 201); assert.equal(writes.length, 1);
  assert.equal(writes[0].message, payload.message);
});
