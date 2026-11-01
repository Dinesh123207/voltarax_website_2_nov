const { parentPort, workerData } = require('node:worker_threads');
try {
  const input = Buffer.from(workerData); let image, bytes, mime;
  const dimensions = (width, height) => { if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 4000000) throw new Error('Dimensions'); };
  if (input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (input.length < 33 || input.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG');
    dimensions(input.readUInt32BE(16), input.readUInt32BE(20));
    const { PNG } = require('pngjs'); image = PNG.sync.read(input, { checkCRC: true });
    bytes = PNG.sync.write({ width: image.width, height: image.height, data: image.data }); mime = 'image/png';
  } else if (input[0] === 255 && input[1] === 216 && input[2] === 255) {
    const jpeg = require('jpeg-js'); image = jpeg.decode(input, { maxResolutionInMP: 4, maxMemoryUsageInMB: 64, tolerantDecoding: false, useTArray: true });
    dimensions(image.width, image.height);
    bytes = jpeg.encode({ width: image.width, height: image.height, data: image.data }, 85).data; mime = 'image/jpeg';
  } else throw new Error('Unsupported image');
  if (bytes.length > 2 * 1024 * 1024) throw new Error('Output too large');
  parentPort.postMessage({ bytes, mime, width: image.width, height: image.height });
} catch { parentPort.postMessage({ error: true }); }
