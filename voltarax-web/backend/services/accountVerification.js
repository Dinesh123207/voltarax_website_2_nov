const { createOtpService } = require('./otp');
const { mailConfigured, sendOtp } = require('./mailer');
let service;
function getService() {
  if (!service) service = createOtpService({ secret: process.env.OTP_SECRET, send: sendOtp,
    store: { async transaction(key, update) {
      const { db } = require('../config/firebase');
      const result = await db.ref(`authChallenges/${key}`).transaction(update);
      return { committed: result.committed, value: result.snapshot.val() };
    } } });
  return service;
}
function configured() { return mailConfigured() && require('./session').validSecret(process.env.OTP_SECRET); }
const sensitivePurpose = (user, action, target) => `sensitive:${user._id}:${action}:${target}`;
module.exports = { configured, sensitivePurpose, issue: (...args) => getService().issue(...args), verify: (...args) => getService().verify(...args) };
