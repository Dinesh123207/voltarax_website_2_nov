const express = require('express');
const { protect, requireAdmin, requireOperator, requireSite } = require('../middleware/auth');
const { periodStartsIST, energyStats } = require('../services/energy');
const { dashboard, panels, latest } = require('../services/dashboardData');
const { getAiForecast, getAiAnomaly, getAiHealth, getAiStatus, getAiDrift } = require('../services/aiPredictions');
const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');
const { validate, z } = require('../middleware/validate');
const verification = require('../services/accountVerification');
const { getRegistry } = require('../services/devices');
const { getRelayService } = require('../services/relay');
const relayDevice = req => req.query.device_id || process.env.SOLAR_DEVICE_ID || 'nodemcu-01';

const router = express.Router();
const { dashboardValidation } = require('../middleware/dashboardValidation');
const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';

router.get('/dashboard', protect, requireSite, dashboardValidation('get', '/dashboard'), async (req, res) => {
  try { res.json(await dashboard()); }
  catch (err) { res.status(500).json({ success: false, message: 'Dashboard data unavailable.' }); }
});

router.get('/panels', protect, requireSite, dashboardValidation('get', '/panels'), async (req, res) => {
  try {
    let rows = await panels();
    if (req.query.row && req.query.row !== 'all') rows = rows.filter(p => p.row_label === String(req.query.row).toUpperCase());
    res.json(rows);
  } catch (err) { res.status(500).json({ success: false, message: 'Panel data unavailable.' }); }
});

router.get('/forecast', protect, requireSite, dashboardValidation('get', '/forecast'), async (req, res) => {
  try {
    const ai = await getAiForecast();
    const reading = ai ? null : await SolarTelemetry.latest(SITE_ID);
    res.json(require('../services/forecast').currentEstimate(ai, reading));
  } catch (err) { res.status(500).json({ success: false, message: 'Forecast unavailable.' }); }
});

// Everything the ai-engine has published, in one call — powers an "AI Engine"
// panel on the dashboard (forecast/anomaly/health, each individually still
// 'not_enough_data' until its own threshold is met, see ai-engine/config.py).
router.get('/ai/status', protect, requireSite, dashboardValidation('get', '/ai/status'), async (req, res) => {
  try {
    const [forecast, anomaly, health, status, drift] = await Promise.all([
      getAiForecast(), getAiAnomaly(), getAiHealth(), getAiStatus(), getAiDrift(),
    ]);
    res.json({
      forecast: forecast || { status: 'model_unavailable', dataQuality: 'Unavailable' },
      anomaly: anomaly || { status: 'model_unavailable', dataQuality: 'Unavailable' },
      health: health || { status: 'model_unavailable', dataQuality: 'Unavailable' },
      pipeline: status,
      drift: drift || { status: 'model_unavailable', dataQuality: 'Unavailable' },
    });
  } catch (err) { res.status(500).json({ success: false, message: 'AI engine status unavailable.' }); }
});

router.get('/forecast/hourly', protect, requireSite, dashboardValidation('get', '/forecast/hourly'), async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000), start = periodStartsIST(new Date(now * 1000)).day;
    const rows = await SolarTelemetry.find({ site_id: SITE_ID, ts: { $gte: start, $lte: now } }).sort({ ts: -1 }).limit(2000).lean();
    res.json(require('../services/forecast').hourlyReadings(rows, { now }));
  } catch (err) { res.status(500).json({ success: false, message: 'Forecast history unavailable.' }); }
});

router.get('/bfci', protect, requireSite, dashboardValidation('get', '/bfci'), async (req, res) => res.json([]));
router.get('/bfci/shap/:id', protect, requireSite, dashboardValidation('get', '/bfci/shap/:id'), async (req, res) => res.json({ shap: {}, dataQuality: 'unavailable' }));
router.get('/cv', protect, requireSite, dashboardValidation('get', '/cv'), async (req, res) => res.json([]));
router.get('/cv/summary', protect, requireSite, dashboardValidation('get', '/cv/summary'), async (req, res) => res.json({ total_panels: null, counts: { clean: null, dusty: null, cracked: null, bio_degraded: null }, dataQuality: 'Unavailable', note: 'Connect ESP32-CAM / CV pipeline to populate inspections.' }));

router.get('/relay', protect, requireSite, dashboardValidation('get', '/relay'), async (req, res) => {
  try {
    const id = relayDevice(req), device = await getRegistry().get(id);
    const command = device?.site_id === SITE_ID ? await getRelayService().read(id) : null;
    res.json({ device_id: id, battery_on: null, load_on: null, grid_export: null, spare_on: null,
      command, control_enabled: process.env.RELAY_CONTROL_ENABLED === 'true' && device?.enabled === true && device?.relayEnabled === true, physical_state: null, dataQuality: 'Calculated', source: 'command-acknowledgement',
      reason: 'Physical relay contact feedback is unavailable. Acknowledgements describe the firmware GPIO action only.' });
  } catch { res.status(500).json({ success: false, message: 'Relay status unavailable.' }); }
});
router.get('/relay/history', protect, requireSite, dashboardValidation('get', '/relay/history'), async (req, res) => {
  try {
    const id = relayDevice(req), device = await getRegistry().get(id);
    res.json(device?.site_id === SITE_ID ? await getRelayService().history(id, req.query.limit || 50) : []);
  } catch { res.status(500).json({ success: false, message: 'Relay history unavailable.' }); }
});
router.post('/relay/command', protect, requireAdmin, requireSite, validate({ body: z.object({ device_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), desired: z.boolean(), code: z.string().regex(/^\d{6}$/) }).strict() }), async (req, res, next) => {
  try {
    if (!verification.configured()) return res.status(503).json({ success: false, message: 'Email verification is not configured.' });
    if (!(await verification.verify(req.user.email, req.body.code, verification.sensitivePurpose(req.user, 'relay-command', `${req.body.device_id}-${req.body.desired ? 'on' : 'off'}`)))) return res.status(401).json({ success: false, message: 'Invalid or expired verification.' });
    const result = await getRelayService().issue(req.body.device_id, req.body.desired, req.user._id, req.id);
    res.status(result.status).json({ success: !result.error, ...(result.error ? { message: result.error } : { command: result.command }) });
  } catch (error) { next(error); }
});

router.get('/carbon', protect, requireSite, dashboardValidation('get', '/carbon'), async (req, res) => {
  try {
    const now = Date.now() / 1000;
    const starts = periodStartsIST(new Date(now * 1000));
    const rows = await SolarTelemetry.find({ site_id: SITE_ID, ts: { $gte: starts.year - 900, $lte: now } }).sort({ ts: 1 }).lean();
    if (rows.length < 2) return res.json({ success: false, dataQuality: 'unavailable', message: 'Not enough telemetry to calculate carbon impact.' });
    const factor = Number(process.env.GRID_EMISSION_FACTOR || 0.82);
    const today = energyStats(rows, starts.day, now), month = energyStats(rows, starts.month, now), year = energyStats(rows, starts.year, now);
    const convert = (value, scale = 1, digits = 3) => value == null || !Number.isFinite(scale) ? null : Number((value * scale).toFixed(digits));
    const treeFactor = Number(process.env.TREE_CO2_KG_PER_YEAR);
    const tariff = Number(process.env.GRID_TARIFF_INR_PER_KWH);
    res.json({ today_kwh:convert(today.kwh), month_kwh:convert(month.kwh), today_co2_kg:convert(today.kwh, factor), month_co2_kg:convert(month.kwh, factor), year_co2_kg:convert(year.kwh, factor), trees_equivalent:Number.isFinite(treeFactor) && treeFactor > 0 ? convert(year.kwh, factor/treeFactor, 2) : null, grid_saved_inr:Number.isFinite(tariff) && tariff > 0 ? convert(year.kwh, tariff, 0) : null, emission_factor:factor, emission_factor_source:process.env.GRID_EMISSION_FACTOR_SOURCE || 'Unverified configured assumption', tariff_inr_per_kwh:Number.isFinite(tariff) && tariff > 0 ? tariff : null, tree_co2_kg_per_year:Number.isFinite(treeFactor) && treeFactor > 0 ? treeFactor : null, dataQuality:'Estimated', energy_note:'Recorded valid-power intervals only; missing periods are not extrapolated.', coverage_seconds:{today:today.coveredSeconds,month:month.coveredSeconds,year:year.coveredSeconds} });
  } catch (err) { res.status(500).json({ success:false,message:'Carbon analytics unavailable.'}); }
});
router.get('/carbon/monthly', protect, requireSite, dashboardValidation('get', '/carbon/monthly'), async (req,res)=>res.json({ months: [] }));

router.get('/users', protect, requireAdmin, requireSite, dashboardValidation('get', '/users'), async (req,res)=>{
  try { const User=require('../models/User'); const users=await User.find({}, {password:0,resetToken:0,resetTokenExpiry:0}).lean(); res.json({data:users}); }
  catch(err){res.status(500).json({success:false,message:'Users unavailable.'});}
});
router.get('/system', protect, requireSite, dashboardValidation('get', '/system'), async (req,res)=>{ const {reading,lastSeen}=await latest(); res.json({success:true,status:reading?'online':lastSeen?'stale_data':'waiting_for_hardware', last_seen:lastSeen||null, ingestion:'/api/telemetry/ingest', source:'local'}); });
router.get('/health', protect, requireSite, dashboardValidation('get', '/health'), async (req,res)=>res.json({success:true,status:'ok',source:'local'}));

module.exports = router;
