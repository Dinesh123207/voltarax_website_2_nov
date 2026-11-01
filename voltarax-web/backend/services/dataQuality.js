const QUALITY = Object.freeze({ MEASURED: 'Measured', ESTIMATED: 'Estimated', CALCULATED: 'Calculated', UNAVAILABLE: 'Unavailable' });

function qualityOf(value, availableQuality) {
  return value == null || (typeof value === 'number' && !Number.isFinite(value)) ? QUALITY.UNAVAILABLE : availableQuality;
}

const MEASURED_FIELDS = new Set(['voltage_v', 'current_ma', 'power_mw', 'light_lux', 'temp_c', 'humidity_pct', 'rssi', 'uptime_s']);
const ESTIMATED_FIELDS = new Set(['dust_ugm3', 'power_w', 'efficiency_pct', 'performance_ratio', 'irradiance_wm2', 'cell_temp_c', 'trees_equivalent', 'grid_saved_inr', 'emission_factor', 'confidence']);
function normalizeQuality(value, fallback) {
  return Object.values(QUALITY).find(q => q.toLowerCase() === String(value).toLowerCase()) || fallback;
}
function annotate(value, rootQuality = QUALITY.CALCULATED) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(row => annotate(row, rootQuality));
  const quality = {};
  const base = normalizeQuality(value.dataQuality, rootQuality);
  function walk(object, prefix = '') {
    for (const [key, item] of Object.entries(object)) {
      if (key === 'quality' || key === 'dataQuality') continue;
      const path = prefix + key;
      const inferred = MEASURED_FIELDS.has(key) ? QUALITY.MEASURED : ESTIMATED_FIELDS.has(key) || key.startsWith('forecast_') || key.includes('co2') ? QUALITY.ESTIMATED : base;
      quality[path] = qualityOf(item, Array.isArray(item) && !item.length ? QUALITY.UNAVAILABLE : inferred);
      if (item && typeof item === 'object') walk(item, path + '.');
    }
  }
  walk(value);
  // Keep domain maps (sensor flags, SHAP, counts) unchanged; metadata is separate.
  return { ...value, dataQuality: value.success === false ? QUALITY.UNAVAILABLE : base, quality: { ...quality, ...value.quality } };
}
function responseQuality(req, res, next) {
  const send = res.json.bind(res);
  res.json = body => {
    // Preserve custom toJSON redaction (notably UserRecord passwords).
    const safe = JSON.parse(JSON.stringify(body ?? null));
    const base = req.path.includes('/panels') || (req.path.includes('/forecast') && !req.path.includes('/hourly')) ? QUALITY.ESTIMATED : QUALITY.CALCULATED;
    res.set('X-Data-Quality', safe == null || (Array.isArray(safe) && !safe.length) || safe?.success === false ? QUALITY.UNAVAILABLE : base);
    return send(annotate(safe, base));
  };
  next();
}
module.exports = { QUALITY, qualityOf, annotate, responseQuality };
