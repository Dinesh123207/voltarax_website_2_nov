const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { OperationError } = require('./operations');
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
let active = 0;
async function sanitizeImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > MAX_IMAGE_BYTES) throw new OperationError(422, 'Choose a JPEG or PNG photo up to 2 MB and four megapixels.');
  if (active >= 2) throw new OperationError(429, 'Photo processing is busy. Try again shortly.');
  active++;
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'imageWorker.js'), { workerData: buffer, resourceLimits: { maxOldGenerationSizeMb: 128 } });
      let settled = false;
      const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); worker.terminate().catch(() => {}); error ? reject(error) : resolve(value); };
      const timer = setTimeout(() => finish(new OperationError(422, 'Photo could not be safely processed. Resize or export it as a standard JPEG/PNG.')), 10000);
      worker.once('message', result => result.error ? finish(new OperationError(422, 'Photo could not be safely processed. Use a valid JPEG/PNG up to four megapixels.')) : finish(null, { ...result, bytes: Buffer.from(result.bytes) }));
      worker.once('error', () => finish(new OperationError(422, 'Photo processing failed.')));
      worker.once('exit', () => { if (!settled) finish(new OperationError(422, 'Photo processing failed.')); });
    });
  } finally { active--; }
}
module.exports = { sanitizeImage, MAX_IMAGE_BYTES };
