const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { protect, requireOperator, requireSite } = require('../middleware/auth');
const { validate, z, id } = require('../middleware/validate');
const { OperationError } = require('../services/operations');
const { getInspections } = require('../services/inspections');
const { sanitizeImage, MAX_IMAGE_BYTES } = require('../services/images');
function createInspectionRouter({ inspections = getInspections, camera = require('../services/camera').createCamera() } = {}) {
  const router = express.Router(), site = () => process.env.SOLAR_SITE_ID || 'solar_site';
  const limited = rateLimit({ windowMs: 60000, limit: 10, keyGenerator: req => req.user._id, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ success: false, message: 'Photo request limit reached. Try again in a minute.' }) });
  const run = (fn, needsStore = true) => async (req, res, next) => { try { await fn(req, res, needsStore ? await inspections() : null); } catch (error) { if (error instanceof OperationError) return res.status(error.status).json({ success: false, message: error.message }); next(error); } };
  const limit = z.coerce.number().int().min(1).max(200).default(100);
  router.get('/camera/status', protect, requireSite, validate(), run(async (req, res) => res.json(camera.status()), false));
  router.get('/camera/stream', protect, requireSite, validate(), run(async (req, res) => camera.stream(req, res, req.user._id), false));
  const capture = run(async (req, res, service) => res.status(201).json(await service.savePhoto(site(), await camera.snapshot(), 'camera', req.user._id)));
  for (const path of ['/camera/snapshots', '/cv/scan']) router.post(path, protect, requireOperator, requireSite, limited, validate(), capture);
  router.post('/inspection-photos', protect, requireOperator, requireSite, limited, express.raw({ type: ['image/jpeg', 'image/png'], limit: MAX_IMAGE_BYTES }), validate({ body: z.instanceof(Buffer) }), run(async (req, res, service) => res.status(201).json(await service.savePhoto(site(), await sanitizeImage(req.body), 'upload', req.user._id))));
  router.get('/inspection-photos', protect, requireSite, validate({ query: z.object({ limit }).strict() }), run(async (req, res, service) => res.json(await service.listPhotos(site(), req.query.limit))));
  router.get('/inspection-photos/:id', protect, requireSite, validate({ params: z.object({ id }).strict() }), run(async (req, res, service) => {
    const row = await service.getPhoto(site(), req.params.id);
    res.set({ 'Content-Type': row.mime, 'Content-Disposition': `inline; filename="inspection-${row.id}.${row.mime === 'image/png' ? 'png' : 'jpg'}"`, 'Cache-Control': 'no-store', 'X-Data-Quality': require('../config/testMode').simulatorAllowed() ? 'Estimated' : row.source === 'camera' ? 'Measured' : 'Calculated', 'Content-Security-Policy': "default-src 'none'; sandbox; frame-ancestors 'none'" }).send(Buffer.from(row.dataBase64, 'base64'));
  }));
  router.get('/inspections', protect, requireSite, validate({ query: z.object({ kind: z.enum(['camera', 'coating']).optional(), limit }).strict() }), run(async (req, res, service) => res.json(await service.list(site(), req.query))));
  router.post('/inspections', protect, requireOperator, requireSite, validate({ body: z.object({ kind: z.enum(['camera', 'coating']), area: z.string().trim().min(1).max(160), condition: z.enum(['clean', 'dusty', 'cracked', 'peeling', 'other', 'unknown']), notes: z.string().trim().min(1).max(2000), observedAt: z.string().datetime({ offset: true }), photoId: id }).strict() }), run(async (req, res, service) => res.status(201).json(await service.create(site(), req.body, req.user._id))));
  router.get('/coating', protect, requireSite, validate(), run(async (req, res, service) => res.json(await service.coating(site()))));
  return router;
}
module.exports = { createInspectionRouter };
