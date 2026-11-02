// Offline operator CLI, never called on an upload or from a request handler.
import {createReadStream} from 'node:fs';
import {open, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parser} from 'stream-json';
import {pick} from 'stream-json/filters/pick.js';
import {streamArray} from 'stream-json/streamers/stream-array.js';
import chain from 'stream-chain';
import boundaries from '../services/mapBoundaries.js';
const [file, propertyConfig = 'ST_NM,state'] = process.argv.slice(2);
try {
  if (!file) throw Error('Usage: node scripts/verify-geojson.mjs FILE [ST_NM,state]');
  const size = (await stat(file)).size;
  if (size > 200 * 1024 * 1024) throw Error('Offline review limit is 200 MiB');
  const handle = await open(file, 'r');
  let prefix; try { const buffer = Buffer.alloc(512); const read = await handle.read(buffer, 0, buffer.length, 0); prefix = buffer.subarray(0, read.bytesRead).toString(); } finally { await handle.close(); }
  if (prefix.includes('git-lfs.github.com/spec/')) throw Error('Git LFS pointer: open the source file on GitHub and use Download raw file; do not save the pointer');
  const properties = boundaries.stateProperties(propertyConfig), stats = boundaries.newStats(10000000), hash = createHash('sha256');
  const input = createReadStream(file); input.on('data', bytes => hash.update(bytes));
  let depth=0, rootKey='', rootType=null, customCrs=false;
  const stream = chain([input, parser(), token => {
    if (token.name === 'keyValue' && depth === 1) { rootKey=token.value; if(rootKey === 'crs') customCrs=true; }
    if (token.name === 'stringValue' && depth === 1 && rootKey === 'type') rootType=token.value;
    if (token.name === 'startObject' || token.name === 'startArray') depth++;
    if (token.name === 'endObject' || token.name === 'endArray') depth--;
    if (depth > 24) throw Error('Boundary nesting limit exceeded');
    return token;
  }, pick({filter:'features'}), streamArray()]);
  let featureCount = 0, compactFeatureBytes = 0;
  for await (const {value} of stream) {
    if (++featureCount > 100) throw Error('More than 100 state features');
    boundaries.inspectFeature(value, properties, stats);
    compactFeatureBytes += Buffer.byteLength(JSON.stringify(value));
  }
  if (!featureCount || rootType !== 'FeatureCollection' || customCrs) throw Error('Expected a nonempty WGS84 FeatureCollection without a custom CRS');
  console.log(JSON.stringify({file, size, sha256:hash.digest('hex'), featureCount, propertyNames:[...stats.propertyNames].sort(), configuredNameProperties:properties, stateKeys:[...stats.states], coordinatePairs:stats.points, bounds:stats.bounds, compactFeatureBytes, webBudget:{bytes:boundaries.MAX_BYTES,coordinatePairs:boundaries.MAX_POINTS}, webSizeEligible:size <= boundaries.MAX_BYTES && stats.points <= boundaries.MAX_POINTS, outlineAccuracyVerified:false, publicationReviewRequired:true}, null, 2));
} catch(error) { console.error(`Boundary verification failed: ${error.message}`); process.exitCode=1; }
