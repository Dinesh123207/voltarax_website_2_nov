const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate, z } = require('../middleware/validate');
const { getCommerce, CommerceError } = require('../services/commerce');
const { paymentPolicy, verifyHmac } = require('../services/paymentPolicy');
const uuid = z.string().uuid();
const parameters = z.object({ id: uuid }).strict();
const providerId = prefix => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9]{1,64}$`));
const plan = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(2000),
  pricePaise: z.number().int().min(100).max(1000000000).nullable(), active: z.boolean() }).strict();
const run = (commerce, fn) => async (req, res, next) => {
  try { await fn(req, res, await commerce()); }
  catch (error) { if (error instanceof CommerceError) return res.status(error.status).json({ success: false, message: error.message }); next(error); }
};
function createCommerceWebhook({ commerce = getCommerce, env = process.env } = {}) {
  const router = express.Router();
  router.post('/commerce/webhook', (req, res, next) => {
    if (req.get('content-encoding') && req.get('content-encoding') !== 'identity') return res.status(415).json({ success: false, message: 'Compressed webhook bodies are unsupported.' });
    next();
  }, express.raw({ type: 'application/json', limit: '256kb', inflate: false }),
  validate({ body: z.instanceof(Buffer) }), (req, res, next) => {
    // Reject unauthenticated deliveries before opening any SQL connection.
    try { if (!paymentPolicy(env).enabled) return res.status(503).json({ success: false, message: 'Test webhook configuration is unavailable.' }); }
    catch { return res.status(503).json({ success: false, message: 'Test webhook configuration is unavailable.' }); }
    if (!verifyHmac(req.body, req.get('x-razorpay-signature'), env.RAZORPAY_WEBHOOK_SECRET)) return res.status(401).json({ success: false, message: 'Webhook signature is invalid.' });
    next();
  }, run(commerce, async (req, res, service) => {
    res.json(await service.webhook(req.body, req.get('x-razorpay-signature'), req.get('x-razorpay-event-id') || null));
  }));
  return router;
}
function createCommerceRouter({ commerce = getCommerce } = {}) {
  const router = express.Router();
  const accountLimit = rateLimit({ windowMs: 60000, limit: 10, keyGenerator: req => req.user._id, standardHeaders: 'draft-8', legacyHeaders: false });
  router.get('/commerce/plans', validate(), run(commerce, async (req, res, service) => {
    const config = service.policy();
    res.json({ plans: await service.plans(), checkout_enabled: config.enabled, mode: 'test', message: config.reason, limit: 200, dataQuality: 'Calculated' });
  }));
  router.get('/commerce/orders', protect, validate(), run(commerce, async (req, res, service) => res.json({ orders: await service.orders(req.user._id), mode: 'test', limit: 100, dataQuality: 'Calculated' })));
  router.post('/commerce/orders', protect, accountLimit, validate({ body: z.object({ planId: uuid, planVersion: z.number().int().positive(), requestKey: uuid }).strict() }), run(commerce, async (req, res, service) => {
    const order = await service.createOrder(req.body, req.user._id), config = service.policy();
    res.status(201).json({ order, mode: 'test', checkout: order.status === 'pending' ? { key: config.keyId, order_id: order.gatewayOrderId, amount: order.amountPaise, currency: 'INR' } : null, dataQuality: 'Calculated' });
  }));
  router.get('/commerce/orders/:id', protect, validate({ params: parameters }), run(commerce, async (req, res, service) => res.json(await service.details(req.params.id, req.user._id, req.user.role === 'admin'))));
  router.post('/commerce/orders/:id/verify', protect, accountLimit, validate({ params: parameters, body: z.object({ razorpay_order_id: providerId('order'), razorpay_payment_id: providerId('pay'), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) }).strict() }), run(commerce, async (req, res, service) => res.json(await service.verifyCallback(req.params.id, req.user._id, req.body))));
  router.get('/commerce/orders/:id/invoice', protect, validate({ params: parameters }), run(commerce, async (req, res, service) => {
    const row = await service.invoice(req.params.id, req.user._id, req.user.role === 'admin'); res.json({ id: row.id, evidence: row.evidence, sha256: row.sha256, createdAt: row.createdAt, dataQuality: 'Calculated' });
  }));
  router.get('/commerce/orders/:id/invoice.pdf', protect, validate({ params: parameters }), run(commerce, async (req, res, service) => {
    const row = await service.invoice(req.params.id, req.user._id, req.user.role === 'admin');
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="test-invoice-${row.id}.pdf"`, 'X-Data-Quality': 'Calculated', 'Cache-Control': 'no-store' }).send(Buffer.from(row.pdfBase64, 'base64'));
  }));
  router.get('/commerce/admin/plans', protect, requireAdmin, validate(), run(commerce, async (req, res, service) => res.json({ plans: await service.plans(true), mode: 'test', limit: 200 })));
  router.post('/commerce/admin/plans', protect, requireAdmin, validate({ body: plan }), run(commerce, async (req, res, service) => res.status(201).json(await service.savePlan(req.body, req.user._id))));
  router.patch('/commerce/admin/plans/:id', protect, requireAdmin, validate({ params: parameters, body: plan.extend({ version: z.number().int().positive() }) }), run(commerce, async (req, res, service) => res.json(await service.savePlan(req.body, req.user._id, req.params.id))));
  router.get('/commerce/admin/orders', protect, requireAdmin, validate(), run(commerce, async (req, res, service) => res.json({ orders: await service.orders(req.user._id, true), mode: 'test', limit: 100 })));
  router.post('/commerce/admin/orders/:id/reconcile', protect, requireAdmin, validate({ params: parameters, body: z.object({ gatewayOrderId: providerId('order'), confirm: z.literal(true) }).strict() }), run(commerce, async (req, res, service) => res.json(await service.reconcile(req.params.id, req.body.gatewayOrderId, req.user._id))));
  router.post('/commerce/admin/orders/:id/refunds', protect, requireAdmin, validate({ params: parameters, body: z.object({ requestId: uuid, amountPaise: z.number().int().positive().max(1000000000), note: z.string().trim().min(1).max(2000), confirm: z.literal(true) }).strict() }), run(commerce, async (req, res, service) => res.status(201).json(await service.requestRefund(req.params.id, req.body, req.user._id))));
  router.patch('/commerce/admin/orders/:id/refunds/:refundId', protect, requireAdmin, validate({ params: parameters.extend({ refundId: uuid }), body: z.object({ status: z.enum(['submitted', 'rejected']), gatewayRefundId: providerId('rfnd').optional(), confirm: z.literal(true) }).strict() }), run(commerce, async (req, res, service) => res.json(await service.updateRefund(req.params.id, req.params.refundId, req.body, req.user._id))));
  return router;
}
module.exports = { createCommerceRouter, createCommerceWebhook };
