require('dotenv').config();
const { createApp } = require('./app');
const { logger } = require('./services/logger');
const { createLimiters, connectRateStore } = require('./services/rateLimits');
async function main() {
  if (!require('./services/session').validSecret(process.env.JWT_SECRET)) throw new Error('Configure a strong session secret');
  const client = await connectRateStore(process.env, logger);
  const limiters = createLimiters({ client });
  const routes = { devices: require('./routes/devices').createDeviceRouter(), auth: require('./routes/auth').createAuthRouter({ emailLimiter: limiters.authEmail }), content: require('./routes/content'), dashboard: require('./routes/voltvision'), telemetry: require('./routes/telemetry'), chat: require('./routes/chat') };
  routes.operations = require('./routes/operations').createOperationsRouter();
  const app = createApp({ logger, limiters, routes });
  await require('./config/db')();
  require('./services/telemetryWatcher').startTelemetryWatcher();
  const stopRelay = require('./services/relay').startRelayReconciler(logger);
  const stopAlerts = require('./services/alertCollector').startAlertCollector(logger);
  const server = app.listen(Number(process.env.PORT || 5000), () => logger.info({ event: 'listening' }, 'API started'));
  const stop = () => { stopRelay(); stopAlerts(); server.close(async () => { if (client) await client.quit(); await require('./db/client').closeRelational(); process.exit(0); }); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
if (require.main === module) main().catch(() => { logger.fatal({ event: 'startup-failed' }, 'API startup failed. Review local configuration.'); process.exit(1); });
