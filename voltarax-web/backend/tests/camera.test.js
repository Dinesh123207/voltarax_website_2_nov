const test = require('node:test');
const assert = require('node:assert/strict');
const { createCamera } = require('../services/camera');
test('raster re-encoding removes JPEG metadata while preserving pixel dimensions', async () => {
  const jpeg = require('jpeg-js'); const original = jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 128) }, 85).data;
  const privateComment = Buffer.from('synthetic-private-photo-comment'); const segment = Buffer.alloc(4);
  segment[0] = 255; segment[1] = 254; segment.writeUInt16BE(privateComment.length + 2, 2);
  const input = Buffer.concat([original.subarray(0, 2), segment, privateComment, original.subarray(2)]);
  const image = await require('../services/images').sanitizeImage(input);
  assert.equal(image.bytes.includes(privateComment), false); assert.equal(image.width, 2); assert.equal(image.height, 2);
});
test('camera defaults unavailable and image sanitation rejects active/malformed/oversized input', async () => {
  const camera = createCamera({ env: {} }); assert.equal(camera.status().online, null);
  await assert.rejects(camera.snapshot(), error => error.status === 503);
  const { sanitizeImage } = require('../services/images');
  await assert.rejects(sanitizeImage(Buffer.from('<svg><script>unsafe</script></svg>')), error => error.status === 422);
  await assert.rejects(sanitizeImage(Buffer.alloc(2 * 1024 * 1024 + 1)), error => error.status === 422);
  const png = Buffer.alloc(33); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png); png.write('IHDR', 12); png.writeUInt32BE(100000, 16); png.writeUInt32BE(100000, 20);
  await assert.rejects(sanitizeImage(png), error => error.status === 422);
});
test('camera uses only a fixed URL, refuses redirects/offline/HTML and sanitizes an actual local test frame', async t => {
  const jpeg = require('jpeg-js'); const bytes = jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 128) }, 85).data;
  const http = require('node:http'); let redirected = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/capture') { assert.equal(req.headers.authorization, 'Basic ' + Buffer.from('synthetic-user:synthetic-password').toString('base64')); res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(bytes); }
    else if (req.url === '/redirect') { res.writeHead(302, { Location: '/must-not-fetch' }); res.end(); }
    else { redirected++; res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<h1>not an image</h1>'); }
  }).listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;
  const env = { CAMERA_ENABLED: 'true', CAMERA_SNAPSHOT_URL: url + '/capture', CAMERA_USERNAME: 'synthetic-user', CAMERA_PASSWORD: 'synthetic-password' };
  const camera = createCamera({ env }); const image = await camera.snapshot(); assert.equal(image.width, 2); assert.equal(image.mime, 'image/jpeg');
  assert.equal(JSON.stringify(camera.status()).includes(url), false); assert.equal(JSON.stringify(camera.status()).includes('synthetic-password'), false);
  await assert.rejects(createCamera({ env: { CAMERA_ENABLED: 'true', CAMERA_SNAPSHOT_URL: url + '/redirect' } }).snapshot(), error => error.status === 503); assert.equal(redirected, 0);
  await assert.rejects(createCamera({ env: { CAMERA_ENABLED: 'true', CAMERA_SNAPSHOT_URL: url + '/html' } }).snapshot(), error => error.status === 503);
});
