const { randomUUID } = require('node:crypto');
const { eq, and, desc } = require('drizzle-orm');
const s = require('../db/schema.ts');
const { paymentPolicy, gateway } = require('./paymentPolicy');
class CommerceError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new CommerceError(status, message); };
const one = rows => rows[0];
const price = value => value === null || (Number.isSafeInteger(value) && value >= 100 && value <= 1000000000);
function createCommerce(db, { env = process.env, createRemoteOrder = input => gateway(env).orders.create(input), fetchRemoteOrder = id => gateway(env).orders.fetch(id), renderInvoice = require('./invoices').renderInvoice } = {}) {
  const policy = () => paymentPolicy(env);
  const audit = async (tx, action, targetId, actorId) => tx.insert(s.auditEvents).values({ id: randomUUID(), actorId, action, targetId, at: new Date() });
  async function plans(admin = false) {
    return db.select().from(s.commercePlans).where(admin ? undefined : eq(s.commercePlans.active, true)).orderBy(desc(s.commercePlans.createdAt)).limit(200);
  }
  async function savePlan(data, actorId, id = null) {
    if (!price(data.pricePaise) || typeof data.active !== 'boolean' || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 100 || typeof data.description !== 'string' || data.description.length > 2000) fail(422, 'Use a name, description and unset or integer-paise price.');
    return db.transaction(async tx => {
      const now = new Date(), values = { name: data.name.trim(), description: data.description.trim(), pricePaise: data.pricePaise, active: data.active, updatedAt: now };
      let row;
      if (id) {
        const old = one(await tx.select().from(s.commercePlans).where(eq(s.commercePlans.id, id)).for('update'));
        if (!old) fail(404, 'Plan not found.');
        if (old.version !== data.version) fail(409, 'Plan changed. Reload before saving.');
        row = one(await tx.update(s.commercePlans).set({ ...values, version: old.version + 1 }).where(eq(s.commercePlans.id, id)).returning());
      } else row = one(await tx.insert(s.commercePlans).values({ ...values, id: randomUUID(), createdAt: now }).returning());
      await audit(tx, id ? 'plan.updated' : 'plan.created', row.id, actorId); return row;
    });
  }
  async function order(id, userId, admin = false) {
    const row = one(await db.select().from(s.commerceOrders).where(and(eq(s.commerceOrders.id, id), admin ? undefined : eq(s.commerceOrders.userId, userId))));
    if (!row) fail(404, 'Order not found.');
    return row;
  }
  async function orders(userId, admin = false) {
    return db.select().from(s.commerceOrders).where(admin ? undefined : eq(s.commerceOrders.userId, userId)).orderBy(desc(s.commerceOrders.createdAt), desc(s.commerceOrders.id)).limit(100);
  }
  async function createOrder(data, userId) {
    if (!policy().enabled) fail(503, policy().reason);
    const reserved = await db.transaction(async tx => {
      const previous = one(await tx.select().from(s.commerceOrders).where(and(eq(s.commerceOrders.userId, userId), eq(s.commerceOrders.requestKey, data.requestKey))));
      if (previous) {
        if (previous.planId !== data.planId || previous.planSnapshot.version !== data.planVersion) fail(409, 'Request key belongs to a different plan selection.');
        return { row: previous, created: false };
      }
      const plan = one(await tx.select().from(s.commercePlans).where(eq(s.commercePlans.id, data.planId)).for('update'));
      if (!plan || !plan.active) fail(422, 'Plan is unavailable.');
      if (plan.pricePaise == null) fail(422, 'Price is unset; checkout is blocked.');
      if (plan.version !== data.planVersion) fail(409, 'Plan changed. Review the current price.');
      const now = new Date();
      const row = one(await tx.insert(s.commerceOrders).values({ id: randomUUID(), userId, planId: plan.id, requestKey: data.requestKey,
        planSnapshot: { name: plan.name, description: plan.description, version: plan.version, pricePaise: plan.pricePaise, billing: 'one_time' },
        amountPaise: plan.pricePaise, createdAt: now, updatedAt: now }).onConflictDoNothing({ target: [s.commerceOrders.userId, s.commerceOrders.requestKey] }).returning());
      if (!row) {
        const existing = one(await tx.select().from(s.commerceOrders).where(and(eq(s.commerceOrders.userId, userId), eq(s.commerceOrders.requestKey, data.requestKey))));
        if (!existing || existing.planId !== data.planId || existing.planSnapshot.version !== data.planVersion) fail(409, 'Request key collision. Reload orders.');
        return { row: existing, created: false };
      }
      await audit(tx, 'order.reserved', row.id, userId); return { row, created: true };
    });
    if (!reserved.created) return reserved.row; // Never repeat an ambiguous gateway creation.
    try {
      const response = await createRemoteOrder({ amount: reserved.row.amountPaise, currency: 'INR', receipt: reserved.row.id, partial_payment: false, notes: { local_order_id: reserved.row.id } });
      if (!response || !/^order_[A-Za-z0-9]{1,64}$/.test(response.id) || response.amount !== reserved.row.amountPaise || response.currency !== 'INR' || response.receipt !== reserved.row.id || response.status !== 'created') throw Error('Invalid gateway order');
      return await db.transaction(async tx => {
        const row = one(await tx.update(s.commerceOrders).set({ gatewayOrderId: response.id, status: 'pending', updatedAt: new Date() }).where(and(eq(s.commerceOrders.id, reserved.row.id), eq(s.commerceOrders.status, 'creating'))).returning());
        if (!row) fail(409, 'Order requires reconciliation.');
        await audit(tx, 'order.gateway_created', row.id, userId); return row;
      });
    } catch {
      await db.transaction(async tx => {
        await tx.update(s.commerceOrders).set({ status: 'creation_unknown', updatedAt: new Date() }).where(and(eq(s.commerceOrders.id, reserved.row.id), eq(s.commerceOrders.status, 'creating')));
        await audit(tx, 'order.creation_unknown', reserved.row.id, userId);
      });
      fail(503, 'Gateway order creation is uncertain. Check your orders; do not retry with a new request key. An administrator must reconcile the receipt.');
    }
  }
  return { policy, plans, savePlan, createOrder, order, orders,
    ...require('./paymentLifecycle').createLifecycle({ db, env, policy, audit, order, fail, fetchRemoteOrder, renderInvoice }) };
}
let instance;
async function getCommerce() {
  if (!require('../db/client').configured()) fail(503, 'Commerce storage is not configured.');
  if (!instance) instance = require('../db/client').getRelational().then(({ db }) => createCommerce(db));
  return instance;
}
module.exports = { createCommerce, getCommerce, CommerceError };
