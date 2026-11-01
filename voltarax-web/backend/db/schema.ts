import { pgTable, text, timestamp, integer, bigint, boolean, jsonb, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const date = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
export const alerts = pgTable('alerts', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), sourceKey: text('source_key'),
  title: text('title').notNull(), message: text('message').notNull(), severity: text('severity').notNull(),
  status: text('status').notNull().default('open'), createdBy: text('created_by').notNull(), createdAt: date('created_at').notNull(),
  lastSeenAt: date('last_seen_at').notNull(), acknowledgedBy: text('acknowledged_by'), acknowledgedAt: date('acknowledged_at'),
  resolvedBy: text('resolved_by'), resolvedAt: date('resolved_at'), simulated: boolean('simulated').notNull().default(false),
}, t => [index('alerts_site_created').on(t.siteId, t.createdAt),
  check('alerts_status', sql`${t.status} in ('open','acknowledged','resolved')`),
  check('alerts_severity', sql`${t.severity} in ('info','warning','critical')`)]);

export const alertEvents = pgTable('alert_events', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), alertId: text('alert_id').notNull().references(() => alerts.id),
  action: text('action').notNull(), actorId: text('actor_id').notNull(), note: text('note').notNull(), at: date('at').notNull(),
}, t => [index('alert_events_parent').on(t.siteId, t.alertId, t.at)]);

export const siteState = pgTable('site_operation_state', {
  siteId: text('site_id').primaryKey(), lastReadingTs: bigint('last_reading_ts', { mode: 'number' }).notNull().default(0),
});
export const alertSignals = pgTable('alert_signals', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), sourceKey: text('source_key').notNull(),
  active: boolean('active').notNull(), alertId: text('alert_id').notNull().references(() => alerts.id),
}, t => [uniqueIndex('alert_signal_site_key').on(t.siteId, t.sourceKey)]);

export const workOrders = pgTable('work_orders', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), alertId: text('alert_id').notNull().references(() => alerts.id),
  title: text('title').notNull(), description: text('description').notNull(), priority: text('priority').notNull(),
  status: text('status').notNull().default('open'), assigneeId: text('assignee_id'), dueAt: date('due_at'),
  createdBy: text('created_by').notNull(), createdAt: date('created_at').notNull(), updatedAt: date('updated_at').notNull(),
  closedAt: date('closed_at'), simulated: boolean('simulated').notNull().default(false), version: integer('version').notNull().default(1),
}, t => [index('work_orders_site_created').on(t.siteId, t.createdAt),
  check('work_orders_status', sql`${t.status} in ('open','in_progress','closed')`),
  check('work_orders_priority', sql`${t.priority} in ('low','medium','high','critical')`)]);
export const workOrderEvents = pgTable('work_order_events', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), workOrderId: text('work_order_id').notNull().references(() => workOrders.id),
  action: text('action').notNull(), actorId: text('actor_id').notNull(), note: text('note').notNull(), at: date('at').notNull(),
}, t => [index('work_order_events_parent').on(t.siteId, t.workOrderId, t.at)]);

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(), siteId: text('site_id'), actorId: text('actor_id').notNull(), action: text('action').notNull(),
  targetId: text('target_id').notNull(), requestId: text('request_id'), commandId: text('command_id'), desired: boolean('desired'),
  at: date('at').notNull(), legacyId: text('legacy_id').unique(),
}, t => [index('audit_events_at').on(t.at)]);

export const notificationOutbox = pgTable('notification_outbox', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), event: text('event').notNull(), targetId: text('target_id').notNull(),
  status: text('status').notNull().default('pending'), attempts: integer('attempts').notNull().default(0),
  createdAt: date('created_at').notNull(), sentAt: date('sent_at'),
}, t => [index('notification_outbox_pending').on(t.status, t.createdAt),
  check('notification_status', sql`${t.status} in ('pending','queued','sent','dead_letter','disabled')`)]);

export const reports = pgTable('esg_reports', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), startAt: date('start_at').notNull(), endAt: date('end_at').notNull(),
  createdBy: text('created_by').notNull(), createdAt: date('created_at').notNull(),
  evidence: jsonb('evidence').notNull(), sha256: text('sha256').notNull(), pdfBase64: text('pdf_base64').notNull(),
}, t => [index('esg_reports_site_created').on(t.siteId, t.createdAt)]);

export const inspectionPhotos = pgTable('inspection_photos', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), source: text('source').notNull(),
  mime: text('mime').notNull(), width: integer('width').notNull(), height: integer('height').notNull(),
  sha256: text('sha256').notNull(), dataBase64: text('data_base64').notNull(),
  savedAt: date('saved_at').notNull(), savedBy: text('saved_by').notNull(),
}, t => [index('inspection_photos_site_saved').on(t.siteId, t.savedAt),
  check('photo_source', sql`${t.source} in ('camera','upload')`), check('photo_mime', sql`${t.mime} in ('image/jpeg','image/png')`)]);
export const inspections = pgTable('inspections', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull(), kind: text('kind').notNull(), area: text('area').notNull(), areaKey: text('area_key').notNull(),
  condition: text('condition').notNull(), notes: text('notes').notNull(), observedAt: date('observed_at').notNull(),
  photoId: text('photo_id').notNull().references(() => inspectionPhotos.id),
  createdAt: date('created_at').notNull(), createdBy: text('created_by').notNull(),
}, t => [index('inspections_site_observed').on(t.siteId, t.kind, t.observedAt),
  index('inspections_latest_area').on(t.siteId, t.kind, t.areaKey, t.observedAt.desc(), t.createdAt.desc(), t.id.desc()),
  check('inspection_kind', sql`${t.kind} in ('camera','coating')`),
  check('inspection_condition', sql`${t.condition} in ('clean','dusty','cracked','peeling','other','unknown')`)]);

// Commerce is one-time and test-only. No prices, customers or plans are seeded.
export const commercePlans = pgTable('commerce_plans', {
  id: text('id').primaryKey(), name: text('name').notNull(), description: text('description').notNull(),
  pricePaise: integer('price_paise'), active: boolean('active').notNull().default(false),
  version: integer('version').notNull().default(1), createdAt: date('created_at').notNull(), updatedAt: date('updated_at').notNull(),
}, t => [check('plan_price', sql`${t.pricePaise} is null or ${t.pricePaise} between 100 and 1000000000`)]);
export const commerceOrders = pgTable('commerce_orders', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), planId: text('plan_id').notNull().references(() => commercePlans.id),
  requestKey: text('request_key').notNull(), planSnapshot: jsonb('plan_snapshot').notNull(), amountPaise: integer('amount_paise').notNull(),
  currency: text('currency').notNull().default('INR'), status: text('status').notNull().default('creating'),
  gatewayOrderId: text('gateway_order_id').unique(), callbackPaymentId: text('callback_payment_id'), callbackVerifiedAt: date('callback_verified_at'),
  createdAt: date('created_at').notNull(), updatedAt: date('updated_at').notNull(), paidAt: date('paid_at'),
}, t => [uniqueIndex('order_user_request').on(t.userId, t.requestKey), index('order_user_created').on(t.userId, t.createdAt),
  check('order_amount', sql`${t.amountPaise} between 100 and 1000000000`), check('order_currency', sql`${t.currency} = 'INR'`),
  check('order_status', sql`${t.status} in ('creating','creation_unknown','pending','paid','refunded','review_required')`)]);
export const commercePayments = pgTable('commerce_payments', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().unique().references(() => commerceOrders.id),
  amountPaise: integer('amount_paise').notNull(), currency: text('currency').notNull(), capturedAt: date('captured_at').notNull(),
  refundedPaise: integer('refunded_paise').notNull().default(0),
}, t => [check('payment_amount', sql`${t.amountPaise} between 100 and 1000000000 and ${t.refundedPaise} between 0 and ${t.amountPaise}`)]);
export const commerceEvents = pgTable('commerce_events', {
  digest: text('digest').primaryKey(), eventId: text('event_id').unique(), event: text('event').notNull(),
  orderId: text('order_id'), result: text('result').notNull(), receivedAt: date('received_at').notNull(),
});
export const commerceInvoices = pgTable('commerce_invoices', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().unique().references(() => commerceOrders.id),
  evidence: jsonb('evidence').notNull(), pdfBase64: text('pdf_base64').notNull(), sha256: text('sha256').notNull(), createdAt: date('created_at').notNull(),
});
export const commerceRefunds = pgTable('commerce_refunds', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => commerceOrders.id), paymentId: text('payment_id').notNull().references(() => commercePayments.id),
  amountPaise: integer('amount_paise').notNull(), note: text('note').notNull(), status: text('status').notNull().default('requested'),
  gatewayRefundId: text('gateway_refund_id').unique(), createdBy: text('created_by').notNull(), createdAt: date('created_at').notNull(), processedAt: date('processed_at'),
}, t => [index('refund_order').on(t.orderId), check('refund_amount', sql`${t.amountPaise} between 1 and 1000000000`),
  check('refund_status', sql`${t.status} in ('requested','submitted','processed','rejected')`)]);
