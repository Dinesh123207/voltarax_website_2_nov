const { eq, and, inArray, asc } = require('drizzle-orm');
const { notificationOutbox } = require('../db/schema.ts');
const { z } = require('zod');
function recipients(env = process.env) {
  return z.array(z.string().trim().email().max(254)).min(1).max(20).parse((env.NOTIFICATION_RECIPIENTS || '').split(','));
}
function connectionOptions(url, worker = false) {
  const parsed = new URL(url);
  if (!['redis:', 'rediss:'].includes(parsed.protocol) || parsed.search || parsed.hash || !/^\/(\d+)?$/.test(parsed.pathname || '/')) throw new Error('Invalid Redis configuration');
  const db = Number(parsed.pathname.slice(1) || 0); if (db > 15) throw new Error('Invalid Redis database');
  return { host: parsed.hostname, port: Number(parsed.port || 6379), db, username: decodeURIComponent(parsed.username) || undefined,
    password: decodeURIComponent(parsed.password) || undefined, ...(parsed.protocol === 'rediss:' ? { tls: { servername: parsed.hostname } } : {}),
    connectTimeout: 5000, maxRetriesPerRequest: worker ? null : 1, enableOfflineQueue: worker };
}
function configured(env = process.env) {
  if (env.NOTIFICATIONS_ENABLED !== 'true' || !env.REDIS_URL || !require('./mailer').mailConfigured(env)) return false;
  try { recipients(env); connectionOptions(env.REDIS_URL); return true; } catch { return false; }
}
async function notificationMessage(row) {
  const React = require('react'), { render, toPlainText } = require('@react-email/render');
  const html = await render(React.createElement('html', { lang: 'en' }, React.createElement('body', { style: { fontFamily: 'Arial, sans-serif', padding: '24px' } },
    React.createElement('h1', null, 'Voltarax operations update'), React.createElement('p', null, `Event: ${row.event}`),
    React.createElement('p', null, `Record: ${row.targetId}`), React.createElement('p', null, 'Sign in to the dashboard to review the record and its history. This notification is not proof that equipment is repaired.'))));
  return { subject: 'Voltarax operations update', html, text: toPlainText(html) };
}
function createProcessor({ db, send }) {
  return async job => {
    const row = (await db.select().from(notificationOutbox).where(eq(notificationOutbox.id, job.data.outboxId)))[0];
    if (!row || !['pending', 'queued'].includes(row.status)) return { skipped: true };
    await send(row, await notificationMessage(row));
    await db.update(notificationOutbox).set({ status: 'sent', sentAt: new Date(), attempts: job.attemptsMade + 1 })
      .where(and(eq(notificationOutbox.id, row.id), inArray(notificationOutbox.status, ['pending', 'queued'])));
    return { sent: true };
  };
}
async function recordFailure(db, job) {
  if (!job) return;
  const terminal = job.attemptsMade >= (job.opts.attempts || 1);
  await db.update(notificationOutbox).set({ attempts: job.attemptsMade, status: terminal ? 'dead_letter' : 'queued' })
    .where(and(eq(notificationOutbox.id, job.data.outboxId), inArray(notificationOutbox.status, ['pending', 'queued'])));
}
async function dispatchOutbox(db, queue) {
  const rows = await db.select().from(notificationOutbox).where(inArray(notificationOutbox.status, ['pending', 'queued'])).orderBy(asc(notificationOutbox.createdAt)).limit(100);
  for (const row of rows) {
    const previous = await queue.getJob(row.id);
    if (previous && await previous.getState() === 'failed') { await recordFailure(db, previous); continue; }
    await queue.add('operations-event', { outboxId: row.id }, { jobId: row.id, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: { age: 604800, count: 1000 }, removeOnFail: false });
    await db.update(notificationOutbox).set({ status: 'queued' }).where(and(eq(notificationOutbox.id, row.id), eq(notificationOutbox.status, 'pending')));
  }
}
async function startNotifications(logger) {
  if (!configured() || !require('../db/client').configured()) { logger.info({ event: 'notifications-disabled' }, 'Operational notifications disabled'); return async () => {}; }
  const { db } = await require('../db/client').getRelational();
  const { Queue, Worker } = require('bullmq');
  const queue = new Queue('voltarax-notifications', { connection: connectionOptions(process.env.REDIS_URL) });
  const processJob = createProcessor({ db, send: async (row, message) => require('./mailer').sendMessage({ to: recipients().join(','), message, messageId: `<voltarax-${row.id}@notifications.invalid>` }) });
  const worker = new Worker('voltarax-notifications', processJob, { connection: connectionOptions(process.env.REDIS_URL, true), concurrency: 2 });
  const logFailure = () => logger.error({ event: 'notification-queue-unavailable' }, 'Notification queue unavailable');
  queue.on('error', logFailure); worker.on('error', logFailure);
  worker.on('failed', job => { recordFailure(db, job).catch(logFailure); });
  let busy = false, stopped = false;
  const dispatch = async () => { if (busy || stopped) return; busy = true; try { await dispatchOutbox(db, queue); } catch { logFailure(); } finally { busy = false; } };
  dispatch(); const timer = setInterval(dispatch, 10000); timer.unref();
  return async () => { stopped = true; clearInterval(timer); await worker.close(); await queue.close(); };
}
module.exports = { configured, recipients, connectionOptions, notificationMessage, createProcessor, recordFailure, dispatchOutbox, startNotifications };
