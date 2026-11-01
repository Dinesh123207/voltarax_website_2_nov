/**
 * Keeps /solar_site/analysis up to date regardless of HOW a reading arrived.
 *
 * Hardware can reach Firebase two ways (see backend/README-FIREBASE.md):
 *   1. Directly from the NodeMCU (the primary path — hardware/nodemcu/solar_monitor.ino
 *      writes straight to Firebase over Wi-Fi, and this Node server is never involved).
 *   2. Through the optional POST /api/telemetry/ingest bridge, for devices that can't
 *      talk to Firebase directly.
 *
 * routes/telemetry.js only computes analysis for path 2. Without this watcher, a
 * NodeMCU using path 1 — the one described in the setup guide — would update
 * /solar_site/latest every 5s but /solar_site/analysis would stay empty forever,
 * and the dashboard would never show health/alerts.
 *
 * This module attaches ONE Firebase 'value' listener to /solar_site/latest and
 * recomputes analysis on every change, whichever path produced it. Recomputing
 * from path 2 as well is intentional and harmless: same reading, same result.
 */
const { db } = require('../config/firebase');
const { saveAnalysis } = require('./solarAnalytics');

const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';

function readConfig() {
  return {
    siteId: SITE_ID,
    panelPmaxW: process.env.SOLAR_PANEL_PMAX_W,
    tempCoeff: process.env.SOLAR_TEMP_COEFF,
    noctC: process.env.SOLAR_NOCT_C,
    baselinePr: process.env.SOLAR_BASELINE_PR,
    luxPerWm2: process.env.SOLAR_LUX_PER_WM2,
    dustHigh: process.env.SOLAR_DUST_HIGH,
  };
}

let started = false;

function startTelemetryWatcher() {
  if (started) return;
  started = true;

  const ref = db.ref('/solar_site/latest');
  ref.on('value', (snap) => {
    const reading = snap.val();
    if (!reading || (reading.site_id || 'solar_site') !== SITE_ID) return;
    saveAnalysis(reading, readConfig()).catch((err) => {
      require('./logger').logger.error({ event: 'analysis-write-failed' }, 'Analysis unavailable');
    });
  }, (err) => {
    require('./logger').logger.error({ event: 'watcher-disconnected' }, 'Telemetry connection unavailable');
  });

  console.log('📡 Telemetry watcher attached to /solar_site/latest (works for direct-from-hardware writes too)');
}

module.exports = { startTelemetryWatcher };
