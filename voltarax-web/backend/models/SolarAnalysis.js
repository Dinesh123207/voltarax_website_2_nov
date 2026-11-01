const { db, clone } = require('../services/firebaseModel');
const { validSite } = require('../services/telemetryRepository');
const DEFAULT_SITE = process.env.SOLAR_SITE_ID || 'solar_site';

async function read(site) {
  validSite(site);
  const current = (await db.ref(`sites/${site}/analysis`).get()).val();
  const old = (await db.ref('solar_site/analysis').get()).val();
  return clone([current, old].filter(row => row && (row.site_id || 'solar_site') === site)
    .sort((a, b) => Number(b.ts) - Number(a.ts))[0] || null);
}

const SolarAnalysis = {
  findOne(filter = {}) {
    const site = filter.site_id || DEFAULT_SITE;
    return {
      sort() { return this; },
      lean() { return this; },
      then(resolve, reject) { return read(site).then(resolve, reject); },
      catch(reject) { return read(site).catch(reject); },
    };
  },
  async findOneAndUpdate(filter, update, options = {}) {
    const site = validSite(filter.site_id || DEFAULT_SITE);
    const current = (await read(site)) || {};
    const next = { ...current, site_id: site };
    if (update?.$inc) for (const [k,v] of Object.entries(update.$inc)) next[k] = Number(next[k] || 0) + Number(v);
    for (const [k,v] of Object.entries(update || {})) if (!k.startsWith('$')) next[k] = v;
    const value = clone(next); const stamp = Date.now();
    await db.ref().update({ [`sites/${site}/analysis`]: value, [`sites/${site}/analysis_history/${stamp}`]: value,
      ...(site === DEFAULT_SITE ? { 'solar_site/analysis': value, [`solar_site/analysis_history/${stamp}`]: value } : {}) });
    return clone(next);
  },
};
module.exports = SolarAnalysis;
