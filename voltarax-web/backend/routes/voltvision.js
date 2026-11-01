const express = require('express');
const { protect, requireAdmin, requireOperator } = require('../middleware/auth');
const { periodStartsIST, integrateKwh } = require('../services/energy');
const { dashboard, panels, latest } = require('../services/dashboardData');
const { getAiForecast, getAiAnomaly, getAiHealth, getAiStatus } = require('../services/aiPredictions');
const SolarTelemetry = require('../models/SolarTelemetry');
const SolarAnalysis = require('../models/SolarAnalysis');

const router = express.Router();
const SITE_ID = process.env.SOLAR_SITE_ID || 'solar_site';

router.get('/dashboard', protect, async (req, res) => {
  try { res.json(await dashboard()); }
  catch (err) { res.status(500).json({ success: false, message: 'Dashboard data unavailable.' }); }
});

router.get('/panels', protect, async (req, res) => {
  try {
    let rows = await panels();
    if (req.query.row && req.query.row !== 'all') rows = rows.filter(p => p.row_label === String(req.query.row).toUpperCase());
    res.json(rows);
  } catch (err) { res.status(500).json({ success: false, message: 'Panel data unavailable.' }); }
});

router.get('/alerts', protect, async (req, res) => {
  try {
    const { analysis } = await latest();
    const alerts = (analysis?.alerts || []).map((message, i) => ({ id: `sensor-${i}`, severity: analysis.status === 'FAULT' ? 'critical' : 'warning', title: message, message, resolved: false, created_at: analysis.ts }));
    const ai = await getAiAnomaly();
    if (ai?.is_anomaly) {
      alerts.push({ id: 'ai-anomaly', severity: 'warning', title: 'AI engine flagged an unusual reading', message: `Isolation Forest anomaly score ${ai.score} — outside the pattern learned from recent history.`, resolved: false, created_at: ai.updated_at });
    }
    res.json(alerts.filter(a => req.query.resolved === 'true' ? a.resolved : !a.resolved));
  } catch (err) { res.status(500).json({ success: false, message: 'Alert data unavailable.' }); }
});

router.put('/alerts/:id/resolve', protect, requireOperator, async (req, res) => res.status(501).json({ success: false, message: 'Persistent alert resolution is not connected yet.' }));

router.get('/forecast', protect, async (req, res) => {
  try {
    const ai = await getAiForecast();
    if (ai) {
      const kw = ai.predicted_power_mw / 1e6;
      return res.json({
        forecast_1h_kw: Number(kw.toFixed(3)),
        forecast_6h_kwh: Number((kw * 6).toFixed(3)),
        forecast_24h_kwh: Number((kw * 8).toFixed(3)),
        forecast_7d_kwh: Number((kw * 8 * 7).toFixed(3)),
        confidence: [0.5, 0.4, 0.3, 0.2],
        dataQuality: 'estimated', confidence_type: 'fixed assumptions', horizon_note: 'Estimate from current conditions, not a weather-ahead forecast',
        model_version: 'ai-engine:forecast_gbr',
        model_metadata: ai.model_metadata,
        generated_at: new Date(ai.updated_at * 1000).toISOString(),
        recommendation: 'AI forecast active, trained on hardware history.',
      });
    }
    const rows = await SolarTelemetry.find({ site_id: SITE_ID }).sort({ ts: -1 }).limit(60).lean();
    const daylight = rows.filter(r => Number(r.light_lux) > 2000);
    if (!daylight.length) return res.json({ success: false, dataQuality: 'unavailable', message: 'Not enough daylight telemetry for an estimate.' });
    const avgKw = daylight.length ? daylight.reduce((s, r) => s + Number(r.power_mw || 0), 0) / daylight.length / 1e6 : 0;
    res.json({ forecast_1h_kw: Number(avgKw.toFixed(3)), forecast_6h_kwh: Number((avgKw * 6).toFixed(3)), forecast_24h_kwh: Number((avgKw * 8).toFixed(3)), forecast_7d_kwh: Number((avgKw * 8 * 7).toFixed(3)), confidence: [0.35,0.3,0.25,0.2], dataQuality:'estimated', confidence_type:'fixed assumptions', horizon_note:'Estimate from current conditions, not a weather-ahead forecast', model_version: 'baseline-live-average', generated_at: new Date().toISOString(), recommendation: 'Baseline estimate based on recent daylight readings.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Forecast unavailable.' }); }
});

// Everything the ai-engine has published, in one call — powers an "AI Engine"
// panel on the dashboard (forecast/anomaly/health, each individually still
// 'not_enough_data' until its own threshold is met, see ai-engine/config.py).
router.get('/ai/status', protect, async (req, res) => {
  try {
    const [forecast, anomaly, health, status] = await Promise.all([
      getAiForecast(), getAiAnomaly(), getAiHealth(), getAiStatus(),
    ]);
    res.json({
      forecast: forecast || { status: 'not_enough_data' },
      anomaly: anomaly || { status: 'not_enough_data' },
      health: health || { status: 'not_enough_data' },
      pipeline: status,
    });
  } catch (err) { res.status(500).json({ success: false, message: 'AI engine status unavailable.' }); }
});

router.get('/forecast/hourly', protect, async (req, res) => {
  try {
    const rows = await SolarTelemetry.find({ site_id: SITE_ID }).sort({ ts: -1 }).limit(120).lean();
    const byHour = {};
    for (const r of rows) { const h = new Date(Number(r.ts) * 1000).getHours(); byHour[h] = byHour[h] || []; byHour[h].push(Number(r.power_mw || 0) / 1e6); }
    const hourly = Object.entries(byHour).sort((a,b) => Number(a[0])-Number(b[0])).map(([hour, vals]) => ({ hour: `${String(hour).padStart(2,'0')}:00`, kw: Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3)) }));
    res.json(hourly);
  } catch (err) { res.status(500).json({ success: false, message: 'Forecast history unavailable.' }); }
});

router.get('/bfci', protect, async (req, res) => res.json([]));
router.get('/bfci/shap/:id', protect, async (req, res) => res.json({ shap: {}, dataQuality: 'unavailable' }));
router.get('/cv', protect, async (req, res) => res.json([]));
router.get('/cv/summary', protect, async (req, res) => res.json({ total_panels: 0, counts: { clean: 0, dusty: 0, cracked: 0, bio_degraded: 0 }, note: 'Connect ESP32-CAM / CV pipeline to populate inspections.' }));
router.post('/cv/scan', protect, requireOperator, async (req, res) => res.status(501).json({ success: false, message: 'Camera/CV pipeline is not connected yet.' }));

router.get('/relay', protect, async (req, res) => res.json({ battery_on: null, load_on: null, grid_export: null, spare_on: null, reason: 'Relay hardware not connected', commanded_by: 'system', commanded_at: null, source: 'not-connected' }));
router.get('/relay/history', protect, async (req, res) => res.json([]));

router.get('/carbon', protect, async (req, res) => {
  try {
    const now = Date.now() / 1000;
    const starts = periodStartsIST(new Date(now * 1000));
    const rows = await SolarTelemetry.find({ site_id: SITE_ID, ts: { $gte: starts.year - 900, $lte: now } }).sort({ ts: 1 }).lean();
    if (rows.length < 2) return res.json({ success: false, dataQuality: 'unavailable', message: 'Not enough telemetry to calculate carbon impact.' });
    const factor = Number(process.env.GRID_EMISSION_FACTOR || 0.82);
    const todayKwh = integrateKwh(rows, starts.day, now);
    const monthKwh = integrateKwh(rows, starts.month, now);
    const yearKwh = integrateKwh(rows, starts.year, now);
    res.json({ today_kwh:Number(todayKwh.toFixed(3)), month_kwh:Number(monthKwh.toFixed(3)), today_co2_kg:Number((todayKwh*factor).toFixed(3)), month_co2_kg:Number((monthKwh*factor).toFixed(3)), year_co2_kg:Number((yearKwh*factor).toFixed(3)), trees_equivalent:Number((yearKwh*factor/21).toFixed(2)), grid_saved_inr:Number((yearKwh*8).toFixed(0)), emission_factor:factor, dataQuality:'calculated' });
  } catch (err) { res.status(500).json({ success:false,message:'Carbon analytics unavailable.'}); }
});
router.get('/carbon/monthly', protect, async (req,res)=>res.json({ months: [] }));
router.post('/carbon/report', protect, requireOperator, async (req,res)=>res.status(501).json({success:false,message:'ESG report generation is coming soon.'}));

router.get('/work-orders', protect, async (req,res)=>res.json([]));
router.put('/work-orders/:id', protect, requireOperator, async (req,res)=>res.status(501).json({success:false,message:'Work orders require a maintenance workflow to be connected.'}));
router.patch('/work-orders/:id', protect, requireOperator, async (req,res)=>res.status(501).json({success:false,message:'Work orders require a maintenance workflow to be connected.'}));
router.get('/users', protect, requireAdmin, async (req,res)=>{
  try { const User=require('../models/User'); const users=await User.find({}, {password:0,resetToken:0,resetTokenExpiry:0}).lean(); res.json({data:users}); }
  catch(err){res.status(500).json({success:false,message:'Users unavailable.'});}
});
router.get('/system', protect, async (req,res)=>{ const {reading}=await latest(); res.json({success:true,status:reading?'online':'waiting_for_hardware', last_seen:reading?.ts||null, ingestion:'/api/telemetry/ingest', source:'local'}); });
router.get('/health', protect, async (req,res)=>res.json({success:true,status:'ok',source:'local'}));

module.exports = router;
