const express = require('express');
const { body, validationResult } = require('express-validator');
const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');
const { saveAnalysis } = require('../services/solarAnalytics');
const { protect } = require('../middleware/auth');

const router = express.Router();
const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';
const DEVICE_KEY = process.env.HARDWARE_API_KEY || '';

function deviceAuth(req, res, next) {
  if (!DEVICE_KEY) return res.status(503).json({ success: false, message: 'Hardware ingestion is not configured.' });
  const supplied = req.get('x-device-key') || req.body?.device_key;
  if (!supplied || supplied !== DEVICE_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid device key.' });
  }
  next();
}

const schema = [
  body('ts').optional().isNumeric(),
  body('voltage_v').optional().isNumeric(),
  body('current_ma').optional().isNumeric(),
  body('power_mw').optional().isNumeric(),
  body('light_lux').optional().isNumeric(),
  body('temp_c').optional().isNumeric(),
  body('humidity_pct').optional().isNumeric(),
  body('dust_ugm3').optional().isNumeric(),
  body('rssi').optional().isNumeric(),
  body('uptime_s').optional().isNumeric(),
];

function cleanPayload(body) {
  const fields = ['voltage_v','current_ma','power_mw','light_lux','temp_c','humidity_pct','dust_ugm3','rssi','uptime_s'];
  const out = {};
  for (const key of fields) if (body[key] !== undefined && Number.isFinite(Number(body[key]))) out[key] = Number(body[key]);
  out.sensors_ok = {};
  for (const sensor of ['ina219', 'bh1750', 'dht11', 'dust']) {
    if (typeof body.sensors_ok?.[sensor] === 'boolean') out.sensors_ok[sensor] = body.sensors_ok[sensor];
  }
  out.ts = body.ts ? Number(body.ts) : Math.floor(Date.now() / 1000);
  out.device_id = String(body.device_id || 'nodemcu-01').slice(0, 64);
  out.site_id = SITE_ID;
  return out;
}

// POST /api/telemetry/ingest — ESP8266/other hardware writes here.
router.post('/ingest', deviceAuth, schema, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  try {
    const reading = await SolarTelemetry.create(cleanPayload(req.body));
    const readingData = reading.toObject ? reading.toObject() : reading;
    const { db } = require('../services/firebaseModel');
    await db.ref('/solar_site/latest').set(readingData);
    const analysis = await saveAnalysis(readingData, {
      siteId: SITE_ID,
      panelPmaxW: process.env.SOLAR_PANEL_PMAX_W,
      tempCoeff: process.env.SOLAR_TEMP_COEFF,
      noctC: process.env.SOLAR_NOCT_C,
      baselinePr: process.env.SOLAR_BASELINE_PR,
      luxPerWm2: process.env.SOLAR_LUX_PER_WM2,
      dustHigh: process.env.SOLAR_DUST_HIGH,
    });
    res.status(201).json({ success: true, data: { accepted_at: new Date().toISOString(), latest: readingData, analysis } });
  } catch (err) {
    console.error('Telemetry ingest error:', err.message);
    res.status(500).json({ success: false, message: 'Unable to store telemetry.' });
  }
});

// Read endpoints are authenticated for the dashboard. Hardware never receives the JWT.
router.get('/latest', protect, async (req, res) => {
  try {
    const latest = await require('../services/firebaseModel').db.ref('/solar_site/latest').get().then(s => s.exists() ? s.val() : null);
    const analysis = await SolarAnalysis.findOne({ site_id: SITE_ID }).lean();
    res.json({ success: true, latest: latest || null, analysis: analysis || null, site_id: SITE_ID });
  } catch (err) { res.status(500).json({ success: false, message: 'Unable to read telemetry.' }); }
});

router.get('/history', protect, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
    const rows = await SolarTelemetry.find({ site_id: SITE_ID }).sort({ ts: -1 }).limit(limit).lean();
    res.json({ success: true, history: rows.reverse(), count: rows.length, site_id: SITE_ID });
  } catch (err) { res.status(500).json({ success: false, message: 'Unable to read telemetry history.' }); }
});

router.get('/analysis', protect, async (req, res) => {
  try {
    const analysis = await SolarAnalysis.findOne({ site_id: SITE_ID }).lean();
    res.json({ success: true, analysis: analysis || null, site_id: SITE_ID });
  } catch (err) { res.status(500).json({ success: false, message: 'Unable to read analysis.' }); }
});

module.exports = router;
