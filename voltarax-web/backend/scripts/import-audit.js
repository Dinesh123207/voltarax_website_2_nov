const { z } = require('zod');
const { randomUUID } = require('node:crypto');
const identifier = z.string().regex(/^[A-Za-z0-9_:-]{1,160}$/);
const record = z.object({ actorId: identifier, action: z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/), targetId: identifier,
  at: z.string().datetime({ offset: true }), requestId: identifier.nullish(), commandId: identifier.nullish(), desired: z.boolean().nullish() });
function parseExport(data) {
  const rows = Object.entries(data.auditLog || data);
  if (rows.length > 50000) throw new Error('Export exceeds 50,000 events; split reviewed exports');
  return rows.map(([legacyId, value]) => {
    identifier.parse(legacyId); const row = record.parse(value);
    return { ...row, legacyId, id: randomUUID(), at: new Date(row.at), requestId: row.requestId || null, commandId: row.commandId || null, desired: typeof row.desired === 'boolean' ? row.desired : null };
  });
}
async function importRows(db, rows) {
  const { auditEvents } = require('../db/schema.ts');
  return db.transaction(async tx => {
    let imported = 0;
    for (const row of rows) imported += (await tx.insert(auditEvents).values(row).onConflictDoNothing({ target: auditEvents.legacyId }).returning({ id: auditEvents.id })).length;
    return imported;
  });
}
async function main() {
  const path = process.argv[2]; if (!path) throw new Error('Provide a reviewed local audit JSON export');
  const fs = require('node:fs'); if (fs.statSync(path).size > 20 * 1024 * 1024) throw new Error('Export exceeds 20 MB');
  const rows = parseExport(JSON.parse(fs.readFileSync(path, 'utf8')));
  if (!process.argv.includes('--apply')) { console.log(`Dry run validated ${rows.length} audit events; no database accessed`); return; }
  if (process.env.ALLOW_AUDIT_IMPORT !== 'true' || !process.env.DATABASE_URL) throw new Error('Explicit ALLOW_AUDIT_IMPORT=true and DATABASE_URL required');
  const c = await require('../db/client').open({ url: process.env.DATABASE_URL });
  try { console.log(`Imported ${await importRows(c.db, rows)} new events; source unchanged`); } finally { await c.close(); }
}
if (require.main === module) { require('dotenv').config(); main().catch(() => { console.error('Audit import refused or failed. Review the local export, setup flags and database access; no secrets are logged.'); process.exitCode = 1; }); }
module.exports = { parseExport, importRows };
