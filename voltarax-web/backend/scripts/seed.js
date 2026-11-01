require('dotenv').config();
const { bootstrapAdmin } = require('../services/bootstrapAdmin');
async function main() {
  const { db } = require('../config/firebase');
  const User = require('../models/User');
  const { audit } = require('../services/auditLog');
  const ref = db.ref('bootstrap/admin');
  await bootstrapAdmin({ env: process.env, users: User, audit, lock: {
    claim: async () => (await ref.transaction(value => value === null ? { state: 'claimed', at: new Date().toISOString() } : undefined)).committed,
    complete: async id => ref.update({ state: 'complete', userId: id }),
  } });
  console.log('Administrator created. Disable bootstrap and verify email at sign-in.');
}
if (require.main === module) main().then(() => process.exit(0)).catch(() => { console.error('Bootstrap failed or already locked. Review configuration and the bootstrap record locally.'); process.exit(1); });
