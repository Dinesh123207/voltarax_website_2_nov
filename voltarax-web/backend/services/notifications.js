function configured(env = process.env) {
  return env.NOTIFICATIONS_ENABLED === 'true' && !!env.REDIS_URL && !!env.NOTIFICATION_RECIPIENTS && require('./mailer').mailConfigured(env);
}
module.exports = { configured };
