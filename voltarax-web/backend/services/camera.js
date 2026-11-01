const { OperationError } = require('./operations');
const { MAX_IMAGE_BYTES, sanitizeImage } = require('./images');
function configuredUrl(value) {
  if (!value) throw new OperationError(503, 'Camera is not configured.');
  let url; try { url = new URL(value); } catch { throw new OperationError(503, 'Camera configuration is unavailable.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new OperationError(503, 'Camera configuration is unavailable.');
  return url;
}
function createCamera({ env = process.env, fetcher = fetch, snapshotTimeoutMs = 8000, streamTimeoutMs = 60000 } = {}) {
  const streams = new Set(); let snapshots = 0;
  const cameraUrl = value => {
    if (env.CAMERA_ENABLED !== 'true') throw new OperationError(503, 'Camera access is disabled or not configured.');
    const url = configuredUrl(value);
    if (require('../config/testMode').demoEmulator(env) && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new OperationError(503, 'Demo camera access requires a local test server.');
    return url;
  };
  const headers = () => env.CAMERA_USERNAME ? { Authorization: `Basic ${Buffer.from(`${env.CAMERA_USERNAME}:${env.CAMERA_PASSWORD || ''}`).toString('base64')}` } : {};
  async function snapshot() {
    const url = cameraUrl(env.CAMERA_SNAPSHOT_URL);
    if (snapshots >= 2) throw new OperationError(429, 'Camera capture is busy. Try again shortly.');
    snapshots++; const controller = new AbortController(), timer = setTimeout(() => controller.abort(), snapshotTimeoutMs);
    try {
      const response = await fetcher(url, { headers: headers(), redirect: 'error', signal: controller.signal });
      if (!response.ok || !/^image\/(jpeg|png)(?:;|$)/i.test(response.headers.get('content-type') || '') || !response.body) throw new Error('Invalid frame');
      const chunks = []; let total = 0;
      for await (const chunk of response.body) { total += chunk.length; if (total > MAX_IMAGE_BYTES) throw new Error('Large frame'); chunks.push(chunk); }
      return await sanitizeImage(Buffer.concat(chunks));
    } catch (error) { if (error instanceof OperationError) throw error; throw new OperationError(503, 'Camera offline or frame unavailable.'); }
    finally { controller.abort(); clearTimeout(timer); snapshots--; }
  }
  async function stream(req, res, userId) {
    const url = cameraUrl(env.CAMERA_STREAM_URL);
    if (streams.size >= 2 || streams.has(userId)) throw new OperationError(429, 'Camera stream is busy. Close another view and try again.');
    streams.add(userId); const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), streamTimeoutMs);
    const headerTimer = setTimeout(() => controller.abort(), 8000);
    const closed = () => controller.abort(); res.once('close', closed);
    try {
      const response = await fetcher(url, { headers: headers(), redirect: 'error', signal: controller.signal });
      clearTimeout(headerTimer);
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !/^multipart\/x-mixed-replace;\s*boundary=(?:[A-Za-z0-9_=.\-]{1,100}|"[A-Za-z0-9_=.\-]{1,100}")$/i.test(type) || !response.body) throw new Error('Invalid stream');
      res.set({ 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', 'X-Data-Quality': require('../config/testMode').demoEmulator(env) ? 'Estimated' : 'Measured', 'Content-Security-Policy': "default-src 'none'; sandbox; frame-ancestors 'none'" });
      let total = 0;
      for await (const chunk of response.body) {
        total += chunk.length; if (total > 20 * 1024 * 1024 || controller.signal.aborted) break;
        if (!res.write(Buffer.from(chunk))) await new Promise(resolve => {
          const drain = () => { cleanup(); resolve(); }; const cleanup = () => { res.off('drain', drain); res.off('close', drain); controller.signal.removeEventListener('abort', drain); };
          res.once('drain', drain); res.once('close', drain); controller.signal.addEventListener('abort', drain, { once: true });
          if (controller.signal.aborted || res.destroyed) drain();
        });
      }
      res.end();
    } catch { if (res.headersSent) res.end(); else throw new OperationError(503, 'Camera offline or stream unavailable.'); }
    finally { controller.abort(); clearTimeout(timer); clearTimeout(headerTimer); res.off('close', closed); streams.delete(userId); }
  }
  return { snapshot, stream, status: () => ({ snapshotConfigured: env.CAMERA_ENABLED === 'true' && !!env.CAMERA_SNAPSHOT_URL, streamConfigured: env.CAMERA_ENABLED === 'true' && !!env.CAMERA_STREAM_URL, online: null, quality: { online: 'Unavailable' }, note: 'Configuration does not verify camera connectivity; snapshot times are server receipt times.' }) };
}
module.exports = { configuredUrl, createCamera };
