// Synthetic fixtures only. Defaults to stdout; network sends require an enabled localhost demo API.
function syntheticReading({ device = 'simulator-01', site = 'solar_site', ts = Math.floor(Date.now() / 1000), index = 0 } = {}) {
  return { ts, device_id: device, site_id: site, firmware_version: 'synthetic-simulator-1', simulated: true,
    voltage_v: 12, current_ma: 100 + index, power_mw: 1200 + index * 12, light_lux: 20000, temp_c: 25, humidity_pct: 50,
    sensors_ok: { ina219: true, bh1750: true, dht11: true, dust: false } };
}
function localApi(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Simulator requires an HTTP loopback API origin');
  return url.origin;
}
async function sendReading({ url, key, reading, fetcher = fetch }) {
  const base = localApi(url);
  if (!key || !reading.simulated || !/^[A-Za-z0-9_-]{1,64}$/.test(reading.device_id)) throw new Error('A local device key and marked synthetic reading are required');
  const health = await fetcher(`${base}/health`, { redirect: 'error', signal: AbortSignal.timeout(5000) });
  if (!health.ok || (await health.json()).simulatorAllowed !== true) throw new Error('API does not confirm enabled demo emulator mode');
  const response = await fetcher(`${base}/api/telemetry/ingest`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', 'X-Device-ID': reading.device_id, 'X-Device-Key': key }, body: JSON.stringify(reading) });
  if (!response.ok) throw new Error(`Synthetic ingest failed with status ${response.status}`);
  return { status: response.status };
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--send')) throw new Error('Usage: node tools/device-simulator/index.cjs [--send]');
  const reading = syntheticReading({ device: process.env.SIMULATOR_DEVICE_ID || 'simulator-01', site: process.env.SIMULATOR_SITE_ID || 'solar_site' });
  if (!args.includes('--send')) { console.log(JSON.stringify({ notice: 'SYNTHETIC TEST DATA — dry run; nothing sent', reading }, null, 2)); return; }
  const result = await sendReading({ url: process.env.SIMULATOR_API_URL || 'http://127.0.0.1:5000', key: process.env.SIMULATOR_DEVICE_KEY, reading });
  console.log(JSON.stringify({ notice: 'SYNTHETIC TEST DATA sent to loopback demo API', status: result.status }));
}
if (require.main === module) main().catch(() => { console.error('Simulator refused the configuration or request. Verify loopback demo mode and local device setup. No key is logged.'); process.exitCode = 1; });
module.exports = { syntheticReading, localApi, sendReading };
