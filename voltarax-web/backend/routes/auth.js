const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const verification = require('../services/accountVerification');
const { audit } = require('../services/auditLog');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate, z, email, id } = require('../middleware/validate');
const { sendSession, options } = require('../services/session');
const password = z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72);
const loginBody = z.object({ email, password: z.string().min(1).max(72), client: z.enum(['browser', 'native']).default('browser') }).strict();
const code = z.string().regex(/^\d{6}$/);
const purpose = (user, action, target) => `sensitive:${user._id}:${action}:${target}`;
const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createAuthRouter(deps = {}) {
  const users = deps.users || User, otp = deps.otp || verification, log = deps.audit || audit;
  const router = express.Router();
  const emailLimiter = deps.emailLimiter || ((req, res, next) => next());
  const ready = (req, res, next) => otp.configured() ? next() : res.status(503).json({ success: false, message: 'Email verification is not configured.' });
  const deliver = async (user, res) => {
    const result = await otp.issue(user.email);
    if (!result.issued) return res.status(429).json({ success: false, message: 'Please wait before requesting another code.', retryAfter: result.retryAfter });
    return res.status(202).json({ success: true, verificationRequired: true, message: 'Check your email for a verification code.' });
  };
  router.post('/register', validate({ body: z.object({ name: z.string().trim().min(2).max(100), email, password, company: z.string().trim().max(150).optional() }).strict() }), ready, safe(async (req, res) => {
    const exists = await users.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ success: false, message: 'Account already exists. Sign in to continue.' });
    const user = await users.create({ ...req.body, role: 'viewer' });
    return deliver(user, res);
  }));
  router.post('/login', validate({ body: loginBody }), safe(async (req, res) => {
    const user = await users.findOne({ email: req.body.email });
    if (!user || !(await user.comparePassword(req.body.password)) || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (!user.emailVerified) {
      if (!otp.configured()) return res.status(503).json({ success: false, message: 'Email verification is not configured.' });
      return deliver(user, res);
    }
    await users.update(user._id, { lastLogin: new Date().toISOString() });
    const token = sendSession(user, res);
    res.json({ success: true, user, ...(req.body.client === 'native' ? { token } : {}) });
  }));
  router.post('/otp/request', validate({ body: loginBody }), ready, safe(async (req, res) => {
    const user = await users.findOne({ email: req.body.email });
    if (!user || !user.isActive || !(await user.comparePassword(req.body.password))) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (user.emailVerified) return res.status(409).json({ success: false, message: 'Email is already verified. Sign in.' });
    return deliver(user, res);
  }));
  router.post('/otp/verify', validate({ body: loginBody.extend({ code }) }), ready, safe(async (req, res) => {
    const user = await users.findOne({ email: req.body.email });
    if (!user || !user.isActive || !(await user.comparePassword(req.body.password)) || !(await otp.verify(user.email, req.body.code))) return res.status(401).json({ success: false, message: 'Invalid or expired verification.' });
    const verified = await users.update(user._id, { emailVerified: true });
    const token = sendSession(verified, res);
    res.json({ success: true, user: verified, ...(req.body.client === 'native' ? { token } : {}) });
  }));
  router.get('/me', protect, validate(), (req, res) => res.json({ success: true, user: req.user }));
  router.get('/audit', protect, requireAdmin, validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }).strict() }), safe(async (req, res) => {
    res.json({ success: true, events: await require('../services/auditLog').listAudit(req.query.limit) });
  }));
  router.post('/logout', protect, validate(), safe(async (req, res) => {
    await users.revokeSessions(req.user._id);
    res.clearCookie('token', options());
    res.json({ success: true, message: 'Signed out on all devices.' });
  }));
  router.post('/sensitive/request', protect, emailLimiter, validate({ body: z.object({ action: z.enum(['password', 'user-access']), target: id }).strict() }), ready, safe(async (req, res) => {
    if (req.body.action === 'user-access' ? req.user.role !== 'admin' : req.body.target !== req.user._id) return res.status(403).json({ success: false, message: 'Access denied.' });
    const result = await otp.issue(req.user.email, purpose(req.user, req.body.action, req.body.target));
    res.status(result.issued ? 202 : 429).json({ success: result.issued, message: result.issued ? 'Verification code requested.' : 'Please wait before requesting another code.' });
  }));
  router.post('/password', protect, emailLimiter, validate({ body: z.object({ password, code }).strict() }), ready, safe(async (req, res) => {
    if (!(await otp.verify(req.user.email, req.body.code, purpose(req.user, 'password', req.user._id)))) return res.status(401).json({ success: false, message: 'Invalid or expired verification.' });
    await users.secureUpdate(req.user._id, { password: await bcrypt.hash(req.body.password, 12) });
    res.clearCookie('token', options());
    res.json({ success: true, message: 'Password changed. Sign in again.' });
  }));
  router.patch('/users/:id/access', protect, requireAdmin, emailLimiter, validate({ params: z.object({ id }).strict(), body: z.object({ role: z.enum(['viewer', 'operator', 'admin']), siteIds: z.array(id).max(100), isActive: z.boolean(), code }).strict() }), ready, safe(async (req, res) => {
    if (req.params.id === req.user._id) return res.status(409).json({ success: false, message: 'Ask another administrator to change your access.' });
    if (!(await users.findById(req.params.id))) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!(await otp.verify(req.user.email, req.body.code, purpose(req.user, 'user-access', req.params.id)))) return res.status(401).json({ success: false, message: 'Invalid or expired verification.' });
    await log({ actorId: req.user._id, action: 'user-access-attempt', targetId: req.params.id, requestId: req.id });
    const { role, siteIds, isActive } = req.body;
    await users.secureUpdate(req.params.id, { role, siteIds, isActive });
    await log({ actorId: req.user._id, action: 'user-access-applied', targetId: req.params.id, requestId: req.id });
    res.json({ success: true });
  }));
  return router;
}
module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
