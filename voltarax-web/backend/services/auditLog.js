async function audit({ actorId, action, targetId, requestId, commandId, desired }) {
  const connection = require('../db/client').getRelational();
  if (connection) {
    await (await connection).db.insert(require('../db/schema.ts').auditEvents).values({ id: require('node:crypto').randomUUID(), actorId, action, targetId,
      requestId: requestId || null, commandId: commandId || null, desired: typeof desired === 'boolean' ? desired : null, at: new Date() });
    return;
  }
  const { db } = require('../config/firebase');
  // Identifiers, enumerated actions and safe command intent; never raw payloads or credentials.
  await db.ref('auditLog').push({ actorId, action, targetId, requestId: requestId || null, commandId: commandId || null, desired: typeof desired === 'boolean' ? desired : null, at: new Date().toISOString() });
}
async function listAudit(limit = 100) {
  const connection = require('../db/client').getRelational();
  if (connection) {
    const { desc } = require('drizzle-orm'); const { auditEvents } = require('../db/schema.ts');
    return (await connection).db.select().from(auditEvents).orderBy(desc(auditEvents.at), desc(auditEvents.id)).limit(limit);
  }
  const { db } = require('../config/firebase');
  const snap = await db.ref('auditLog').orderByKey().limitToLast(limit).get();
  return Object.entries(snap.val() || {}).reverse().map(([id, row]) => ({ id, ...row }));
}
module.exports = { audit, listAudit };
