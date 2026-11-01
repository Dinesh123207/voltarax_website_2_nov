const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { paymentPolicy, verifyHmac } = require('../services/paymentPolicy');
test('checkout defaults disabled, rejects live mode and requires complete test-only configuration', () => {
  assert.equal(paymentPolicy({}).enabled, false);
  assert.throws(() => paymentPolicy({ PAYMENTS_MODE: 'live' }));
  assert.throws(() => paymentPolicy({ RAZORPAY_KEY_ID: 'rzp_live_synthetic' }));
  const env = { PAYMENTS_ENABLED: 'true', RAZORPAY_KEY_ID: 'rzp_test_Synthetic', RAZORPAY_KEY_SECRET: 'synthetic-key-secret', RAZORPAY_WEBHOOK_SECRET: 'synthetic-webhook-secret' };
  assert.equal(paymentPolicy(env).enabled, true);
  assert.equal(paymentPolicy({ ...env, GST_ENABLED: 'true' }).enabled, false);
  assert.equal(paymentPolicy({ ...env, RAZORPAY_WEBHOOK_SECRET: '' }).enabled, false);
});
test('payment and raw-body webhook HMAC checks reject tampering and malformed signatures', () => {
  const raw = Buffer.from('{ "synthetic": true }'), secret = 'synthetic-private-test-value';
  const signature = createHmac('sha256', secret).update(raw).digest('hex');
  assert.equal(verifyHmac(raw, signature, secret), true);
  assert.equal(verifyHmac(Buffer.from('{"synthetic":true}'), signature, secret), false);
  assert.equal(verifyHmac(raw, 'bad', secret), false);
  assert.equal(verifyHmac(raw, signature, ''), false);
});
