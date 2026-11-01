const test = require('node:test');
const assert = require('node:assert/strict');
const { otpMessage, mailConfigured } = require('../services/mailer');
test('React Email renders both formats and mail defaults to disabled', async () => {
  assert.equal(mailConfigured({ SMTP_HOST: 'example.test' }), false);
  const message = await otpMessage({ code: '001234', purpose: 'registration', expiresMinutes: 10 });
  assert.match(message.html, /001234/); assert.match(message.text, /10 minutes/); assert.match(message.text, /verify your email/);
  assert.doesNotMatch(message.html, /<(img|link|script)\b/i);
});
