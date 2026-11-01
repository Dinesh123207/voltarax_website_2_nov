async function audit({ actorId, action, targetId, requestId }) {
  const { db } = require('../config/firebase');
  // Only identifiers and enumerated actions; never email addresses, payloads or credentials.
  await db.ref('auditLog').push({ actorId, action, targetId, requestId: requestId || null, at: new Date().toISOString() });
}
async function listAudit(limit = 100) {
  const { db } = require('../config/firebase');
  const snap = await db.ref('auditLog').orderByKey().limitToLast(limit).get();
  return Object.entries(snap.val() || {}).reverse().map(([id, row]) => ({ id, ...row }));
}
module.exports = { audit, listAudit };
