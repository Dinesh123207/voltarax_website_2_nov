const { db } = require('../config/firebase');
const { createTelemetryRepository } = require('../services/telemetryRepository');
module.exports = createTelemetryRepository(db, { defaultSite: process.env.SOLAR_SITE_ID || 'solar_site', primaryDevice: process.env.SOLAR_DEVICE_ID || 'nodemcu-01' });
