const pino = require('pino');
function createLogger(destination) {
  return pino({ level: process.env.LOG_LEVEL || 'info', base: undefined,
    redact: { paths: ['password', 'code', 'token', 'key', 'keyHash', 'secret', 'email', 'authorization', 'cookie', 'req.headers', 'req.body', '*.password', '*.code', '*.token', '*.key', '*.keyHash', '*.secret', '*.email'], remove: true } }, destination);
}
const logger = createLogger();
module.exports = { logger, createLogger };
