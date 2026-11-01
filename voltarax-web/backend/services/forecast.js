const { periodStartsIST } = require('./energy');
const { simulatorAllowed } = require('../config/testMode');
const finite = value => typeof value === 'number' && Number.isFinite(value);
function currentEstimate(ai, reading, { env = process.env, now = Math.floor(Date.now() / 1000) } = {}) {
  const result = { estimated_current_power_kw: null, forecast_1h_kw: null, forecast_6h_kwh: null, forecast_24h_kwh: null,
    forecast_7d_kwh: null, confidence: null, dataQuality: 'Unavailable', model_version: null, model_metadata: null,
    source_as_of: null, generated_at: null, valid_until: null, data_origin: null, weather_forecast: 'Unavailable',
    horizon_note: 'Future power/energy requires a verified site and suitable forecast weather. No validated confidence interval is available.',
    reason: 'No validated model result or fresh daylight input is available.' };
  const maxAge = Number(env.AI_MAX_INPUT_AGE_SECONDS || 120);
  if (ai) return { ...result, estimated_current_power_kw: ai.predicted_power_mw / 1e6, dataQuality: 'Estimated',
    model_version: ai.model_metadata.model_version, model_metadata: ai.model_metadata, source_as_of: ai.source_ts,
    generated_at: ai.updated_at, valid_until: Math.min(ai.source_ts + maxAge, ai.updated_at + Number(env.AI_MAX_AGE_SECONDS || 7200), ai.model_metadata.trained_at + Number(env.AI_MAX_MODEL_AGE_SECONDS || 2592000)),
    data_origin: ai.data_origin, reason: 'Current-condition model estimate. Validation describes its recorded training inputs, not independently verified site accuracy.' };
  if (!reading || reading.site_id !== (env.SOLAR_SITE_ID || 'solar_site') || reading.device_id !== (env.SOLAR_DEVICE_ID || 'nodemcu-01') ||
      !Number.isInteger(reading.ts) || now - reading.ts < -300 || now - reading.ts > maxAge || !Number.isFinite(maxAge) || maxAge < 5 || maxAge > 3600 ||
      (reading.simulated === true && !simulatorAllowed(env))) return result;
  if (!['light_lux', 'temp_c', 'power_mw'].every(field => finite(reading[field])) || reading.light_lux <= Number(env.AI_DAYLIGHT_LUX_THRESHOLD || 2000) ||
      reading.light_lux > 150000 || reading.temp_c < -40 || reading.temp_c > 125 || reading.power_mw < 0 ||
      ['bh1750', 'dht11', 'ina219'].some(sensor => reading.sensors_ok?.[sensor] === false)) return result;
  const pmax = Number(env.SOLAR_PANEL_PMAX_W || 10), coefficient = Number(env.SOLAR_TEMP_COEFF || -0.004), noct = Number(env.SOLAR_NOCT_C || 45),
    lux = Number(env.SOLAR_LUX_PER_WM2 || 120), pr = Number(env.SOLAR_BASELINE_PR || 0.75);
  if (![pmax, coefficient, noct, lux, pr].every(Number.isFinite) || pmax <= 0 || lux <= 0 || pr <= 0 || pr > 1) return result;
  const irradiance = reading.light_lux / lux, cell = reading.temp_c + (noct - 20) / 800 * irradiance;
  const kw = Math.max(0, pmax * irradiance / 1000 * (1 + coefficient * (cell - 25)) * pr) / 1000;
  if (!Number.isFinite(kw)) return result;
  return { ...result, estimated_current_power_kw: kw, dataQuality: 'Estimated', source_as_of: reading.ts, generated_at: now,
    valid_until: reading.ts + maxAge, model_version: 'engineering-config-v1', data_origin: reading.simulated ? 'synthetic-test-inputs' : 'device-history-unverified-calibration',
    reason: 'Engineering estimate from current light and temperature. Configured panel rating, lux conversion, thermal parameters and performance ratio are unverified assumptions.' };
}
function hourlyReadings(rows, { now = Math.floor(Date.now() / 1000), env = process.env, site = env.SOLAR_SITE_ID || 'solar_site', device = env.SOLAR_DEVICE_ID || 'nodemcu-01' } = {}) {
  const start = periodStartsIST(new Date(now * 1000)).day, buckets = new Map();
  for (const row of rows) {
    if (row.site_id !== site || row.device_id !== device || !Number.isInteger(row.ts) || row.ts < start || row.ts > now ||
        !finite(row.power_mw) || row.power_mw < 0 || row.sensors_ok?.ina219 === false || (row.simulated === true && !simulatorAllowed(env))) continue;
    const hour = Math.floor((row.ts - start) / 3600), bucket = buckets.get(hour) || { sum: 0, count: 0, simulated: false };
    bucket.sum += row.power_mw / 1e6; bucket.count++; bucket.simulated ||= row.simulated === true; buckets.set(hour, bucket);
  }
  return [...buckets].sort(([a], [b]) => a - b).map(([hour, bucket]) => ({ hour: `${String(hour).padStart(2, '0')}:00`,
    date_ist: new Date((start + 19800) * 1000).toISOString().slice(0, 10), kw: bucket.sum / bucket.count,
    samples: bucket.count, dataQuality: bucket.simulated ? 'Estimated' : 'Calculated', source: 'Recorded power samples; missing intervals are not filled' }));
}
module.exports = { currentEstimate, hourlyReadings };
