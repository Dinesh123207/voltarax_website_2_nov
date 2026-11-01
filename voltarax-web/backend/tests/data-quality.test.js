const test = require('node:test');
const assert = require('node:assert/strict');
const { QUALITY, qualityOf } = require('../services/dataQuality');

test('missing values are unavailable and valid zero values retain their quality', () => {
  assert.equal(qualityOf(null, QUALITY.MEASURED), QUALITY.UNAVAILABLE);
  assert.equal(qualityOf(undefined, QUALITY.MEASURED), QUALITY.UNAVAILABLE);
  assert.equal(qualityOf(NaN, QUALITY.CALCULATED), QUALITY.UNAVAILABLE);
  assert.equal(qualityOf(0, QUALITY.MEASURED), QUALITY.MEASURED);
  assert.equal(qualityOf(false, QUALITY.MEASURED), QUALITY.MEASURED);
});
