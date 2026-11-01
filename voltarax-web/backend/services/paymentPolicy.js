const { createHmac, timingSafeEqual } = require('node:crypto');
function paymentPolicy(env = process.env) {
  if (env.PAYMENTS_MODE && env.PAYMENTS_MODE !== 'test') throw new Error('Only test-mode commerce is supported');
  if (env.RAZORPAY_KEY_ID && !/^rzp_test_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID)) throw new Error('Only test-mode payment keys are supported');
  const enabled = env.PAYMENTS_ENABLED === 'true' && !!env.RAZORPAY_KEY_ID && !!env.RAZORPAY_KEY_SECRET && !!env.RAZORPAY_WEBHOOK_SECRET && env.GST_ENABLED !== 'true';
  return { mode: 'test', enabled, gstEnabled: false, keyId: enabled ? env.RAZORPAY_KEY_ID : null,
    reason: enabled ? 'Test payments only. Browser verification is not payment confirmation.' : env.GST_ENABLED === 'true' ? 'Checkout unavailable: GST invoices need reviewed tax configuration.' : 'Checkout unavailable until test payment configuration is complete.' };
}
function verifyHmac(message, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
function gateway(env = process.env) {
  if (!paymentPolicy(env).enabled) throw new Error('Test checkout is disabled');
  const Razorpay = require('razorpay');
  const client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  // Verified against pinned SDK 2.9.8; fail closed if its adapter changes.
  if (!client.api?.rq?.defaults) throw new Error('Payment SDK adapter is unsupported');
  Object.assign(client.api.rq.defaults, { timeout: 10000, maxRedirects: 0, maxContentLength: 100000, maxBodyLength: 100000 });
  return client;
}
module.exports = { paymentPolicy, verifyHmac, gateway };
