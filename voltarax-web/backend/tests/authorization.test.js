const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-only-secret';
const userPath = require.resolve('../models/User');
require.cache[userPath] = { id: userPath, filename: userPath, loaded: true, exports: {
  findById: id => ({ select: async () => ({ _id: id, role: id, isActive: true }) }),
} };
function mock(path, exports) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
mock('../services/dashboardData', {});
mock('../services/aiPredictions', {});
mock('../models/SolarTelemetry', {});
mock('../models/SolarAnalysis', {});
require.cache[userPath].exports.find = () => ({ lean: async () => [] });
const router = require('../routes/voltvision');

test('admin-only endpoint rejects unauthenticated and viewer requests', async t => {
  const app = express();
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/users`;
  assert.equal((await fetch(url)).status, 401);
  for (const [role, expected] of [['viewer', 403], ['admin', 200]]) {
    const token = jwt.sign({ id: role }, process.env.JWT_SECRET);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status, expected);
  }
  for (const [method, path] of [['PUT', '/alerts/1/resolve'], ['POST', '/cv/scan'], ['POST', '/carbon/report'], ['PUT', '/work-orders/1'], ['PATCH', '/work-orders/1']]) {
    assert.equal((await fetch(url.replace('/users', path), { method })).status, 401);
    for (const [role, expected] of [['viewer', 403], ['operator', 501], ['admin', 501]]) {
      const token = jwt.sign({ id: role }, process.env.JWT_SECRET);
      assert.equal((await fetch(url.replace('/users', path), { method, headers: { Authorization: `Bearer ${token}` } })).status, expected);
    }
  }
});
