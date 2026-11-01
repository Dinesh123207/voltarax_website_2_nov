const test = require('node:test');
const assert = require('node:assert/strict');
const { rupeesToPaise, inr } = require('../../frontend/lib/money.ts');
test('INR inputs convert to exact integer paise and never round extra decimals or parse exponent notation', () => {
  assert.equal(rupeesToPaise(''), null); assert.equal(rupeesToPaise('123.45'), 12345); assert.equal(rupeesToPaise('1.01'), 101);
  assert.equal(rupeesToPaise('10000000'), 1000000000);
  for (const input of ['0', '0.99', '1.001', '1e3', 'NaN', '-1', '1,000', '10000001']) assert.throws(() => rupeesToPaise(input));
  assert.equal(inr(null), 'Price unset'); assert.match(inr(10000000), /1,00,000\.00/);
});
