const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express'), jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'synthetic-inspection-session-secret-32-characters';
const userPath = require.resolve('../models/User');
require.cache[userPath] = { id: userPath, filename: userPath, loaded: true, exports: { findById: id => ({ select: async () => ({ _id: id, role: id, isActive: true, emailVerified: true, siteIds: id === 'unassigned' ? [] : ['solar_site'] }) }) } };
test('inspection API authorizes photo/record writes, protects images and proxies a bounded authenticated test stream', async t => {
  const jpeg = require('jpeg-js'); const image = jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 128) }, 85).data;
  const upstream = require('node:http').createServer((req, res) => {
    if (req.url === '/capture') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(image); }
    else { res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=frame' }); res.write(Buffer.concat([Buffer.from('--frame\r\nContent-Type: image/jpeg\r\n\r\n'), image, Buffer.from('\r\n')])); }
  }).listen(0, '127.0.0.1'); await new Promise(resolve => upstream.once('listening', resolve));
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
  const c = await require('../db/client').open({ pglite: true, migrate: true }); t.after(() => c.close());
  const service = require('../services/inspections').createInspections(c.db);
  const camera = require('../services/camera').createCamera({ env: { CAMERA_ENABLED: 'true', CAMERA_STREAM_URL: upstreamUrl + '/stream', CAMERA_SNAPSHOT_URL: upstreamUrl + '/capture' } });
  const app = express(); app.use(express.json(), require('cookie-parser')(), require('../services/dataQuality').responseQuality);
  app.use(require('../routes/inspections').createInspectionRouter({ inspections: async () => service, camera }));
  app.use(require('../middleware/security').errorHandler({ error() {} }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = role => role ? { Authorization: 'Bearer ' + jwt.sign({ id: role, ver: 0 }, process.env.JWT_SECRET, { issuer: 'voltarax', audience: 'voltarax-api' }) } : {};
  const request = (path, role, method = 'GET', body) => fetch(base + path, { method, headers: { ...headers(role), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
  for (const path of ['/camera/status', '/camera/stream', '/inspections', '/inspection-photos', '/coating']) assert.equal((await request(path)).status, 401);
  assert.equal((await request('/camera/status', 'unassigned')).status, 403);
  const status = await (await request('/camera/status', 'viewer')).json(); assert.equal(status.online, null); assert.equal(JSON.stringify(status).includes(upstreamUrl), false);
  assert.equal((await request('/camera/stream?url=http://elsewhere', 'viewer')).status, 422);
  assert.equal((await request('/camera/snapshots', 'viewer', 'POST', {})).status, 403);
  const captured = await request('/camera/snapshots', 'operator', 'POST', {}); assert.equal(captured.status, 201); const photo = await captured.json();
  assert.equal(photo.captureTime, null); assert.equal('dataBase64' in photo, false);
  const protectedPhoto = await request(`/inspection-photos/${photo.id}`, 'viewer'); assert.equal(protectedPhoto.status, 200); assert.equal(protectedPhoto.headers.get('content-type'), 'image/jpeg'); assert.equal(protectedPhoto.headers.get('cache-control'), 'no-store'); await protectedPhoto.arrayBuffer();
  const invalid = await fetch(base + '/inspection-photos', { method: 'POST', headers: { ...headers('operator'), 'Content-Type': 'image/jpeg' }, body: '<svg>not a raster image</svg>' }); assert.equal(invalid.status, 422);
  const data = { kind: 'coating', area: 'Test area', condition: 'dusty', notes: 'Synthetic unit-test observation', observedAt: new Date().toISOString(), photoId: photo.id };
  assert.equal((await request('/inspections', 'viewer', 'POST', data)).status, 403);
  assert.equal((await request('/inspections', 'operator', 'POST', { ...data, siteId: 'other' })).status, 422);
  assert.equal((await request('/inspections', 'operator', 'POST', data)).status, 201);
  assert.equal((await (await request('/coating', 'viewer')).json()).areas[0].indicator.category, 'cleaning_review');
  const stream = await request('/camera/stream', 'viewer'); assert.equal(stream.status, 200); assert.match(stream.headers.get('content-type'), /multipart/);
  assert.equal((await request('/camera/stream', 'viewer')).status, 429); await stream.body.cancel();
});
