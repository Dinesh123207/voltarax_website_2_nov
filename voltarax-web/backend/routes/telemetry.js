const express = require('express');
const { validate, z } = require('../middleware/validate');
const { createDeviceAuth } = require('../middleware/deviceAuth');
const { ingestReading } = require('../services/deviceIngest');
const { getRegistry } = require('../services/devices');
const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');
const { saveAnalysis } = require('../services/solarAnalytics');
const { protect, requireSite } = require('../middleware/auth');
const { QUALITY, qualityOf } = require('../services/dataQuality');

const router = express.Router();
const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';
const deviceAuth = createDeviceAuth();

const measurements = {
  voltage_v: z.number().min(0).max(1000).optional(), current_ma: z.number().min(0).max(1e9).optional(),
  power_mw: z.number().min(0).max(1e12).optional(), light_lux: z.number().min(0).max(200000).optional(),
  temp_c: z.number().min(-50).max(150).optional(), humidity_pct: z.number().min(0).max(100).optional(),
  dust_ugm3: z.number().min(0).max(1e6).optional(), rssi: z.number().int().min(-150).max(0).optional(), uptime_s: z.number().int().min(0).optional(),
};
const schema = validate({ body: z.object({ ...measurements, ts: z.number().int().positive().optional(),
  device_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(), site_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(), firmware_version: z.string().min(1).max(64).optional(), simulated: z.boolean().optional(), device_key: z.string().max(256).optional(),
  sensors_ok: z.object({ ina219: z.boolean().optional(), bh1750: z.boolean().optional(), dht11: z.boolean().optional(), dust: z.boolean().optional() }).strict().optional(),
}).strict().refine(data => ['voltage_v', 'current_ma', 'power_mw', 'light_lux', 'temp_c', 'humidity_pct', 'dust_ugm3'].some(k => data[k] !== undefined) || Object.values(data.sensors_ok || {}).includes(false)) });

function cleanPayload(body, device) {
  const fields = ['voltage_v','current_ma','power_mw','light_lux','temp_c','humidity_pct','dust_ugm3','rssi','uptime_s'];
  const out = {};
  for (const key of fields) if (body[key] !== undefined && Number.isFinite(Number(body[key]))) out[key] = Number(body[key]);
  out.sensors_ok = {};
  for (const sensor of ['ina219', 'bh1750', 'dht11', 'dust']) {
    if (typeof body.sensors_ok?.[sensor] === 'boolean') out.sensors_ok[sensor] = body.sensors_ok[sensor];
  }
  out.ts = body.ts ? Number(body.ts) : Math.floor(Date.now() / 1000);
  const sensorFields = { ina219: ['voltage_v', 'current_ma', 'power_mw'], bh1750: ['light_lux'], dht11: ['temp_c', 'humidity_pct'], dust: ['dust_ugm3'] };
  for (const [sensor, fields] of Object.entries(sensorFields)) if (out.sensors_ok[sensor] === false) for (const field of fields) delete out[field];
  out.device_id = device.device_id;
  out.site_id = device.site_id;
  if (body.firmware_version) out.firmware_version = body.firmware_version;
  if (body.simulated === true) out.simulated = true;
  return out;
}

// POST /api/telemetry/ingest — ESP8266/other hardware writes here.
router.post('/ingest', deviceAuth, schema, async (req, res) => {
  try {
    if (req.body.simulated && !require('../config/testMode').simulatorAllowed()) return res.status(403).json({ success: false, message: 'Synthetic data is restricted to the enabled localhost demo emulator.' });
    if (req.device.site_id !== SITE_ID || (req.body.device_id && req.body.device_id !== req.device.device_id) || (req.body.site_id && req.body.site_id !== req.device.site_id)) return res.status(422).json({ success: false, message: 'Device identity does not match its credential.' });
    if (!req.device.legacy && !req.body.ts) return res.status(422).json({ success: false, message: 'Device timestamp is required.' });
    const result = await ingestReading(cleanPayload(req.body, req.device));
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const readingData = result.reading;
    if (!req.device.legacy) await getRegistry().seen(req.device.device_id, req.body.firmware_version);
    const previous = result.latestUpdated ? await SolarAnalysis.findOne({ site_id: SITE_ID }).lean() : null;
    const analysis = result.latestUpdated && (!previous || Number(previous.ts) < readingData.ts) ? await saveAnalysis(readingData, {
      siteId: SITE_ID,
      panelPmaxW: process.env.SOLAR_PANEL_PMAX_W,
      tempCoeff: process.env.SOLAR_TEMP_COEFF,
      noctC: process.env.SOLAR_NOCT_C,
      baselinePr: process.env.SOLAR_BASELINE_PR,
      luxPerWm2: process.env.SOLAR_LUX_PER_WM2,
      dustHigh: process.env.SOLAR_DUST_HIGH,
    }) : previous;
    res.status(result.status).json({ success: true, duplicate: result.duplicate, outOfOrder: result.outOfOrder, data: { accepted_at: new Date().toISOString(), accepted_reading: readingData, latest: await SolarTelemetry.latest(SITE_ID), analysis } });
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
      freshness: require('../services/readingFreshness').readingFreshness(latest),
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
