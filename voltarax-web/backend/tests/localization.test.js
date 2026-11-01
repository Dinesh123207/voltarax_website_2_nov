const test = require('node:test');
const assert = require('node:assert/strict');
const { phraseId, lookupCopy } = require('../../frontend/i18n/phrase-id.ts');
test('literal localization preserves opaque values, numbers and surrounding whitespace, with exact source binding', () => {
  const id = phraseId('Unavailable'), source = { [id]: 'Unavailable' }, hindi = { [id]: 'उपलब्ध नहीं' };
  assert.equal(lookupCopy(' Unavailable ', source, hindi), ' उपलब्ध नहीं ');
  assert.equal(lookupCopy('synthetic-private-device-value', source, hindi), 'synthetic-private-device-value');
  assert.equal(lookupCopy(0, source, hindi), 0); assert.equal(lookupCopy(false, source, hindi), false);
  const record = { note: 'Original entered observation' }; assert.equal(lookupCopy(record, source, hindi), record);
  assert.equal(lookupCopy('Unavailable', { [id]: 'Different source under the same hash' }, hindi), 'Unavailable');
  assert.equal(lookupCopy('Unavailable', source, {}), 'Unavailable');
});
