const express = require('express');
const { protect, requireSite, requireOperator } = require('../middleware/auth');
const { validate, z, id } = require('../middleware/validate');
const { getOperations, OperationError } = require('../services/operations');
const User = require('../models/User');
const note = z.string().trim().min(1).max(2000);
const priority = z.enum(['low', 'medium', 'high', 'critical']);
const status = z.enum(['open', 'in_progress', 'closed']);
const date = z.string().datetime({ offset: true });
const limit = z.coerce.number().int().min(1).max(200).default(100);
function createOperationsRouter({ operations = getOperations, users = User } = {}) {
  const router = express.Router();
  const site = () => process.env.SOLAR_SITE_ID || 'solar_site';
  const run = fn => async (req, res, next) => {
    try { await fn(req, res, await operations()); }
    catch (error) { if (error instanceof OperationError) return res.status(error.status).json({ success: false, message: error.message }); next(error); }
  };
  const checkAssignee = async assigneeId => {
    if (!assigneeId) return;
    const user = await users.findById(assigneeId).select('-password');
    if (!user || !user.isActive || !user.emailVerified || !['admin', 'operator'].includes(user.role) || (user.role !== 'admin' && !user.siteIds?.includes(site()))) throw new OperationError(422, 'Choose an active verified operator or administrator with site access.');
  };
  router.get('/alerts', protect, requireSite, validate({ query: z.object({ resolved: z.enum(['true', 'false']).optional(), limit }).strict() }), run(async (req, res, service) => res.json(await service.listAlerts(site(), { ...req.query, resolved: req.query.resolved == null ? undefined : req.query.resolved === 'true' }))));
  router.post('/alerts', protect, requireOperator, requireSite, validate({ body: z.object({ title: z.string().trim().min(1).max(160), message: note, severity: z.enum(['info', 'warning', 'critical']) }).strict() }), run(async (req, res, service) => res.status(201).json(await service.createAlert(site(), req.body, req.user._id))));
  router.get('/alerts/:id', protect, requireSite, validate({ params: z.object({ id }).strict() }), run(async (req, res, service) => res.json(await service.getAlert(site(), req.params.id))));
  for (const action of ['acknowledge', 'resolve']) router.put(`/alerts/:id/${action}`, protect, requireOperator, requireSite, validate({ params: z.object({ id }).strict(), body: z.object({ note }).strict() }), run(async (req, res, service) => res.json(await service.transitionAlert(site(), req.params.id, action, req.body.note, req.user._id))));
  router.get('/work-orders', protect, requireSite, validate({ query: z.object({ status: status.optional(), limit }).strict() }), run(async (req, res, service) => res.json(await service.listWorkOrders(site(), req.query))));
  router.get('/work-orders/assignees', protect, requireOperator, requireSite, validate(), run(async (req, res) => res.json(await users.listAssignees(site()))));
  router.post('/work-orders', protect, requireOperator, requireSite, validate({ body: z.object({ alertId: id, title: z.string().trim().min(1).max(160), description: note, priority, assigneeId: id.nullable().optional(), dueAt: date.nullable().optional() }).strict() }), run(async (req, res, service) => {
    await checkAssignee(req.body.assigneeId); res.status(201).json(await service.createWorkOrder(site(), req.body, req.user._id));
  }));
  router.get('/work-orders/:id', protect, requireSite, validate({ params: z.object({ id }).strict() }), run(async (req, res, service) => res.json(await service.getWorkOrder(site(), req.params.id))));
  const update = z.object({ status: status.optional(), priority: priority.optional(), assigneeId: id.nullable().optional(), dueAt: date.nullable().optional(), version: z.number().int().positive(), note }).strict()
    .refine(value => ['status', 'priority', 'assigneeId', 'dueAt'].some(key => key in value));
  for (const method of ['put', 'patch']) router[method]('/work-orders/:id', protect, requireOperator, requireSite, validate({ params: z.object({ id }).strict(), body: update }), run(async (req, res, service) => {
    await checkAssignee(req.body.assigneeId); res.json(await service.updateWorkOrder(site(), req.params.id, req.body, req.user._id));
  }));
  router.post('/work-orders/:id/comments', protect, requireOperator, requireSite, validate({ params: z.object({ id }).strict(), body: z.object({ note }).strict() }), run(async (req, res, service) => res.status(201).json(await service.comment(site(), req.params.id, req.body.note, req.user._id))));
  return router;
}
module.exports = { createOperationsRouter };
