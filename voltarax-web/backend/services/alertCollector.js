const { createHash } = require('node:crypto');
function signalsFromAnalysis(result) {
  return (result.alerts || []).slice(0, 30).map(message => {
    const sourceKey = message.startsWith('Sensor not responding:') ? `sensor:${message.split(':')[1].trim()}`
      : message.startsWith('Output ') ? 'low-output'
      : message.startsWith('No data ') ? 'telemetry-offline'
      : message.startsWith('Insufficient ') ? 'missing-essential-readings'
      : createHash('sha256').update(message).digest('hex');
    return { sourceKey, title: message.slice(0, 160), message, severity: result.status === 'FAULT' || result.status === 'OFFLINE' ? 'critical' : 'warning' };
  });
}
async function collect({ reading, service, siteId, now = Date.now(), config = {} }) {
  if (!reading || reading.site_id !== siteId || reading.device_id !== (config.deviceId || process.env.SOLAR_DEVICE_ID || 'nodemcu-01')) return;
  const analysis = require('./solarAnalytics').evaluate(reading, { ...config, now });
  // Timestamp of this server observation, not an invented device measurement.
  await service.syncSignals(siteId, Math.floor(now / 1000), signalsFromAnalysis(analysis), reading.simulated === true);
}
function startAlertCollector(logger) {
  if (!require('../db/client').configured()) return () => {};
  let busy = false, stopped = false;
  const run = async () => {
    if (busy || stopped) return; busy = true;
    try {
      const siteId = process.env.SOLAR_SITE_ID || 'solar_site';
      const reading = await require('../models/SolarTelemetry').latest(siteId);
      const service = await require('./operations').getOperations();
      await collect({ reading, service, siteId, config: { panelPmaxW: process.env.SOLAR_PANEL_PMAX_W,
        tempCoeff: process.env.SOLAR_TEMP_COEFF, noctC: process.env.SOLAR_NOCT_C, baselinePr: process.env.SOLAR_BASELINE_PR,
        luxPerWm2: process.env.SOLAR_LUX_PER_WM2, dustHigh: process.env.SOLAR_DUST_HIGH } });
    } catch { logger.error({ event: 'alert-collection-failed' }, 'Persistent alerts unavailable'); }
    finally { busy = false; }
  };
  run(); const timer = setInterval(run, 30000); timer.unref();
  return () => { stopped = true; clearInterval(timer); };
}
module.exports = { signalsFromAnalysis, collect, startAlertCollector };
