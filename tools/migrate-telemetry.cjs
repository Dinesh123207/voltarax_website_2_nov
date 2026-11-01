// Offline-export migration. No database is contacted unless --apply is explicit.
const fs = require('node:fs');
const { validSite } = require('../voltarax-web/backend/services/telemetryRepository');
function migrationUpdates(raw, site) {
  validSite(site);
  const history = raw.solar_site?.history || raw.history || raw;
  const updates = {};
  for (const [key, row] of Object.entries(history)) {
    if (!row || typeof row !== 'object') throw new Error('Malformed reading in export');
    if ((row.site_id || 'solar_site') !== site) continue;
    if (!/^[A-Za-z0-9_-]+$/.test(key) || !Number.isFinite(row.ts) || !Number.isInteger(row.ts)) throw new Error('Invalid key or timestamp in export');
    updates[`readings/${site}/${key}`] = { ...row, site_id: site };
  }
  return updates;
}
async function main(args) {
  const value = name => args[args.indexOf(name) + 1];
  if (!args.includes('--input') || !args.includes('--site')) throw new Error('Use --input EXPORT.json --site SITE [--apply]');
  const updates = migrationUpdates(JSON.parse(fs.readFileSync(value('--input'), 'utf8').replace(/^\uFEFF/, '')), value('--site'));
  const entries = Object.entries(updates);
  console.log(JSON.stringify({ readings: entries.length, mode: args.includes('--apply') ? 'apply' : 'dry-run' }));
  if (!args.includes('--apply')) return;
  require('../voltarax-web/backend/node_modules/dotenv').config({ path: 'voltarax-web/backend/.env', quiet: true });
  const { db } = require('../voltarax-web/backend/config/firebase');
  for (let i = 0; i < entries.length; i += 500) await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)));
  console.log('Copied readings. Verify counts and timestamps, upgrade every writer, then explicitly set the site migration marker. Legacy data was retained.');
  process.exit(0);
}
if (require.main === module) main(process.argv.slice(2)).catch(() => { console.error('Migration failed; verify input and local configuration. No secrets are logged.'); process.exitCode = 1; });
module.exports = { migrationUpdates };
