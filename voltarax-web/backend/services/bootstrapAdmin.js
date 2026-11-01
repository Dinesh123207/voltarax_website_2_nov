const { z, email } = require('../middleware/validate');
async function bootstrapAdmin({ env, users, lock, audit }) {
  if (env.BOOTSTRAP_ADMIN_ENABLED !== 'true') throw new Error('One-time bootstrap is disabled');
  const input = z.object({ email, password: z.string().min(16).max(72).refine(v => Buffer.byteLength(v) <= 72), name: z.string().trim().min(2).max(100) }).parse({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME });
  if ((await users.find({ role: 'admin' }).limit(1).lean()).length) throw new Error('Administrator already exists');
  if (!(await lock.claim())) throw new Error('Bootstrap has already been claimed');
  // A failed claim remains locked: an operator must investigate before retrying.
  const user = await users.create({ ...input, role: 'admin' });
  await audit({ actorId: 'bootstrap', targetId: user._id, action: 'admin-bootstrap' });
  await lock.complete(user._id);
  return user._id;
}
module.exports = { bootstrapAdmin };
