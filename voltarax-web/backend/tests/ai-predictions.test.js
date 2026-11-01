const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createAiReader } = require('../services/aiPredictions');
const { currentEstimate, hourlyReadings } = require('../services/forecast');
const fixture = name => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../docs/test-results/${name}-fixture.json`), 'utf8'));
const demo = { FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000', FIREBASE_PROJECT_ID: 'demo-voltarax', NODE_ENV: 'test', DEVICE_SIMULATOR_ENABLED: 'true' };
const clone = value => structuredClone(value);

test('actual Python synthetic model publications satisfy the backend contract', () => {
  const data = fixture('phase06-model-contract');
  const reader = createAiReader({ db: {}, env: demo, now: () => data.now });
  for (const [section, value] of Object.entries(data.payloads)) assert.ok(reader.validated(section, value), section);
  const power = currentEstimate(reader.validated('forecast', data.payloads.forecast), null, { env: demo, now: data.now });
  assert.ok(power.estimated_current_power_kw > 0);
  for (const key of ['forecast_1h_kw', 'forecast_6h_kwh', 'forecast_24h_kwh', 'forecast_7d_kwh', 'confidence']) assert.equal(power[key], null);
});

test('new publication cannot hide stale source, expired/foreign/unvalidated models or nonfinite data', () => {
  const data = fixture('phase06-model-contract');
  const reader = createAiReader({ db: {}, env: demo, now: () => data.now });
  for (const mutate of [
    row => { row.source_ts = data.now - 121; }, row => { row.model_metadata.trained_at = data.now - 2592001; },
    row => { row.site_id = 'foreign'; }, row => { row.model_metadata.device_id = 'foreign'; },
    row => { row.schema_version = 1; }, row => { row.predicted_power_mw = NaN; },
    row => { row.model_metadata.training_parameters.pmax_w *= 2; }, row => { row.model_metadata.validation.accepted = false; },
    row => { row.updated_at = data.now + 1; }, row => { row.model_metadata.validation.model.rmse_mw = Infinity; },
    row => { row.model_metadata.source_window_end_ts = row.source_ts + 1; }, row => { row.dataQuality = 'Measured'; },
    row => { row.model_metadata.validation.split.test_start_ts = row.model_metadata.validation.split.train_end_ts; },
  ]) {
    const bad = clone(data.payloads.forecast); mutate(bad); assert.equal(reader.validated('forecast', bad), null);
  }
  assert.equal(createAiReader({ db: {}, env: {}, now: () => data.now }).validated('forecast', data.payloads.forecast), null);
  const real = clone(data.payloads.forecast); real.data_origin = real.model_metadata.data_origin = 'device-history-unverified-calibration';
  assert.ok(createAiReader({ db: {}, env: {}, now: () => data.now }).validated('forecast', real));
});

test('canonical results take precedence and another site never reads the default legacy path', async () => {
  const data = fixture('phase06-model-contract'); let calls = [];
  const values = { '/sites/solar_site/ai/forecast': { ...data.payloads.forecast, schema_version: 1 }, '/solar_site/ai/forecast': data.payloads.forecast };
  const db = { ref: key => ({ get: async () => { calls.push(key); return { exists: () => key in values, val: () => values[key] }; } }) };
  assert.equal(await createAiReader({ db, env: demo, now: () => data.now }).readSection('forecast'), null);
  assert.deepEqual(calls, ['/sites/solar_site/ai/forecast']);
  delete values['/sites/solar_site/ai/forecast']; calls = [];
  assert.ok(await createAiReader({ db, env: demo, now: () => data.now }).readSection('forecast'));
  calls = [];
  assert.equal(await createAiReader({ db, env: { SOLAR_SITE_ID: 'other' }, now: () => data.now }).readSection('forecast'), null);
  assert.deepEqual(calls, ['/sites/other/ai/forecast']);
});

test('official SDK RTDB readback normalizes absent empty/null members without fabricating results', () => {
  const data = fixture('phase06-sdk-contract');
  const reader = createAiReader({ db: {}, env: demo, now: () => data.now });
  const status = reader.validated('status', data.payloads.status);
  assert.ok(status); assert.deepEqual(status.trained_models, []); assert.equal(status.model_info.forecast.model_version, null);
  assert.equal(reader.validated('forecast', data.payloads.forecast), null);
});

test('engineering estimate requires fresh valid primary daylight input and no future extrapolation', () => {
  const now = 2000000000, reading = { ts: now, site_id: 'solar_site', device_id: 'nodemcu-01', power_mw: 4000, light_lux: 50000, temp_c: 30 };
  assert.ok(currentEstimate(null, reading, { env: {}, now }).estimated_current_power_kw > 0);
  for (const row of [{ ...reading, ts: now - 121 }, { ...reading, light_lux: 0 }, { ...reading, device_id: 'other' },
    { ...reading, sensors_ok: { dht11: false } }, { ...reading, temp_c: null }, { ...reading, simulated: true }]) {
    assert.equal(currentEstimate(null, row, { env: {}, now }).estimated_current_power_kw, null);
  }
  assert.equal(currentEstimate(null, reading, { env: { SOLAR_LUX_PER_WM2: 'bad' }, now }).estimated_current_power_kw, null);
});

test('hourly history keeps only today in IST, recorded zero and valid primary measurements', () => {
  const start = Date.UTC(2026, 10, 1) / 1000 - 19800, now = start + 3600;
  const row = { site_id: 'solar_site', device_id: 'nodemcu-01', ts: start, power_mw: 0 };
  const result = hourlyReadings([row, { ...row, ts: start + 60, power_mw: 2000 }, { ...row, ts: start - 1, power_mw: 9999 },
    { ...row, site_id: 'other' }, { ...row, power_mw: '3' }, { ...row, power_mw: 9000, sensors_ok: { ina219: false } }], { env: {}, now });
  assert.equal(result.length, 1); assert.equal(result[0].hour, '00:00'); assert.equal(result[0].date_ist, '2026-11-01');
  assert.equal(result[0].samples, 2); assert.equal(result[0].kw, 0.001);
  assert.deepEqual(hourlyReadings([], { env: {}, now }), []);
});
