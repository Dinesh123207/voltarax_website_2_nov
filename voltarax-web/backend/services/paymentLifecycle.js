const { randomUUID, createHash } = require('node:crypto');
const { eq, and, or, desc } = require('drizzle-orm');
const { z } = require('zod');
const s = require('../db/schema.ts');
const { verifyHmac } = require('./paymentPolicy');
const one = rows => rows[0];
const gatewayId = prefix => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9]{1,64}$`));
const amount = z.number().int().min(1).max(1000000000);
const captured = z.object({ id: gatewayId('pay'), order_id: gatewayId('order'), amount: amount.min(100), currency: z.literal('INR'), status: z.literal('captured'), captured: z.literal(true) }).passthrough();
const refunded = z.object({ id: gatewayId('rfnd'), payment_id: gatewayId('pay'), amount, currency: z.literal('INR').optional(), status: z.literal('processed') }).passthrough();
function createLifecycle({ db, env, policy, audit, order, fail, fetchRemoteOrder, renderInvoice }) {
  const enabled = () => { if (!policy().enabled) fail(503, policy().reason); };
  async function verifyCallback(id, userId, data) {
    enabled();
    return db.transaction(async tx => {
      const row = one(await tx.select().from(s.commerceOrders).where(and(eq(s.commerceOrders.id, id), eq(s.commerceOrders.userId, userId))).for('update'));
      if (!row) fail(404, 'Order not found.');
      if (!row.gatewayOrderId || data.razorpay_order_id !== row.gatewayOrderId || !gatewayId('pay').safeParse(data.razorpay_payment_id).success ||
          !verifyHmac(`${row.gatewayOrderId}|${data.razorpay_payment_id}`, data.razorpay_signature, env.RAZORPAY_KEY_SECRET)) fail(401, 'Payment signature is invalid.');
      if (row.callbackPaymentId && row.callbackPaymentId !== data.razorpay_payment_id) fail(409, 'A different callback is already recorded. Await webhook review.');
      if (!row.callbackVerifiedAt) {
        await tx.update(s.commerceOrders).set({ callbackPaymentId: data.razorpay_payment_id, callbackVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(s.commerceOrders.id, id));
        await audit(tx, 'payment.callback_verified', id, userId);
      }
      return { verified: true, confirmed: ['paid', 'refunded'].includes(row.status), message: 'Signature verified. Only the captured-payment webhook confirms payment.' };
    });
  }
  async function webhook(raw, signature, eventId = null) {
    enabled();
    if (!Buffer.isBuffer(raw) || raw.length > 262144 || !verifyHmac(raw, signature, env.RAZORPAY_WEBHOOK_SECRET)) fail(401, 'Webhook signature is invalid.');
    if (eventId != null && !/^[A-Za-z0-9_-]{1,128}$/.test(eventId)) fail(422, 'Invalid event identifier.');
    let body;
    try { body = JSON.parse(raw.toString('utf8')); } catch { fail(422, 'Invalid webhook JSON.'); }
    if (!z.object({ event: z.string().min(1).max(80) }).passthrough().safeParse(body).success) fail(422, 'Invalid webhook event.');
    const event = body.event, digest = createHash('sha256').update(raw).digest('hex');
    let entity;
    if (event === 'payment.captured') {
      const parsed = captured.safeParse(body.payload?.payment?.entity); if (!parsed.success) fail(422, 'Invalid captured-payment payload.'); entity = parsed.data;
    } else if (event === 'refund.processed') {
      const parsed = refunded.safeParse(body.payload?.refund?.entity); if (!parsed.success) fail(422, 'Invalid processed-refund payload.'); entity = parsed.data;
    }
    return db.transaction(async tx => {
      const inserted = one(await tx.insert(s.commerceEvents).values({ digest, eventId, event, result: 'processing', receivedAt: new Date() }).onConflictDoNothing().returning());
      if (!inserted) {
        const previous = one(await tx.select().from(s.commerceEvents).where(eq(s.commerceEvents.digest, digest)));
        if (!previous) fail(409, 'Event identifier conflicts with a different body. Review required.');
        return { accepted: true, duplicate: true, result: previous.result };
      }
      const finish = async (result, orderId = null) => {
        await tx.update(s.commerceEvents).set({ result, orderId }).where(eq(s.commerceEvents.digest, digest));
        return { accepted: true, duplicate: false, result };
      };
      if (!entity) return finish('ignored_event');
      let row;
      if (event === 'payment.captured') row = one(await tx.select().from(s.commerceOrders).where(eq(s.commerceOrders.gatewayOrderId, entity.order_id)).for('update'));
      else {
        const payment = one(await tx.select().from(s.commercePayments).where(eq(s.commercePayments.id, entity.payment_id)));
        if (payment) row = one(await tx.select().from(s.commerceOrders).where(eq(s.commerceOrders.id, payment.orderId)).for('update'));
      }
      // A refund/capture can precede local creation confirmation. Roll back the
      // event reservation so a provider retry can succeed after reconciliation.
      if (!row) fail(503, 'Order or capture is not available yet. Retry later.');
      const review = async () => {
        await tx.update(s.commerceOrders).set({ status: 'review_required', updatedAt: new Date() }).where(eq(s.commerceOrders.id, row.id));
        await audit(tx, 'payment.review_required', row.id, 'gateway-webhook'); return finish('review_required', row.id);
      };
      if (event === 'payment.captured') {
        if (entity.amount !== row.amountPaise || entity.currency !== row.currency) return review();
        const existing = one(await tx.select().from(s.commercePayments).where(or(eq(s.commercePayments.id, entity.id), eq(s.commercePayments.orderId, row.id))));
        if (existing) return existing.id === entity.id && existing.orderId === row.id ? finish('capture_already_recorded', row.id) : review();
        if (row.status === 'review_required') return finish('review_required', row.id);
        const now = new Date(), id = randomUUID();
        const evidence = { id: `TEST-${id}`, mode: 'test', orderId: row.id, userId: row.userId, gatewayOrderId: row.gatewayOrderId,
          paymentId: entity.id, planName: row.planSnapshot.name, amountPaise: row.amountPaise, currency: 'INR', confirmedAt: now.toISOString(),
          gst: null, dataQuality: 'Calculated', notice: 'Test transaction only; no real funds, tax invoice or fulfilment established.' };
        const pdf = await renderInvoice(evidence);
        await tx.insert(s.commercePayments).values({ id: entity.id, orderId: row.id, amountPaise: row.amountPaise, currency: 'INR', capturedAt: now });
        await tx.insert(s.commerceInvoices).values({ id, orderId: row.id, evidence, pdfBase64: pdf.toString('base64'), sha256: createHash('sha256').update(pdf).digest('hex'), createdAt: now });
        await tx.update(s.commerceOrders).set({ status: 'paid', paidAt: now, updatedAt: now }).where(eq(s.commerceOrders.id, row.id));
        await audit(tx, 'payment.capture_confirmed_test', row.id, 'gateway-webhook'); return finish('capture_confirmed_test', row.id);
      }
      const payment = one(await tx.select().from(s.commercePayments).where(eq(s.commercePayments.id, entity.payment_id)));
      const existing = one(await tx.select().from(s.commerceRefunds).where(eq(s.commerceRefunds.gatewayRefundId, entity.id)));
      if (existing?.status === 'processed') return existing.orderId === row.id && existing.amountPaise === entity.amount ? finish('refund_already_recorded', row.id) : review();
      if (entity.amount + payment.refundedPaise > payment.amountPaise || (existing && (existing.orderId !== row.id || existing.paymentId !== payment.id || existing.amountPaise !== entity.amount))) return review();
      if (existing) await tx.update(s.commerceRefunds).set({ status: 'processed', processedAt: new Date() }).where(eq(s.commerceRefunds.id, existing.id));
      else await tx.insert(s.commerceRefunds).values({ id: randomUUID(), orderId: row.id, paymentId: payment.id, amountPaise: entity.amount,
        note: 'Unmatched test gateway refund received; administrator review required.', gatewayRefundId: entity.id, status: 'processed', createdBy: 'gateway-webhook', createdAt: new Date(), processedAt: new Date() });
      const total = payment.refundedPaise + entity.amount;
      await tx.update(s.commercePayments).set({ refundedPaise: total }).where(eq(s.commercePayments.id, payment.id));
      if (total === payment.amountPaise) await tx.update(s.commerceOrders).set({ status: 'refunded', updatedAt: new Date() }).where(eq(s.commerceOrders.id, row.id));
      await audit(tx, 'refund.confirmed_test', row.id, 'gateway-webhook'); return finish('refund_confirmed_test', row.id);
    });
  }
  async function details(id, userId, admin = false) {
    const row = await order(id, userId, admin);
    const payment = one(await db.select().from(s.commercePayments).where(eq(s.commercePayments.orderId, id))) || null;
    const invoice = one(await db.select({ id: s.commerceInvoices.id, sha256: s.commerceInvoices.sha256, createdAt: s.commerceInvoices.createdAt }).from(s.commerceInvoices).where(eq(s.commerceInvoices.orderId, id))) || null;
    const refunds = await db.select().from(s.commerceRefunds).where(eq(s.commerceRefunds.orderId, id)).orderBy(desc(s.commerceRefunds.createdAt)).limit(100);
    return { order: row, payment, invoice, refunds, mode: 'test', dataQuality: 'Calculated' };
  }
  async function invoice(id, userId, admin = false) {
    await order(id, userId, admin);
    const row = one(await db.select().from(s.commerceInvoices).where(eq(s.commerceInvoices.orderId, id)));
    if (!row) fail(404, 'Invoice unavailable until a captured payment is confirmed.'); return row;
  }
  async function reconcile(id, gatewayOrderId, actorId) {
    enabled(); const previous = await order(id, actorId, true);
    if (!['creating', 'creation_unknown'].includes(previous.status) || (previous.status === 'creating' && Date.now() - previous.updatedAt.getTime() < 60000)) fail(409, 'Only an uncertain/stalled creation can be reconciled.');
    const remote = await fetchRemoteOrder(gatewayOrderId);
    if (!remote || remote.id !== gatewayOrderId || !gatewayId('order').safeParse(remote.id).success || remote.receipt !== previous.id || remote.amount !== previous.amountPaise || remote.currency !== 'INR' || !['created', 'attempted', 'paid'].includes(remote.status)) fail(422, 'Gateway order does not match the stored receipt, amount and currency.');
    return db.transaction(async tx => {
      const current = one(await tx.select().from(s.commerceOrders).where(eq(s.commerceOrders.id, id)).for('update'));
      if (!['creating', 'creation_unknown'].includes(current.status)) fail(409, 'Order already changed.');
      const result = one(await tx.update(s.commerceOrders).set({ gatewayOrderId, status: 'pending', updatedAt: new Date() }).where(eq(s.commerceOrders.id, id)).returning());
      await audit(tx, 'order.reconciled_test', id, actorId); return result;
    });
  }
  async function requestRefund(id, data, actorId) {
    return db.transaction(async tx => {
      const row = one(await tx.select().from(s.commerceOrders).where(eq(s.commerceOrders.id, id)).for('update'));
      if (!row) fail(404, 'Order not found.');
      const old = one(await tx.select().from(s.commerceRefunds).where(eq(s.commerceRefunds.id, data.requestId)));
      if (old) { if (old.orderId !== id || old.amountPaise !== data.amountPaise) fail(409, 'Refund request identifier conflict.'); return old; }
      const payment = one(await tx.select().from(s.commercePayments).where(eq(s.commercePayments.orderId, id)));
      if (!payment || row.status !== 'paid') fail(422, 'A confirmed captured payment is required.');
      const active = await tx.select().from(s.commerceRefunds).where(and(eq(s.commerceRefunds.orderId, id), or(eq(s.commerceRefunds.status, 'requested'), eq(s.commerceRefunds.status, 'submitted')))).limit(101);
      const reserved = active.reduce((sum, item) => sum + item.amountPaise, 0);
      if (active.length > 100 || !Number.isSafeInteger(data.amountPaise) || data.amountPaise <= 0 || data.amountPaise + reserved + payment.refundedPaise > payment.amountPaise) fail(422, 'Refund exceeds the unreserved captured amount.');
      const result = one(await tx.insert(s.commerceRefunds).values({ id: data.requestId, orderId: id, paymentId: payment.id, amountPaise: data.amountPaise, note: data.note, createdBy: actorId, createdAt: new Date() }).returning());
      await audit(tx, 'refund.requested_manual_test', id, actorId); return result;
    });
  }
  async function updateRefund(id, refundId, data, actorId) {
    return db.transaction(async tx => {
      const parent = one(await tx.select().from(s.commerceOrders).where(eq(s.commerceOrders.id, id)).for('update'));
      if (!parent) fail(404, 'Order not found.');
      const refund = one(await tx.select().from(s.commerceRefunds).where(and(eq(s.commerceRefunds.id, refundId), eq(s.commerceRefunds.orderId, id))));
      if (!refund) fail(404, 'Refund request not found.');
      if (!['requested', 'submitted'].includes(refund.status) || !['submitted', 'rejected'].includes(data.status) || (data.status === 'submitted' && !gatewayId('rfnd').safeParse(data.gatewayRefundId).success)) fail(409, 'Only pending manual requests can be submitted or rejected.');
      if (refund.status === 'submitted' && data.status === 'submitted') {
        if (refund.gatewayRefundId !== data.gatewayRefundId) fail(409, 'Submitted references are immutable; review the recorded request.');
        return refund;
      }
      const result = one(await tx.update(s.commerceRefunds).set({ status: data.status, gatewayRefundId: data.status === 'submitted' ? data.gatewayRefundId : refund.gatewayRefundId }).where(eq(s.commerceRefunds.id, refundId)).returning());
      await audit(tx, `refund.${data.status}_manual_test`, id, actorId); return result;
    });
  }
  return { verifyCallback, webhook, details, invoice, reconcile, requestRefund, updateRefund };
}
module.exports = { createLifecycle };
