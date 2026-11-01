/**
 * Reads whatever the AI engine (../ai-engine, a separate Python project) most
 * recently published to /solar_site/ai/*. This is the entire coupling
 * between the two: the Node backend never imports Python or scikit-learn,
 * it just reads a path in the same Firebase project the AI engine writes to
 * on its own schedule (ai-engine/scripts/schedule_cron.md).
 *
 * Every getter returns null if the AI engine hasn't published anything yet,
 * or if what it published is `{status: 'not_enough_data', ...}` — callers
 * decide their own fallback (see routes/voltvision.js's /forecast handler),
 * this module never invents a number.
 */
const { db } = require('../config/firebase');

const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';

async function readSection(section) {
  const snap = await db.ref(`/${SITE_ID}/ai/${section}`).get();
  const value = snap.exists() ? snap.val() : null;
  return value && value.status === 'ok' ? value : null;
}

const getAiForecast = () => readSection('forecast');
const getAiAnomaly = () => readSection('anomaly');
const getAiHealth = () => readSection('health');

async function getAiStatus() {
  const snap = await db.ref(`/${SITE_ID}/ai/status`).get();
  return snap.exists() ? snap.val() : null;
}

module.exports = { getAiForecast, getAiAnomaly, getAiHealth, getAiStatus };
