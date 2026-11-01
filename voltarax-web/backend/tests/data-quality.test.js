const test = require('node:test');
const assert = require('node:assert/strict');
const { QUALITY, qualityOf } = require('../services/dataQuality');
const { annotate, responseQuality } = require('../services/dataQuality');

test('missing values are unavailable and valid zero values retain their quality', () => {
  assert.equal(qualityOf(null, QUALITY.MEASURED), QUALITY.UNAVAILABLE);
  assert.equal(qualityOf(undefined, QUALITY.MEASURED), QUALITY.UNAVAILABLE);
  assert.equal(qualityOf(NaN, QUALITY.CALCULATED), QUALITY.UNAVAILABLE);
  assert.equal(qualityOf(0, QUALITY.MEASURED), QUALITY.MEASURED);
  assert.equal(qualityOf(false, QUALITY.MEASURED), QUALITY.MEASURED);
});
test('nested API values receive quality without treating missing readings as zero', () => {
  const result = annotate({ power_mw: 0, temp_c: null, forecast_1h_kw: 3, counts: [] });
  assert.equal(result.quality.power_mw, 'Measured');
  assert.equal(result.quality.temp_c, 'Unavailable');
  assert.equal(result.quality.forecast_1h_kw, 'Estimated');
  assert.equal(annotate({ dust_ugm3: 0 }).quality.dust_ugm3, 'Estimated');
  assert.equal(result.quality.counts, 'Unavailable');
  const nested = annotate({ sensors_ok: { ina219: true }, reading: { temp_c: null } });
  assert.deepEqual(nested.sensors_ok, { ina219: true });
  assert.equal(nested.quality['reading.temp_c'], 'Unavailable');
});
test('response annotation honors record redaction and labels empty array responses', () => {
  let output; const headers = {};
  const res = { json: body => { output = body; }, set: (k, v) => { headers[k] = v; } };
  responseQuality({ path: '/users' }, res, () => {});
  res.json({ password: 'test-secret', toJSON() { return { name: 'Test' }; } });
  assert.equal(output.password, undefined); assert.equal(output.name, 'Test');
  res.json([]); assert.equal(headers['X-Data-Quality'], 'Unavailable');
});
