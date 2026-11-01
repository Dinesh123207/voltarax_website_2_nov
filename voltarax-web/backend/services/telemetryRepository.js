// Firebase-specific telemetry access. All reads are paged and site-filtered.
const SITE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
function validSite(site) {
  if (!SITE_PATTERN.test(site)) throw new Error('Invalid site identifier');
  return site;
}
function createTelemetryRepository(db, { defaultSite = 'solar_site', pageSize = 500, maxRows = 50000 } = {}) {
  validSite(defaultSite);
  async function scan(path, site, range, limit, legacy) {
    let cursor = null;
    const result = [];
    const seen = new Set();
    while (true) {
      let q = db.ref(path).orderByChild('ts');
      if (range.$gte != null) q = q.startAt(Number(range.$gte));
      if (cursor) q = q.endBefore(cursor.ts, cursor.key);
      else if (range.$lte != null) q = q.endAt(Number(range.$lte));
      const snap = await q.limitToLast(pageSize).get();
      const batch = [];
      snap.forEach(child => { batch.push({ key: child.key, value: child.val() }); });
      if (!batch.length) break;
      for (const { key, value } of batch.slice().reverse()) {
        if (!value || !Number.isFinite(Number(value.ts))) continue;
        const rowSite = value.site_id || (legacy ? 'solar_site' : site);
        if (rowSite !== site) continue;
        if (range.$gt != null && Number(value.ts) <= Number(range.$gt)) continue;
        if (range.$lt != null && Number(value.ts) >= Number(range.$lt)) continue;
        const identity = `${value.device_id || ''}:${Number(value.ts)}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        result.push({ ...value, _id: key, site_id: rowSite });
        if (result.length >= limit) return result;
      }
      if (batch.length < pageSize) break;
      const first = batch[0];
      if (!Number.isFinite(Number(first.value?.ts))) throw new Error('History contains invalid timestamps; run migration validation');
      cursor = { ts: Number(first.value.ts), key: first.key };
    }
    return result;
  }
  async function history(filter = {}, ops = []) {
    const site = validSite(filter.site_id || defaultSite);
    const range = filter.ts || {};
    const sort = ops.find(op => op.type === 'sort')?.spec || { ts: -1 };
    const requested = ops.find(op => op.type === 'limit')?.n;
    const ascending = Number(sort.ts) > 0;
    // Ascending queries must collect the range before taking its earliest rows.
    const scanLimit = !ascending && requested ? Math.min(requested, maxRows + 1) : maxRows + 1;
    const migrated = (await db.ref(`migrations/site_history/${site}/complete`).get()).val() === true;
    const current = await scan(`readings/${site}`, site, range, scanLimit, false);
    const old = migrated ? [] : await scan('solar_site/history', site, range, scanLimit, true);
    const byReading = new Map();
    for (const row of [...old, ...current]) byReading.set(`${row.device_id || ''}:${Number(row.ts)}`, row);
    const rows = [...byReading.values()].sort((a, b) => Number(a.ts) - Number(b.ts) || a._id.localeCompare(b._id));
    if ((!requested || ascending) && rows.length > maxRows) throw new Error('History exceeds safe row limit; request a smaller period');
    if (!ascending) rows.reverse();
    return requested ? rows.slice(0, requested) : rows;
  }
  return {
    find(filter = {}) {
      const ops = [];
      return {
        sort(spec) { ops.push({ type: 'sort', spec }); return this; },
        limit(n) { if (!Number.isInteger(Number(n)) || Number(n) < 1 || Number(n) > maxRows) throw new Error('Invalid history limit'); ops.push({ type: 'limit', n: Number(n) }); return this; },
        lean() { return this; },
        then(resolve, reject) { return history(filter, ops).then(resolve, reject); },
        catch(reject) { return history(filter, ops).catch(reject); },
      };
    },
    async create(data) {
      const site = validSite(data.site_id || defaultSite);
      const key = db.ref(`readings/${site}`).push().key;
      const value = JSON.parse(JSON.stringify({ ...data, site_id: site }));
      await db.ref().update({ [`readings/${site}/${key}`]: value, [`solar_site/history/${key}`]: value,
        [`sites/${site}/latest`]: value, ...(site === defaultSite ? { 'solar_site/latest': value } : {}) });
      return { ...value, _id: key };
    },
    async latest(site = defaultSite) {
      validSite(site);
      const current = (await db.ref(`sites/${site}/latest`).get()).val();
      const old = (await db.ref('solar_site/latest').get()).val();
      return [current, old && (old.site_id || 'solar_site') === site ? old : null].filter(row => row && (row.site_id || site) === site)
        .sort((a, b) => Number(b.ts) - Number(a.ts))[0] || null;
    },
  };
}
module.exports = { createTelemetryRepository, validSite };
