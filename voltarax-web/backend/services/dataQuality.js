const QUALITY = Object.freeze({ MEASURED: 'Measured', ESTIMATED: 'Estimated', CALCULATED: 'Calculated', UNAVAILABLE: 'Unavailable' });

function qualityOf(value, availableQuality) {
  return value == null || (typeof value === 'number' && !Number.isFinite(value)) ? QUALITY.UNAVAILABLE : availableQuality;
}

module.exports = { QUALITY, qualityOf };
