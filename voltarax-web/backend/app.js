const express = require('express');
const cookieParser = require('cookie-parser');
const { responseQuality } = require('./services/dataQuality');
const { security, errorHandler } = require('./middleware/security');
const { validate } = require('./middleware/validate');
function createApp({ logger, limiters, routes, env = process.env }) {
  const app = express();
  app.use(responseQuality);
  security(app, { env, logger });
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', limiters.api);
  app.use(express.json({ limit: '10kb' }), cookieParser());
  const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/otp', '/api/auth/sensitive', '/api/auth/password'];
  app.use(authPaths, limiters.authIp, limiters.authEmail);
  app.use(['/api/contact', '/api/demo', '/api/subscribe', '/api/chat'], limiters.forms);
  app.use('/api/telemetry/ingest', limiters.ingest);
  app.get('/health', validate(), (req, res) => res.json({ status: 'ok', app: 'Voltarax API', testMode: require('./config/testMode').demoEmulator(env), simulatorAllowed: require('./config/testMode').simulatorAllowed(env) }));
  app.use('/api/auth', routes.auth);
  if (routes.devices) app.use('/api/devices', routes.devices);
  app.use('/api', routes.content);
  if (routes.inspections) {
    app.use('/api/voltvision', routes.inspections);
    app.use('/api', routes.inspections);
  }
  if (routes.reports) {
    app.use('/api/voltvision', routes.reports);
    app.use('/api', routes.reports);
  }
  if (routes.operations) {
    app.use('/api/voltvision', routes.operations);
    app.use('/api', routes.operations);
  }
  app.use('/api/voltvision', routes.dashboard);
  app.use('/api', routes.dashboard);
  app.use('/api/telemetry', routes.telemetry);
  app.use('/api/chat', routes.chat);
  app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
  app.use(errorHandler(logger));
  return app;
}
module.exports = { createApp };
