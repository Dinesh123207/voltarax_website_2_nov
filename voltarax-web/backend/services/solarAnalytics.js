const SolarAnalysis = require('../models/SolarAnalysis');

const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function evaluate(reading, config = {}) {
  const now = Date.now();
  const tsMs = Number(reading?.ts || Math.floor(now / 1000)) * 1000;
  const age = Math.max(0, (now - tsMs) / 1000);

  const panelPmax = num(config.panelPmaxW, 10);
  const tempCoeff = num(config.tempCoeff, -0.004);
  const noct = num(config.noctC, 45);
  const baselinePr = num(config.baselinePr, 0.75);
  const luxPerWm2 = num(config.luxPerWm2, 120);
  const dustHigh = num(config.dustHigh, 150);

  const irradiance = Math.max(0, num(reading.light_lux) / luxPerWm2);
  const cellTemp = num(reading.temp_c, 25) + ((noct - 20) / 800) * irradiance;
  const expectedW = panelPmax * irradiance / 1000 * (1 + tempCoeff * (cellTemp - 25));
  const actualW = Math.max(0, num(reading.power_mw) / 1000);
  const dusty = num(reading.dust_ugm3) > dustHigh;
  let performanceRatio = null;
  let score = 100;
  const alerts = [];

  if (irradiance > 200 && expectedW > 0) {
    performanceRatio = actualW / expectedW;
    const relative = baselinePr > 0 ? performanceRatio / baselinePr : performanceRatio;
    if (relative < 0.6) {
      score -= 40;
      alerts.push(`Output far below normal - check shading, wiring, connectors${dusty ? ' / dust' : ''}`);
    } else if (relative < 0.85) {
      score -= 20;
      alerts.push(`Output below normal${dusty ? ' - dust likely, clean panel' : ''}`);
    }
  }

  if (dusty) {
    score -= 10;
    alerts.push('High airborne dust');
  }
  if (cellTemp > 70) {
    score -= 15;
    alerts.push('Panel overheating');
  }

  const sensors = reading.sensors_ok || {};
  for (const [name, ok] of Object.entries(sensors)) {
    if (ok === false) {
      score -= 15;
      alerts.push(`Sensor not responding: ${name}`);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let status = score >= 80 ? 'OK' : score >= 50 ? 'WARNING' : 'FAULT';
  if (age > 60) {
    status = 'OFFLINE';
    alerts.unshift('No data for over 60 s - check NodeMCU / WiFi');
  }

  return {
    ts: Math.floor(Date.now() / 1000),
    status,
    health_score: score,
    alerts,
    performance_ratio: performanceRatio == null ? undefined : Number(performanceRatio.toFixed(3)),
    irradiance_wm2: Math.round(irradiance),
    cell_temp_c: Number(cellTemp.toFixed(1)),
    source: 'server-analysis',
  };
}

async function saveAnalysis(reading, config) {
  const result = evaluate(reading, config);
  return SolarAnalysis.findOneAndUpdate(
    { site_id: config.siteId || 'solar_site' },
    { ...result, site_id: config.siteId || 'solar_site' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { evaluate, saveAnalysis };
