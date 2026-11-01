const SolarAnalysis = require('../models/SolarAnalysis');

const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function evaluate(reading, config = {}) {
  const now = config.now ?? Date.now();
  const tsMs = Number(reading?.ts || Math.floor(now / 1000)) * 1000;
  const age = Math.max(0, (now - tsMs) / 1000);

  const panelPmax = num(config.panelPmaxW, 10);
  const tempCoeff = num(config.tempCoeff, -0.004);
  const noct = num(config.noctC, 45);
  const baselinePr = num(config.baselinePr, 0.75);
  const luxPerWm2 = num(config.luxPerWm2, 120);
  const dustHigh = num(config.dustHigh, 150);

  const valid = (field, sensor) => typeof reading[field] === 'number' && Number.isFinite(reading[field]) && reading.sensors_ok?.[sensor] !== false;
  const irradiance = valid('light_lux', 'bh1750') ? Math.max(0, reading.light_lux / luxPerWm2) : null;
  const cellTemp = irradiance != null && valid('temp_c', 'dht11') ? reading.temp_c + ((noct - 20) / 800) * irradiance : null;
  const expectedW = cellTemp != null ? panelPmax * irradiance / 1000 * (1 + tempCoeff * (cellTemp - 25)) : null;
  const actualW = valid('power_mw', 'ina219') ? Math.max(0, reading.power_mw / 1000) : null;
  const dusty = num(reading.dust_ugm3) > dustHigh;
  let performanceRatio = null;
  let score = 100;
  const alerts = [];

  if (irradiance > 200 && expectedW > 0 && actualW != null) {
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
    alerts.push('Estimated cell temperature above threshold');
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
  const missingRequired = actualW == null || irradiance == null || cellTemp == null;
  if (missingRequired) {
    status = 'UNAVAILABLE';
    score = null;
    alerts.unshift('Insufficient power, light or temperature readings for health analysis');
  }
  if (age > 60) {
    status = 'OFFLINE';
    alerts.unshift('No data for over 60 s - check NodeMCU / WiFi');
  }

  return {
    ts: Number(reading.ts),
    status,
    health_score: score,
    alerts,
    performance_ratio: performanceRatio == null ? undefined : Number(performanceRatio.toFixed(3)),
    irradiance_wm2: irradiance == null ? null : Math.round(irradiance),
    cell_temp_c: cellTemp == null ? null : Number(cellTemp.toFixed(1)),
    simulated: reading.simulated === true,
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
