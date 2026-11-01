const express = require('express');
const { validate, z } = require('../middleware/validate');
const { createHash, timingSafeEqual } = require('node:crypto');
const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');
const { saveAnalysis } = require('../services/solarAnalytics');
const { protect, requireSite } = require('../middleware/auth');
const { QUALITY, qualityOf } = require('../services/dataQuality');

const router = express.Router();
const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';
const DEVICE_KEY = process.env.HARDWARE_API_KEY || '';

function deviceAuth(req, res, next) {
  if (!DEVICE_KEY) return res.status(503).json({ success: false, message: 'Hardware ingestion is not configured.' });
  const supplied = req.get('x-device-key') || req.body?.device_key;
  if (typeof supplied !== 'string' || !timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(DEVICE_KEY).digest())) {
    return res.status(401).json({ success: false, message: 'Invalid device key.' });
  }
  next();
}

const measurements = {
  voltage_v: z.number().min(0).max(1000).optional(), current_ma: z.number().min(0).max(1e9).optional(),
  power_mw: z.number().min(0).max(1e12).optional(), light_lux: z.number().min(0).max(200000).optional(),
  temp_c: z.number().min(-50).max(150).optional(), humidity_pct: z.number().min(0).max(100).optional(),
  dust_ugm3: z.number().min(0).max(1e6).optional(), rssi: z.number().int().min(-150).max(0).optional(), uptime_s: z.number().int().min(0).optional(),
};
const schema = validate({ body: z.object({ ...measurements, ts: z.number().int().positive().optional(),
  device_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(), device_key: z.string().max(256).optional(),
  sensors_ok: z.object({ ina219: z.boolean().optional(), bh1750: z.boolean().optional(), dht11: z.boolean().optional(), dust: z.boolean().optional() }).strict().optional(),
}).strict().refine(data => ['voltage_v', 'current_ma', 'power_mw', 'light_lux', 'temp_c', 'humidity_pct', 'dust_ugm3'].some(k => data[k] !== undefined)) });

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
  try {
    const reading = await SolarTelemetry.create(cleanPayload(req.body));
    const readingData = reading.toObject ? reading.toObject() : reading;
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
    require('../services/logger').logger.error({ event: 'telemetry-write-failed', requestId: req.id }, 'Telemetry unavailable');
    res.status(500).json({ success: false, message: 'Unable to store telemetry.' });
  }
});

// Read endpoints are authenticated for the dashboard. Hardware never receives the JWT.
router.get('/latest', protect, requireSite, validate(), async (req, res) => {
  try {
    const latest = await SolarTelemetry.latest(SITE_ID);
    const analysis = await SolarAnalysis.findOne({ site_id: SITE_ID }).lean();
    res.json({ success: true, latest: latest || null, analysis: analysis || null, site_id: SITE_ID,
      quality: { latest: qualityOf(latest, QUALITY.MEASURED), analysis: qualityOf(analysis, QUALITY.CALCULATED) } });
  } catch (err) { res.status(500).json({ success: false, message: 'Unable to read telemetry.' }); }
});

router.get('/history', protect, requireSite, validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(1000).optional() }).strict() }), async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
    const rows = await SolarTelemetry.find({ site_id: SITE_ID }).sort({ ts: -1 }).limit(limit).lean();
    res.json({ success: true, history: rows.reverse(), count: rows.length, site_id: SITE_ID,
      quality: { history: rows.length ? QUALITY.MEASURED : QUALITY.UNAVAILABLE, count: QUALITY.CALCULATED } });
  } catch (err) { res.status(500).json({ success: false, message: 'Unable to read telemetry history.' }); }
});

router.get('/analysis', protect, requireSite, validate(), async (req, res) => {
  try {
    const analysis = await SolarAnalysis.findOne({ site_id: SITE_ID }).lean();
    res.json({ success: true, analysis: analysis || null, site_id: SITE_ID,
      quality: { analysis: qualityOf(analysis, QUALITY.CALCULATED) } });
  } catch (err) { res.status(500).json({ success: false, message: 'Unable to read analysis.' }); }
});

module.exports = router;
