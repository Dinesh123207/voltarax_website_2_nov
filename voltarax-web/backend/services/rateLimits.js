const { createHash } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
function createLimiters({ client, limits = {} } = {}) {
  function limiter(scope, max, extra = {}) {
    return rateLimit({ windowMs: 15 * 60000, limit: limits[scope] || max, standardHeaders: 'draft-7', legacyHeaders: false,
      passOnStoreError: false, message: { success: false, message: 'Too many requests. Try again later.' },
      ...(client ? { store: new RedisStore({ prefix: `voltarax:rate:${scope}:`, sendCommand: (...args) => client.sendCommand(args) }) } : {}), ...extra });
  }
  return {
    api: limiter('api', 1000), authIp: limiter('auth-ip', 30),
    authEmail: limiter('auth-email', 10, { skip: req => !req.user?.email && typeof req.body?.email !== 'string', keyGenerator: req => createHash('sha256').update(String(req.user?.email || req.body?.email).trim().toLowerCase().slice(0, 254)).digest('hex') }),
    forms: limiter('forms', 10), ingest: limiter('ingest', 1200),
  };
}
async function connectRateStore(env, logger) {
  if (!env.REDIS_URL) return null;
  const { createClient } = require('redis');
  const client = createClient({ url: env.REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: false }, disableOfflineQueue: true });
  client.on('error', () => logger.error({ event: 'redis-unavailable' }, 'Rate store unavailable'));
  await client.connect();
  return client;
}
module.exports = { createLimiters, connectRateStore };
