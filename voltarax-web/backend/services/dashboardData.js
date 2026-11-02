const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');
const { periodStartsIST, energyStats } = require('./energy');
const { QUALITY, qualityOf } = require('./dataQuality');

const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';
const n = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const isoFromTs = ts => { const date = new Date(Number(ts) * 1000); return ts && Number.isFinite(date.getTime()) ? date.toISOString() : null; };
function configuredPanelCount() {
  const value = process.env.SOLAR_PANEL_COUNT;
  const number = Number(value);
  return value?.trim() && Number.isInteger(number) && number > 0 && number <= 10000 ? number : null;
}
function virtualRow(index) { let value = index + 1, label = ''; while (value) { value--; label = String.fromCharCode(65 + value % 26) + label; value = Math.floor(value / 26); } return label; }

async function latest() {
  const [raw, result] = await Promise.all([SolarTelemetry.latest(SITE_ID), SolarAnalysis.findOne({ site_id: SITE_ID }).lean()]);
  const freshness=require('./readingFreshness').readingFreshness(raw),fresh=freshness.fresh;
  return { reading: fresh ? raw : null, analysis: fresh && Number(result?.ts) === Number(raw.ts) ? result : null, lastSeen: freshness.last_seen, stale: !fresh, freshness };
}

async function dashboard() {
  const { reading, analysis, lastSeen, freshness } = await latest();
  const now = Date.now() / 1000;
  const start = periodStartsIST(new Date(now * 1000)).day;
  const today = await SolarTelemetry.find({ site_id: SITE_ID, ts: { $gte: start - 900 } }).sort({ ts: 1 }).lean();
  const energy = energyStats(today, start, now);
  const dailyKwh = energy.kwh;
  const stale = !reading;
  const currentPower = typeof reading?.power_mw === 'number' && reading?.sensors_ok?.ina219 !== false && Number.isFinite(reading.power_mw) && reading.power_mw >= 0 ? reading.power_mw / 1000000 : null;
  const status = stale ? 'UNAVAILABLE' : (analysis?.status || 'UNAVAILABLE');

  const result = {
    current_power_kw: currentPower == null ? null : Number(currentPower.toFixed(3)),
    daily_generation_kwh: dailyKwh == null ? null : Number(dailyKwh.toFixed(3)),
    daily_savings_inr: require('./energy').estimatedSavings(dailyKwh,process.env.GRID_TARIFF_INR_PER_KWH),
    freshness,
    energy_coverage_pct: energy.periodSeconds > 0 ? Number((energy.coveredSeconds / energy.periodSeconds * 100).toFixed(2)) : null,
    energy_note: 'Integration covers recorded valid-power intervals only, capped at 15 minutes per sample; gaps are not extrapolated.',
    battery_soc_pct: null,
    bfci_score_avg: null,
    system_efficiency_pct: analysis?.performance_ratio != null ? Number((analysis.performance_ratio * 100).toFixed(1)) : null,
    panel_temp_avg_c: null,
    site_sensor_temp_c: reading?.sensors_ok?.dht11 !== false && typeof reading?.temp_c === 'number' && Number.isFinite(reading.temp_c) ? reading.temp_c : null,
    co2_offset_today_kg: dailyKwh == null ? null : Number((dailyKwh * n(process.env.GRID_EMISSION_FACTOR, 0.82)).toFixed(3)),
    active_alerts: null,
    panels_optimal: null,
    panels_warning: null,
    panels_critical: null,
    panels_offline: null,
    status,
    last_seen: lastSeen,
    telemetry_fresh: !stale,
    simulated: reading?.simulated === true,
    source: reading?.simulated ? 'synthetic-device-simulator' : 'firebase-realtime-database',
  };
  if (require('../db/client').configured()) {
    try { result.active_alerts = await (await require('./operations').getOperations()).countActiveAlerts(SITE_ID); }
    catch { /* No false zero when relational storage is unavailable. */ }
  }
  result.quality = {
    current_power_kw: qualityOf(result.current_power_kw, QUALITY.CALCULATED),
    daily_generation_kwh: qualityOf(result.daily_generation_kwh, QUALITY.CALCULATED),
    daily_savings_inr: qualityOf(result.daily_savings_inr, QUALITY.ESTIMATED),
    battery_soc_pct: qualityOf(result.battery_soc_pct, QUALITY.MEASURED),
    bfci_score_avg: qualityOf(result.bfci_score_avg, QUALITY.CALCULATED),
    system_efficiency_pct: qualityOf(result.system_efficiency_pct, QUALITY.ESTIMATED),
    panel_temp_avg_c: qualityOf(result.panel_temp_avg_c, QUALITY.MEASURED),
    site_sensor_temp_c: qualityOf(result.site_sensor_temp_c, QUALITY.MEASURED),
    co2_offset_today_kg: qualityOf(result.co2_offset_today_kg, QUALITY.ESTIMATED),
    active_alerts: qualityOf(result.active_alerts, QUALITY.CALCULATED),
    panels_optimal: qualityOf(result.panels_optimal, QUALITY.ESTIMATED),
    panels_warning: qualityOf(result.panels_warning, QUALITY.ESTIMATED),
    panels_critical: qualityOf(result.panels_critical, QUALITY.ESTIMATED),
    panels_offline: qualityOf(result.panels_offline, QUALITY.ESTIMATED),
  };
  if (result.simulated) for (const key of Object.keys(result.quality)) if (result.quality[key] !== QUALITY.UNAVAILABLE) result.quality[key] = QUALITY.ESTIMATED;
  return result;
}

async function panels() {
  const { reading, analysis } = await latest();
  const count = configuredPanelCount();
  if (!count) return [];
  const status = 'unknown';
  const perPanelPower = typeof reading?.power_mw === 'number' && reading?.sensors_ok?.ina219 !== false && Number.isFinite(reading.power_mw) && reading.power_mw >= 0 ? reading.power_mw / 1000 / count : null;
  return Array.from({ length: count }, (_, i) => {
    const row = virtualRow(Math.floor(i / 8));
    const col = (i % 8) + 1;
    return { id: i + 1, label: `${row}${col}`, row_label: row, col_number: col, status, dataQuality: 'estimated', simulated: reading?.simulated === true,
      efficiency_pct: analysis?.performance_ratio != null ? Number((analysis.performance_ratio * 100).toFixed(1)) : null,
      power_w: perPanelPower, voltage_v: null, temp_c: null, identity_note: 'Virtual display position, not a registered physical panel ID',
      bfci_score: null, cv_class: null };
  });
}

module.exports = { latest, dashboard, panels, SITE_ID };
