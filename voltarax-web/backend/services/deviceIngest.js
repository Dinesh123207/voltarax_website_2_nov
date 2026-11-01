const { transact } = require('./firebaseTransaction');
const { createHash } = require('node:crypto');
function sorted(value) {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
}
const fingerprint = row => createHash('sha256').update(JSON.stringify(sorted(row))).digest('hex');
function createDeviceIngest({ db, now = Date.now, primaryDevice = 'nodemcu-01' }) {
  return async reading => {
    const stamp = Math.floor(now() / 1000);
    if (!Number.isInteger(reading.ts) || reading.ts < stamp - 86400 || reading.ts > stamp + 300) return { error: 'Timestamp outside the accepted 24-hour past / 5-minute future window.', status: 422 };
    const key = `${reading.device_id}-${reading.ts}`;
    const path = `readings/${reading.site_id}/${key}`;
    const result = await transact(db.ref(path), current => current === null ? reading : undefined);
    const duplicate = !result.committed;
    if (duplicate && fingerprint(result.snapshot.val()) !== fingerprint(reading)) return { error: 'A different reading already uses this device and timestamp.', status: 409 };
    // Repairable idempotent compatibility write; a retry also repairs an interrupted bridge.
    await db.ref().update({ [`solar_site/history/${key}`]: reading });
    const advance = current => !current || Number(current.ts) <= reading.ts ? reading : undefined;
    const perDevice = await transact(db.ref(`deviceLatest/${reading.device_id}`), advance);
    let latestUpdated = false;
    if (reading.device_id === primaryDevice) {
      const latest = await transact(db.ref(`sites/${reading.site_id}/latest`), advance);
      latestUpdated = latest.committed;
      if (reading.site_id === 'solar_site') await transact(db.ref('solar_site/latest'), advance);
    }
    return { reading, duplicate, latestUpdated, outOfOrder: !perDevice.committed, status: duplicate ? 200 : 201 };
  };
}
function ingestReading(reading) {
  const { db } = require('../config/firebase');
  return createDeviceIngest({ db, primaryDevice: process.env.SOLAR_DEVICE_ID || 'nodemcu-01' })(reading);
}
module.exports = { createDeviceIngest, ingestReading };
