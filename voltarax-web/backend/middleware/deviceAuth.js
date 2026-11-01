const { createHash, timingSafeEqual } = require('node:crypto');
const { getRegistry } = require('../services/devices');
function createDeviceAuth({ registry = getRegistry, env = process.env } = {}) {
  return async (req, res, next) => {
    try {
      const key = req.get('x-device-key') || req.body?.device_key;
      const id = req.get('x-device-id');
      if (id) {
        req.device = await registry().authenticate(id, key);
        if (req.device) return next();
      } else if (env.ALLOW_LEGACY_DEVICE_KEY === 'true' && env.HARDWARE_API_KEY && typeof key === 'string' && key.length <= 256) {
        const hash = value => createHash('sha256').update(value).digest();
        if (timingSafeEqual(hash(key), hash(env.HARDWARE_API_KEY))) {
          req.device = { device_id: env.SOLAR_DEVICE_ID || 'nodemcu-01', site_id: env.SOLAR_SITE_ID || 'solar_site', legacy: true };
          return next();
        }
      }
      return res.status(401).json({ success: false, message: 'Invalid or disabled device credential.' });
    } catch (error) { next(error); }
  };
}
module.exports = { createDeviceAuth };
