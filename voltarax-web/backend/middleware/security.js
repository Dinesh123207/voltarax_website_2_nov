const { randomUUID } = require('node:crypto');
const helmet = require('helmet');
const cors = require('cors');
function origins(env = process.env) {
  const values = (env.CORS_ORIGINS || env.FRONTEND_URL || (env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')).split(',').filter(Boolean).map(s => s.trim());
  for (const value of values) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) throw new Error('CORS entries must be exact origins');
  }
  if (!values.length) throw new Error('Configure allowed frontend origins');
  return values;
}
function security(app, { env = process.env, logger }) {
  const allowed = origins(env);
  const hops = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5) throw new Error('Invalid proxy configuration');
  app.disable('x-powered-by'); app.set('trust proxy', hops);
  app.use((req, res, next) => {
    req.id = randomUUID(); res.set('X-Request-ID', req.id);
    const start = Date.now();
    res.once('finish', () => logger.info({ requestId: req.id, method: req.method, route: req.route?.path || '/unmatched', status: res.statusCode, durationMs: Date.now() - start }, 'request'));
    next();
  });
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], baseUri: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' }, frameguard: { action: 'deny' } }));
  app.use((req, res, next) => {
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const origin = req.get('origin');
    if (origin && !allowed.includes(origin)) return res.status(403).json({ success: false, message: 'Origin not allowed.' });
    next();
  });
  app.use(cors({ origin: allowed, credentials: true, allowedHeaders: ['Content-Type', 'Authorization', 'X-Voltarax-Request', 'X-Device-Key', 'X-Device-ID'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'] }));
}
function errorHandler(logger) {
  return (err, req, res, next) => {
    logger.error({ requestId: req.id, event: 'request-failed' }, 'Request failed');
    const status = err.type === 'entity.too.large' ? 413 : err.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ success: false, message: status === 413 ? 'Request too large.' : status === 400 ? 'Invalid JSON.' : 'Server error.', requestId: req.id });
  };
}
module.exports = { security, errorHandler, origins };
