const { db, clone } = require('../services/firebaseModel');

const SolarAnalysis = {
  findOne() {
    return {
      sort() { return this; },
      lean() { return this; },
      then(resolve, reject) { return db.ref('solar_site/analysis').get().then(s => s.exists() ? clone(s.val()) : null).then(resolve, reject); },
      catch(reject) { return db.ref('solar_site/analysis').get().catch(reject); },
    };
  },
  async findOneAndUpdate(filter, update, options = {}) {
    const snap = await db.ref('solar_site/analysis').get();
    const current = snap.val() || {};
    const next = { ...current };
    if (update?.$inc) for (const [k,v] of Object.entries(update.$inc)) next[k] = Number(next[k] || 0) + Number(v);
    for (const [k,v] of Object.entries(update || {})) if (!k.startsWith('$')) next[k] = v;
    await db.ref('solar_site/analysis').set(clone(next));
    await db.ref(`solar_site/analysis_history/${Date.now()}`).set(clone(next));
    return clone(next);
  },
};
module.exports = SolarAnalysis;
