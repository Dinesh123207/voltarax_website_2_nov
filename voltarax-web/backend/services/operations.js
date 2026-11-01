const { randomUUID, createHash } = require('node:crypto');
const { eq, and, ne, desc, count } = require('drizzle-orm');
const s = require('../db/schema.ts');
class OperationError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new OperationError(status, message); };
const one = rows => rows[0];

function createOperations(db, { notificationsEnabled = false } = {}) {
  async function event(tx, siteId, entity, targetId, action, note, actorId, at = new Date()) {
    const id = randomUUID();
    const table = entity === 'alert' ? s.alertEvents : s.workOrderEvents;
    const parent = entity === 'alert' ? { alertId: targetId } : { workOrderId: targetId };
    await tx.insert(table).values({ id, siteId, ...parent, action, note, actorId, at });
    await tx.insert(s.auditEvents).values({ id: randomUUID(), siteId, actorId, action: `${entity}.${action}`, targetId, at });
    await tx.insert(s.notificationOutbox).values({ id, siteId, event: `${entity}.${action}`, targetId, status: notificationsEnabled ? 'pending' : 'disabled', createdAt: at });
  }
  async function createAlertTx(tx, siteId, data, actorId) {
    const now = new Date();
    const row = one(await tx.insert(s.alerts).values({ id: randomUUID(), siteId, sourceKey: data.sourceKey || null,
      title: data.title, message: data.message, severity: data.severity, createdBy: actorId,
      simulated: data.simulated === true, createdAt: now, lastSeenAt: now }).returning());
    await event(tx, siteId, 'alert', row.id, 'created', data.message, actorId, now); return row;
  }
  async function getAlert(siteId, id) {
    const row = one(await db.select().from(s.alerts).where(and(eq(s.alerts.id, id), eq(s.alerts.siteId, siteId))));
    if (!row) fail(404, 'Alert not found.');
    const history = await db.select().from(s.alertEvents).where(and(eq(s.alertEvents.alertId, id), eq(s.alertEvents.siteId, siteId))).orderBy(desc(s.alertEvents.at)).limit(200);
    return { ...row, history: history.reverse(), historyLimit: 200 };
  }
  async function listAlerts(siteId, { resolved, limit = 100 } = {}) {
    const conditions = [eq(s.alerts.siteId, siteId)];
    if (resolved != null) conditions.push(resolved ? eq(s.alerts.status, 'resolved') : ne(s.alerts.status, 'resolved'));
    return db.select().from(s.alerts).where(and(...conditions)).orderBy(desc(s.alerts.createdAt), desc(s.alerts.id)).limit(limit);
  }
  async function transitionAlert(siteId, id, action, note, actorId) {
    return db.transaction(async tx => {
      const where = and(eq(s.alerts.id, id), eq(s.alerts.siteId, siteId));
      const previous = one(await tx.select().from(s.alerts).where(where));
      if (!previous) fail(404, 'Alert not found.');
      if (!['acknowledge', 'resolve'].includes(action)) fail(422, 'Unknown alert transition.');
      if (previous.status === 'resolved' || (action === 'acknowledge' && previous.status !== 'open')) fail(409, 'Alert has already changed. Refresh it.');
      const now = new Date();
      const patch = action === 'acknowledge' ? { status: 'acknowledged', acknowledgedBy: actorId, acknowledgedAt: now } : { status: 'resolved', resolvedBy: actorId, resolvedAt: now };
      const changed = one(await tx.update(s.alerts).set(patch).where(and(where, eq(s.alerts.status, previous.status))).returning());
      if (!changed) fail(409, 'Alert has already changed. Refresh it.');
      await event(tx, siteId, 'alert', id, action, note, actorId, now); return changed;
    });
  }
  async function createWorkOrder(siteId, data, actorId) {
    return db.transaction(async tx => {
      const alert = one(await tx.select().from(s.alerts).where(and(eq(s.alerts.id, data.alertId), eq(s.alerts.siteId, siteId))));
      if (!alert) fail(404, 'Alert not found.');
      const now = new Date();
      const row = one(await tx.insert(s.workOrders).values({ id: randomUUID(), siteId, alertId: alert.id, title: data.title,
        description: data.description, priority: data.priority, assigneeId: data.assigneeId || null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null, createdBy: actorId, createdAt: now, updatedAt: now, simulated: alert.simulated }).returning());
      await event(tx, siteId, 'work-order', row.id, 'created', data.description, actorId, now); return row;
    });
  }
  async function getWorkOrder(siteId, id) {
    const row = one(await db.select().from(s.workOrders).where(and(eq(s.workOrders.id, id), eq(s.workOrders.siteId, siteId))));
    if (!row) fail(404, 'Work order not found.');
    const history = await db.select().from(s.workOrderEvents).where(and(eq(s.workOrderEvents.workOrderId, id), eq(s.workOrderEvents.siteId, siteId))).orderBy(desc(s.workOrderEvents.at)).limit(200);
    return { ...row, history: history.reverse(), historyLimit: 200 };
  }
  async function listWorkOrders(siteId, { status, limit = 100 } = {}) {
    const where = and(eq(s.workOrders.siteId, siteId), status ? eq(s.workOrders.status, status) : undefined);
    return db.select().from(s.workOrders).where(where).orderBy(desc(s.workOrders.createdAt), desc(s.workOrders.id)).limit(limit);
  }
  async function updateWorkOrder(siteId, id, data, actorId) {
    return db.transaction(async tx => {
      const where = and(eq(s.workOrders.id, id), eq(s.workOrders.siteId, siteId), eq(s.workOrders.version, data.version));
      const row = one(await tx.select().from(s.workOrders).where(and(eq(s.workOrders.id, id), eq(s.workOrders.siteId, siteId))));
      if (!row) fail(404, 'Work order not found.');
      if (row.version !== data.version) fail(409, 'Work order changed. Refresh before saving.');
      const allowed = { open: ['open', 'in_progress'], in_progress: ['in_progress', 'closed'], closed: ['closed'] };
      if (data.status && !allowed[row.status]?.includes(data.status)) fail(409, 'Use open → in progress → closed. Closed work orders cannot be reopened.');
      if (row.status === 'closed') fail(409, 'Closed work orders are read-only; comments remain available.');
      const now = new Date(); const patch = { updatedAt: now, version: row.version + 1 };
      for (const key of ['status', 'assigneeId', 'priority']) if (key in data) patch[key] = data[key];
      if ('dueAt' in data) patch.dueAt = data.dueAt ? new Date(data.dueAt) : null;
      if (data.status === 'closed') patch.closedAt = now;
      const changed = one(await tx.update(s.workOrders).set(patch).where(where).returning());
      if (!changed) fail(409, 'Work order changed. Refresh before saving.');
      await event(tx, siteId, 'work-order', id, 'updated', data.note, actorId, now); return changed;
    });
  }
  async function comment(siteId, id, note, actorId) {
    return db.transaction(async tx => {
      const row = one(await tx.select().from(s.workOrders).where(and(eq(s.workOrders.id, id), eq(s.workOrders.siteId, siteId))));
      if (!row) fail(404, 'Work order not found.');
      await event(tx, siteId, 'work-order', id, 'comment', note, actorId); return { success: true };
    });
  }
  async function syncSignals(siteId, readingTs, signals, simulated = false) {
    if (!Number.isSafeInteger(readingTs) || readingTs <= 0 || signals.length > 30) fail(422, 'Invalid rule observation.');
    return db.transaction(async tx => {
      await tx.insert(s.siteState).values({ siteId, lastReadingTs: 0 }).onConflictDoNothing();
      const state = one(await tx.select().from(s.siteState).where(eq(s.siteState.siteId, siteId)).for('update'));
      if (readingTs <= state.lastReadingTs) return;
      const previous = await tx.select().from(s.alertSignals).where(eq(s.alertSignals.siteId, siteId));
      const active = new Set();
      for (const signal of signals) {
        if (active.has(signal.sourceKey)) continue;
        active.add(signal.sourceKey);
        const existing = previous.find(p => p.sourceKey === signal.sourceKey);
        if (!existing || !existing.active) {
          const alert = await createAlertTx(tx, siteId, { ...signal, simulated }, 'system:rules');
          const id = createHash('sha256').update(`${siteId}\0${signal.sourceKey}`).digest('hex');
          await tx.insert(s.alertSignals).values({ id, siteId, sourceKey: signal.sourceKey, alertId: alert.id, active: true })
            .onConflictDoUpdate({ target: s.alertSignals.id, set: { alertId: alert.id, active: true } });
        } else {
          await tx.update(s.alerts).set({ lastSeenAt: new Date() }).where(and(eq(s.alerts.id, existing.alertId), eq(s.alerts.siteId, siteId)));
        }
      }
      for (const old of previous) if (old.active && !active.has(old.sourceKey)) await tx.update(s.alertSignals).set({ active: false }).where(eq(s.alertSignals.id, old.id));
      await tx.update(s.siteState).set({ lastReadingTs: readingTs }).where(eq(s.siteState.siteId, siteId));
    });
  }
  return { createAlert: (siteId, data, actorId) => db.transaction(tx => createAlertTx(tx, siteId, data, actorId)), getAlert, listAlerts,
    transitionAlert, createWorkOrder, getWorkOrder, listWorkOrders, updateWorkOrder, comment, syncSignals,
    countActiveAlerts: async siteId => Number(one(await db.select({ value: count() }).from(s.alerts).where(and(eq(s.alerts.siteId, siteId), ne(s.alerts.status, 'resolved')))).value) };
}
async function getOperations() {
  const connection = require('../db/client').getRelational();
  if (!connection) fail(503, 'Alert and maintenance storage is not configured.');
  return createOperations((await connection).db, { notificationsEnabled: require('./notifications').configured() });
}
module.exports = { createOperations, getOperations, OperationError };
