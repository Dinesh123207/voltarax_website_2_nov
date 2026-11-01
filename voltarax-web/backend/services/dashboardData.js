const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');

const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';
const n = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const isoFromTs = (ts) => ts ? new Date(Number(ts) * 1000).toISOString() : null;

async function latest() {
  const reading = await require('../services/firebaseModel').db.ref('/solar_site/latest').get().then(s => s.exists() ? s.val() : null);
  const analysis = await SolarAnalysis.findOne({ site_id: SITE_ID }).lean();
  return { reading, analysis };
}

async function dashboard() {
  const { reading, analysis } = await latest();
  const start = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);
  const today = await SolarTelemetry.find({ site_id: SITE_ID, ts: { $gte: start } }).sort({ ts: 1 }).lean();
  let dailyKwh = 0;
  for (let i = 1; i < today.length; i++) {
    const dt = Math.min((Number(today[i].ts) - Number(today[i - 1].ts)) / 3600, 0.25);
    dailyKwh += Math.max(0, n(today[i - 1].power_mw) / 1000000) * dt;
  }
  const stale = !reading || (Date.now() - Number(reading.ts || 0) * 1000) > 60000;
  const currentPower = reading ? n(reading.power_mw) / 1000000 : 0;
  const status = stale ? 'OFFLINE' : (analysis?.status || 'OK');
  const panelCount = Number(process.env.SOLAR_PANEL_COUNT || 32);
  const health = n(analysis?.health_score, 0);
  const optimal = stale ? 0 : health >= 80 ? panelCount : Math.max(0, Math.round(panelCount * health / 100));
  const warning = stale ? 0 : health >= 80 ? 0 : health >= 50 ? panelCount - optimal : Math.round(panelCount * 0.5);
  const critical = stale ? 0 : health < 50 ? panelCount - optimal - warning : 0;

  return {
    current_power_kw: Number(currentPower.toFixed(3)),
    daily_generation_kwh: Number(dailyKwh.toFixed(3)),
    battery_soc_pct: null,
    bfci_score_avg: null,
    system_efficiency_pct: analysis?.performance_ratio != null ? Number((analysis.performance_ratio * 100).toFixed(1)) : null,
    panel_temp_avg_c: reading?.temp_c ?? null,
    co2_offset_today_kg: Number((dailyKwh * n(process.env.GRID_EMISSION_FACTOR, 0.82)).toFixed(3)),
    active_alerts: analysis?.alerts?.length || 0,
    panels_optimal: Math.max(0, optimal),
    panels_warning: Math.max(0, warning),
    panels_critical: Math.max(0, critical),
    panels_offline: stale ? panelCount : 0,
    status,
    last_seen: isoFromTs(reading?.ts),
    source: 'firebase-realtime-database',
  };
}

async function panels() {
  const { reading, analysis } = await latest();
  const count = Number(process.env.SOLAR_PANEL_COUNT || 32);
  const age = reading ? (Date.now() - Number(reading.ts || 0) * 1000) / 1000 : Infinity;
  const status = age > 60 ? 'offline' : analysis?.status === 'FAULT' ? 'critical' : analysis?.status === 'WARNING' ? 'warning' : 'optimal';
  const perPanelPower = reading ? n(reading.power_mw) / 1000 / count : null;
  return Array.from({ length: count }, (_, i) => {
    const row = String.fromCharCode(65 + Math.floor(i / 8));
    const col = (i % 8) + 1;
    return { id: i + 1, label: `${row}${col}`, row_label: row, col_number: col, status,
      efficiency_pct: analysis?.performance_ratio != null ? Number((analysis.performance_ratio * 100).toFixed(1)) : null,
      power_w: perPanelPower, voltage_v: reading?.voltage_v ?? null, temp_c: reading?.temp_c ?? null,
      bfci_score: null, cv_class: null };
  });
}

module.exports = { latest, dashboard, panels, SITE_ID };
