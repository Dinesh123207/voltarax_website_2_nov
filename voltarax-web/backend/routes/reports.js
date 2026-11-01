const express = require('express');
const { protect, requireSite, requireOperator } = require('../middleware/auth');
const { validate, z, id } = require('../middleware/validate');
const { OperationError } = require('../services/operations');
function createReportsRouter({ reports = require('../services/reports').getReports } = {}) {
  const router = express.Router(), site = () => process.env.SOLAR_SITE_ID || 'solar_site';
  const run = fn => async (req, res, next) => { try { await fn(req, res, await reports()); } catch (error) { if (error instanceof OperationError) return res.status(error.status).json({ success: false, message: error.message }); next(error); } };
  router.post('/carbon/report', protect, requireOperator, requireSite, validate({ body: z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict() }), run(async (req, res, service) => res.status(201).json(await service.generate(site(), req.body, req.user._id))));
  router.get('/carbon/reports', protect, requireSite, validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).strict() }), run(async (req, res, service) => res.json(await service.list(site(), req.query.limit))));
  router.get('/carbon/reports/:id', protect, requireSite, validate({ params: z.object({ id }).strict() }), run(async (req, res, service) => {
    const row = await service.get(site(), req.params.id); res.json({ id: row.id, siteId: row.siteId, evidence: row.evidence, sha256: row.sha256, createdAt: row.createdAt });
  }));
  router.get('/carbon/reports/:id/pdf', protect, requireSite, validate({ params: z.object({ id }).strict() }), run(async (req, res, service) => {
    const row = await service.get(site(), req.params.id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="voltarax-report-${row.id}.pdf"`, 'X-Data-Quality': 'Calculated', 'Cache-Control': 'no-store' }).send(Buffer.from(row.pdfBase64, 'base64'));
  }));
  return router;
}
module.exports = { createReportsRouter };
