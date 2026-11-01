async function audit({ actorId, action, targetId, requestId }) {
  const { db } = require('../config/firebase');
  // Only identifiers and enumerated actions; never email addresses, payloads or credentials.
  await db.ref('auditLog').push({ actorId, action, targetId, requestId: requestId || null, at: new Date().toISOString() });
}
module.exports = { audit };
