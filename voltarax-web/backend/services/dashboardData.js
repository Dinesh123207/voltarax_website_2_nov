const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');
const { periodStartsIST, integrateKwh } = require('./energy');
const { QUALITY, qualityOf } = require('./dataQuality');

const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';
const n = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const isoFromTs = ts => { const date = new Date(Number(ts) * 1000); return ts && Number.isFinite(date.getTime()) ? date.toISOString() : null; };

async function latest() {
  const [raw, result] = await Promise.all([SolarTelemetry.latest(SITE_ID), SolarAnalysis.findOne({ site_id: SITE_ID }).lean()]);
  const maximumAge = Number(process.env.MAX_TELEMETRY_AGE_SECONDS || 120);
  if (!Number.isFinite(maximumAge) || maximumAge < 5 || maximumAge > 86400) throw new Error('Invalid telemetry freshness policy');
  const age = raw ? Date.now() / 1000 - Number(raw.ts) : Infinity;
  const fresh = Number.isFinite(age) && age >= -300 && age <= maximumAge;
  return { reading: fresh ? raw : null, analysis: fresh && Number(result?.ts) === Number(raw.ts) ? result : null, lastSeen: isoFromTs(raw?.ts), stale: !fresh };
}

async function dashboard() {
  const { reading, analysis, lastSeen } = await latest();
  const now = Date.now() / 1000;
  const start = periodStartsIST(new Date(now * 1000)).day;
  const today = await SolarTelemetry.find({ site_id: SITE_ID, ts: { $gte: start - 900 } }).sort({ ts: 1 }).lean();
  const dailyKwh = integrateKwh(today, start, now);
  const stale = !reading;
  const currentPower = reading?.power_mw != null && Number.isFinite(Number(reading.power_mw)) ? Number(reading.power_mw) / 1000000 : null;
  const status = stale ? 'UNAVAILABLE' : (analysis?.status || 'UNAVAILABLE');
  const panelCount = Number(process.env.SOLAR_PANEL_COUNT || 32);
  const hasHealth = analysis?.health_score != null && Number.isFinite(Number(analysis.health_score));
  const health = n(analysis?.health_score, 0);
  const optimal = stale ? 0 : health >= 80 ? panelCount : Math.max(0, Math.round(panelCount * health / 100));
  const warning = stale ? 0 : health >= 80 ? 0 : health >= 50 ? panelCount - optimal : Math.round(panelCount * 0.5);
  const critical = stale ? 0 : health < 50 ? panelCount - optimal - warning : 0;

  const result = {
    current_power_kw: currentPower == null ? null : Number(currentPower.toFixed(3)),
    daily_generation_kwh: today.length < 2 ? null : Number(dailyKwh.toFixed(3)),
    battery_soc_pct: null,
    bfci_score_avg: null,
    system_efficiency_pct: analysis?.performance_ratio != null ? Number((analysis.performance_ratio * 100).toFixed(1)) : null,
    panel_temp_avg_c: reading?.temp_c ?? null,
    co2_offset_today_kg: today.length < 2 ? null : Number((dailyKwh * n(process.env.GRID_EMISSION_FACTOR, 0.82)).toFixed(3)),
    active_alerts: analysis ? (analysis.alerts?.length || 0) : null,
    panels_optimal: stale || !hasHealth ? null : Math.max(0, optimal),
    panels_warning: stale || !hasHealth ? null : Math.max(0, warning),
    panels_critical: stale || !hasHealth ? null : Math.max(0, critical),
    panels_offline: null,
    status,
    last_seen: lastSeen,
    source: 'firebase-realtime-database',
  };
  result.quality = {
    current_power_kw: qualityOf(result.current_power_kw, QUALITY.CALCULATED),
    daily_generation_kwh: qualityOf(result.daily_generation_kwh, QUALITY.CALCULATED),
    battery_soc_pct: qualityOf(result.battery_soc_pct, QUALITY.MEASURED),
    bfci_score_avg: qualityOf(result.bfci_score_avg, QUALITY.CALCULATED),
    system_efficiency_pct: qualityOf(result.system_efficiency_pct, QUALITY.ESTIMATED),
    panel_temp_avg_c: qualityOf(result.panel_temp_avg_c, QUALITY.MEASURED),
    co2_offset_today_kg: qualityOf(result.co2_offset_today_kg, QUALITY.ESTIMATED),
    active_alerts: qualityOf(result.active_alerts, QUALITY.CALCULATED),
    panels_optimal: qualityOf(result.panels_optimal, QUALITY.ESTIMATED),
    panels_warning: qualityOf(result.panels_warning, QUALITY.ESTIMATED),
    panels_critical: qualityOf(result.panels_critical, QUALITY.ESTIMATED),
    panels_offline: qualityOf(result.panels_offline, QUALITY.ESTIMATED),
  };
  return result;
}

async function panels() {
  const { reading, analysis } = await latest();
  const count = Number(process.env.SOLAR_PANEL_COUNT || 32);
  const status = !reading || !analysis || analysis.status === 'UNAVAILABLE' ? 'unknown' : analysis.status === 'FAULT' ? 'critical' : analysis.status === 'WARNING' ? 'warning' : 'optimal';
  const perPanelPower = reading?.power_mw != null ? n(reading.power_mw) / 1000 / count : null;
  return Array.from({ length: count }, (_, i) => {
    const row = String.fromCharCode(65 + Math.floor(i / 8));
    const col = (i % 8) + 1;
    return { id: i + 1, label: `${row}${col}`, row_label: row, col_number: col, status, dataQuality: 'estimated',
      efficiency_pct: analysis?.performance_ratio != null ? Number((analysis.performance_ratio * 100).toFixed(1)) : null,
      power_w: perPanelPower, voltage_v: reading?.voltage_v ?? null, temp_c: reading?.temp_c ?? null,
      bfci_score: null, cv_class: null };
  });
}

module.exports = { latest, dashboard, panels, SITE_ID };
