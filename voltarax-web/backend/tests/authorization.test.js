const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-only-secret';
process.env.HARDWARE_API_KEY = 'test-device-key';
const userPath = require.resolve('../models/User');
require.cache[userPath] = { id: userPath, filename: userPath, loaded: true, exports: {
  findById: id => ({ select: async () => ({ _id: id, role: id, isActive: true }) }),
} };
function mock(path, exports) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
const chain = () => ({ sort() { return this; }, limit() { return this; }, lean() { return this; }, then(resolve) { return Promise.resolve([]).then(resolve); } });
mock('../services/dashboardData', { dashboard: async () => ({}), panels: async () => [], latest: async () => ({ reading: null, analysis: null }) });
mock('../services/aiPredictions', { getAiForecast: async () => null, getAiAnomaly: async () => null, getAiHealth: async () => null, getAiStatus: async () => null });
mock('../models/SolarTelemetry', { find: chain, latest: async () => null, create: async data => data });
mock('../models/SolarAnalysis', { findOne: () => ({ lean: async () => null }) });
mock('../services/solarAnalytics', { saveAnalysis: async () => ({}) });
const contentModel = { find: chain, countDocuments: async () => 0 };
mock('../models/Content', { Contact: contentModel, DemoRequest: contentModel, Subscriber: contentModel, Post: contentModel });
require.cache[userPath].exports.find = () => ({ lean: async () => [] });
const router = require('../routes/voltvision');

test('admin-only endpoint rejects unauthenticated and viewer requests', async t => {
  const app = express();
  app.use(express.json());
  app.use('/api', require('../routes/content'));
  app.use('/telemetry', require('../routes/telemetry'));
  app.use('/auth', require('../routes/auth'));
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
  for (const path of ['/api/admin/contacts', '/api/admin/demos', '/api/admin/stats']) {
    assert.equal((await fetch(url.replace('/users', path))).status, 401);
    for (const [role, expected] of [['viewer', 403], ['admin', 200]]) {
      const token = jwt.sign({ id: role }, process.env.JWT_SECRET);
      assert.equal((await fetch(url.replace('/users', path), { headers: { Authorization: `Bearer ${token}` } })).status, expected);
    }
  }
  for (const path of ['/auth/me', '/telemetry/latest', '/telemetry/history', '/telemetry/analysis', '/dashboard', '/panels', '/alerts', '/forecast', '/forecast/hourly', '/ai/status', '/bfci', '/bfci/shap/1', '/cv', '/cv/summary', '/relay', '/relay/history', '/carbon', '/carbon/monthly', '/work-orders', '/system', '/health']) {
    assert.equal((await fetch(url.replace('/users', path))).status, 401, path);
    const token = jwt.sign({ id: 'viewer' }, process.env.JWT_SECRET);
    assert.equal((await fetch(url.replace('/users', path), { headers: { Authorization: `Bearer ${token}` } })).status, 200, path);
  }
  assert.equal((await fetch(url.replace('/users', '/telemetry/ingest'), { method: 'POST' })).status, 401);
  assert.equal((await fetch(url.replace('/users', '/telemetry/ingest'), { method: 'POST', headers: { 'x-device-key': process.env.HARDWARE_API_KEY } })).status, 201);
});
