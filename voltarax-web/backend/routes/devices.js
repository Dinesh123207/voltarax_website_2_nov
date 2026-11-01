const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate, z } = require('../middleware/validate');
const { getRegistry } = require('../services/devices');
const verification = require('../services/accountVerification');
const code = z.string().regex(/^\d{6}$/);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const params = z.object({ id }).strict();
const safe = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
function createDeviceRouter({ registry = getRegistry, otp = verification } = {}) {
  const router = express.Router();
  const sensitive = (action, target) => (req, res, next) => {
    if (!otp.configured()) return res.status(503).json({ success: false, message: 'Email verification is not configured.' });
    Promise.resolve(otp.verify(req.user.email, req.body.code, verification.sensitivePurpose(req.user, action, target(req)))).then(valid => valid ? next() : res.status(401).json({ success: false, message: 'Invalid or expired verification.' })).catch(next);
  };
  router.get('/', protect, requireAdmin, validate(), safe(async (req, res) => res.json({ success: true, devices: await registry().list(), limit: 200, note: 'Most recent 200 registered devices; keys are never returned.' })));
  router.get('/:id/history', protect, requireAdmin, validate({ params, query: z.object({ limit: z.coerce.number().int().min(1).max(1000).default(100) }).strict() }), safe(async (req, res) => {
    const device = await registry().get(req.params.id);
    if (!device || device.site_id !== (process.env.SOLAR_SITE_ID || 'solar_site')) return res.status(404).json({ success: false, message: 'Device not found.' });
    const history = await require('../models/SolarTelemetry').find({ site_id: device.site_id, device_id: req.params.id }).sort({ ts: -1 }).limit(req.query.limit).lean();
    res.json({ success: true, history });
  }));
  router.post('/', protect, requireAdmin, validate({ body: z.object({ device_id: id, site_id: id, name: z.string().trim().min(2).max(100), code }).strict() }), sensitive('device-register', req => req.body.device_id), safe(async (req, res) => {
    if (req.body.site_id !== (process.env.SOLAR_SITE_ID || 'solar_site')) return res.status(422).json({ success: false, message: 'This server supports only its configured site.' });
    const result = await registry().create(req.body, req.user._id);
    if (!result) return res.status(409).json({ success: false, message: 'Device already registered.' });
    res.set('Cache-Control', 'no-store').status(201).json({ success: true, ...result, message: 'Copy this key now. It cannot be retrieved again.' });
  }));
  router.post('/:id/rotate-key', protect, requireAdmin, validate({ params, body: z.object({ code }).strict() }), sensitive('device-key-rotate', req => req.params.id), safe(async (req, res) => {
    const result = await registry().rotate(req.params.id, req.user._id);
    if (!result) return res.status(404).json({ success: false, message: 'Device not found.' });
    res.set('Cache-Control', 'no-store').json({ success: true, ...result, message: 'Copy this new key now. The previous key is invalid.' });
  }));
  router.patch('/:id', protect, requireAdmin, validate({ params, body: z.object({ enabled: z.boolean(), relayEnabled: z.boolean(), code }).strict() }), sensitive('device-configure', req => req.params.id), safe(async (req, res) => {
    const device = await registry().update(req.params.id, { enabled: req.body.enabled, relayEnabled: req.body.relayEnabled }, req.user._id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found.' });
    res.json({ success: true, device });
  }));
  return router;
}
module.exports = { createDeviceRouter };
