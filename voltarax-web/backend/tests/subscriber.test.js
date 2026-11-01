const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
let existing = null;
let saved;
const contentPath = require.resolve('../models/Content');
require.cache[contentPath] = { id: contentPath, filename: contentPath, loaded: true, exports: {
  Contact: {}, DemoRequest: {}, Post: {}, Subscriber: {
    findOne: async () => existing,
    create: async value => { saved = value; },
    findOneAndUpdate: async (filter, value) => { saved = { filter, value }; },
  },
} };
const authPath = require.resolve('../middleware/auth');
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { protect: (_req, _res, next) => next(), requireAdmin: (_req, _res, next) => next() } };
const router = require('../routes/content');

test('new and inactive subscribers are persisted as active', async t => {
  const app = express(); app.use(express.json()); app.use(router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve)); t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/subscribe`;
  const subscribe = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@example.com' }) });
  assert.equal((await subscribe()).status, 201); assert.equal(saved.isActive, true);
  existing = { _id: 'id1', isActive: false };
  assert.equal((await subscribe()).status, 200); assert.deepEqual(saved, { filter: { _id: 'id1' }, value: { isActive: true } });
});
