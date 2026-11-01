// Treat stored results as untrusted input. Publication, measurement and model
// clocks are independent: a newly written result cannot refresh an old input.
const { z } = require('zod');
const { simulatorAllowed } = require('../config/testMode');
const states = ['ok', 'not_enough_data', 'stale_input', 'invalid_input', 'model_expired', 'validation_failed', 'not_enough_daylight', 'model_unavailable'];
const origin = z.enum(['synthetic-test-inputs', 'device-history-unverified-calibration']);
const stamp = z.number().int().positive();
const names = ['forecast_gbr', 'anomaly_isolation_forest', 'health_baseline'];
const driftReference = z.object({ method: z.literal('psi-quantile-v1'), minimum_rows: z.literal(50), threshold: z.literal(0.2),
  features: z.object({ light_lux: z.object({ cuts: z.array(z.number()).min(1).max(9), proportions: z.array(z.number().positive().max(1)).min(2).max(10), rows: z.number().int().min(50) }).strict().optional(),
    temp_c: z.object({ cuts: z.array(z.number()).min(1).max(9), proportions: z.array(z.number().positive().max(1)).min(2).max(10), rows: z.number().int().min(50) }).strict().optional() }).strict().optional().default({}) }).strict();
// RTDB removes null object members and empty arrays; normalize those explicitly.
const metrics = z.object({ mae_mw: z.number().nonnegative(), rmse_mw: z.number().nonnegative(), r2: z.number().max(1).nullable().optional().default(null) }).strict();
const metadata = z.object({
  schema_version: z.literal(2), model: z.enum(names), site_id: z.string(), device_id: z.string(),
  model_version: z.string().regex(/^[A-Za-z0-9_.-]{3,128}$/), trained_at: stamp, source_window_end_ts: stamp,
  artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/), data_origin: origin,
  rows_used: z.number().int().positive(), total_rows_at_train: z.number().int().positive().max(500000),
  library_versions: z.object({ python: z.string().max(64), numpy: z.string().max(64), pandas: z.string().max(64), sklearn: z.string().max(64), joblib: z.string().max(64) }).strict(),
  training_parameters: z.object({ pmax_w: z.number().positive(), temp_coeff: z.number(), noct_c: z.number(), lux_per_wm2: z.number().positive(), daylight_lux_threshold: z.number().nonnegative(), feature_schema: z.literal('current-conditions-ist-v2') }).strict(),
  feature_columns: z.array(z.string().max(64)).max(30).optional(),
  validation: z.object({ status: z.enum(['evaluated', 'unsupervised', 'engineering_reference']), accepted: z.boolean().optional(),
    model: metrics.optional(), baseline: metrics.optional(), split: z.object({ method: z.literal('chronological_holdout'), train_rows: z.number().int().min(50), test_rows: z.number().int().min(20), train_start_ts: stamp, train_end_ts: stamp, test_start_ts: stamp, test_end_ts: stamp }).strict().optional(),
    method_version: z.string().max(100).optional(), baseline_pr: z.number().optional(), baseline_method: z.string().max(500).optional(),
    acceptance_policy: z.string().max(500).optional(), feature_columns: z.array(z.string().max(64)).max(30).optional(),
    imputation: z.string().max(1000).optional(), horizon: z.string().max(200).optional(), units: z.string().max(200).optional(),
    precision: z.number().min(0).max(1).nullable().optional(), recall: z.number().min(0).max(1).nullable().optional(),
    note: z.string().max(1000).optional(), physical_health: z.null().optional(),
  }).strict(),
  val_mae_mw: z.number().nonnegative().optional(), horizon_note: z.string().max(1000).optional(),
  percentile: z.number().optional(), median_pr_observed: z.number().optional(),
  drift_reference: driftReference.optional(),
}).strict();
const common = { schema_version: z.literal(2), site_id: z.string(), device_id: z.string(), updated_at: stamp,
  source_ts: stamp.nullable().optional(), data_origin: origin, dataQuality: z.enum(['Estimated', 'Unavailable']), status: z.enum(states),
  reason: z.string().max(200).optional(), total_rows: z.number().int().nonnegative().max(500000).optional(), daylight_rows: z.number().int().nonnegative().max(500000).optional() };
const schemas = {
  forecast: z.object({ ...common, predicted_power_mw: z.number().nonnegative().max(1e12).optional(), model_metadata: metadata.optional() }).strict(),
  anomaly: z.object({ ...common, is_anomaly: z.boolean().optional(), score: z.number().optional(), model_metadata: metadata.optional() }).strict(),
  health: z.object({ ...common, baseline_pr: z.number().min(0.4).max(1).optional(), physical_health: z.null().optional(), model_metadata: metadata.optional() }).strict(),
};
const info = z.object({ model_version: z.string().regex(/^[A-Za-z0-9_.-]{3,128}$/).nullable().optional().default(null), trained_at: stamp.nullable().optional().default(null),
  load_state: z.enum(['missing', 'ready', 'expired', 'legacy_unverified', 'invalid']),
  validation_status: z.enum(['evaluated', 'unsupervised', 'engineering_reference']).nullable().optional().default(null), data_origin: origin.nullable().optional().default(null) }).strict();
schemas.status = z.object({ ...common, total_rows: z.number().int().nonnegative().max(500000),
  trained_models: z.array(z.enum(names)).max(3).optional().default([]), skipped_models: z.array(z.enum(names)).max(3).optional().default([]),
  model_states: z.object({ forecast: z.enum(states), anomaly: z.enum(states), health: z.enum(states) }).strict(),
  model_info: z.object({ forecast: info, anomaly: info, health: info }).strict() }).strict();
const driftRow = z.object({ status: z.enum(['unavailable', 'insufficient_new_data', 'stable', 'drift_detected']),
  model_version: z.string().regex(/^[A-Za-z0-9_.-]{3,128}$/).nullable().optional().default(null),
  trained_at: stamp.nullable().optional().default(null), source_window_end_ts: stamp.nullable().optional().default(null),
  recent_rows: z.number().int().min(0).max(500).nullable().optional().default(null), max_psi: z.number().nonnegative().nullable().optional().default(null),
  feature_psi: z.object({ light_lux: z.number().nonnegative().optional(), temp_c: z.number().nonnegative().optional() }).strict().optional().default({}) }).strict();
schemas.drift = z.object({ ...common, method: z.literal('psi-quantile-v1'), minimum_rows: z.literal(50), threshold: z.literal(0.2), note: z.string().max(1000),
  models: z.object({ forecast: driftRow, anomaly: driftRow, health: driftRow }).strict() }).strict();
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
function createAiReader({ db, env = process.env, now = () => Math.floor(Date.now() / 1000) }) {
  const site = env.SOLAR_SITE_ID || 'solar_site', device = env.SOLAR_DEVICE_ID || 'nodemcu-01';
  const maxInput = bounded(env.AI_MAX_INPUT_AGE_SECONDS, 120, 5, 3600), maxModel = bounded(env.AI_MAX_MODEL_AGE_SECONDS, 2592000, 3600, 31536000);
  const maxPublication = bounded(env.AI_MAX_AGE_SECONDS, 7200, 5, 86400);
  const parameters = { pmax_w: Number(env.SOLAR_PANEL_PMAX_W || 10), temp_coeff: Number(env.SOLAR_TEMP_COEFF || -0.004), noct_c: Number(env.SOLAR_NOCT_C || 45), lux_per_wm2: Number(env.SOLAR_LUX_PER_WM2 || 120), daylight_lux_threshold: Number(env.AI_DAYLIGHT_LUX_THRESHOLD || 2000), feature_schema: 'current-conditions-ist-v2' };
  const fresh = (ts, age, future = 0) => Number.isInteger(ts) && now() - ts >= -future && now() - ts <= age;
  function validated(section, value) {
    // Reject non-finite values even inside optional nested evaluation details.
    let encoded;
    try { encoded = JSON.stringify(value, (_, item) => { if (typeof item === 'number' && !Number.isFinite(item)) throw Error('Non-finite'); return item; }); } catch { return null; }
    if (!encoded || encoded.length > 200000) return null;
    if (!schemas[section]) return null;
    const parsed = schemas[section].safeParse(value);
    if (!parsed.success) return null;
    value = parsed.data;
    if (value.site_id !== site || value.device_id !== device || !fresh(value.updated_at, maxPublication)) return null;
    if (value.data_origin === 'synthetic-test-inputs' && !simulatorAllowed(env)) return null;
    // Status is useful when explicitly unavailable, but cannot hide stale inputs.
    if (value.status === 'ok' && (!fresh(value.source_ts, maxInput, 300) || value.dataQuality !== 'Estimated')) return null;
    if (section === 'drift') {
      for (const row of Object.values(value.models)) {
        if (row.status === 'unavailable') { if (row.max_psi != null || row.recent_rows != null || Object.keys(row.feature_psi).length) return null; continue; }
        if (!row.model_version || !fresh(row.trained_at, maxModel, 300) || !row.source_window_end_ts || row.source_window_end_ts > value.source_ts || row.recent_rows == null) return null;
        if (row.status === 'insufficient_new_data') { if (row.recent_rows >= 50 || row.max_psi != null || Object.keys(row.feature_psi).length) return null; }
        else if (row.recent_rows < 50 || row.max_psi == null || row.feature_psi.light_lux == null || row.feature_psi.temp_c == null || Math.abs(row.max_psi - Math.max(...Object.values(row.feature_psi))) > 1e-9 || (row.status === 'drift_detected') !== (row.max_psi >= 0.2)) return null;
      }
      return { ...value, valid_until: Math.min(value.updated_at + maxPublication, (value.source_ts || 0) + maxInput,
        ...Object.values(value.models).filter(row => row.status !== 'unavailable').map(row => row.trained_at + maxModel)) };
    }
    if (section === 'status') {
      for (const [key, row] of Object.entries(value.model_info)) {
        if (row.data_origin && row.data_origin !== value.data_origin) return null;
        if (value.model_states[key] === 'ok' && (!row.model_version || !fresh(row.trained_at, maxModel, 300) || row.load_state !== 'ready')) return null;
      }
      return { ...value, valid_until: Math.min(value.updated_at + maxPublication, value.status === 'ok' ? value.source_ts + maxInput : Infinity,
        ...Object.entries(value.model_info).filter(([key]) => value.model_states[key] === 'ok').map(([, row]) => row.trained_at + maxModel)) };
    }
    if (value.status !== 'ok') return null;
    const m = value.model_metadata;
    if (!m || m.model !== { forecast: names[0], anomaly: names[1], health: names[2] }[section] || m.site_id !== site || m.device_id !== device || m.data_origin !== value.data_origin || !fresh(m.trained_at, maxModel, 300) || m.source_window_end_ts > value.source_ts || m.rows_used > m.total_rows_at_train) return null;
    if (Object.entries(parameters).some(([key, expected]) => m.training_parameters[key] !== expected)) return null;
    if (m.drift_reference && Object.values(m.drift_reference.features).some(row => row.proportions.length !== row.cuts.length + 1 || row.rows > m.total_rows_at_train || Math.abs(row.proportions.reduce((a, b) => a + b, 0) - 1) > 1e-6 || row.cuts.some((cut, index) => index > 0 && cut <= row.cuts[index - 1]))) return null;
    if (section === 'forecast') {
      const v = m.validation, split = v.split;
      if (value.predicted_power_mw == null || v.status !== 'evaluated' || v.accepted !== true || !v.model || !v.baseline || !split || split.train_end_ts >= split.test_start_ts || split.test_start_ts > split.test_end_ts || split.test_end_ts > m.source_window_end_ts || v.model.rmse_mw > v.baseline.rmse_mw * 1.05 + 1e-9 || (v.model.r2 != null && v.model.r2 < 0)) return null;
    } else if (section === 'anomaly' && (typeof value.is_anomaly !== 'boolean' || value.score == null || m.validation.status !== 'unsupervised')) return null;
    else if (section === 'health' && (value.baseline_pr == null || m.validation.status !== 'engineering_reference')) return null;
    return value;
  }
  async function readSection(section) {
    const snap = await db.ref(`/sites/${site}/ai/${section}`).get();
    if (snap.exists()) return validated(section, snap.val()); // invalid canonical never falls back to older data
    if (site !== 'solar_site') return null;
    const legacy = await db.ref(`/solar_site/ai/${section}`).get();
    return legacy.exists() ? validated(section, legacy.val()) : null;
  }
  return { readSection, validated };
}
let reader;
const read = section => (reader ||= createAiReader({ db: require('../config/firebase').db })).readSection(section);
module.exports = { createAiReader, getAiForecast: () => read('forecast'), getAiAnomaly: () => read('anomaly'), getAiHealth: () => read('health'), getAiStatus: () => read('status'), getAiDrift: () => read('drift') };
