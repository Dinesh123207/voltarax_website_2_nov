const path = require('node:path');
const migrationsFolder = path.join(__dirname, 'migrations');
let instance;
function configured(env = process.env) { return !!env.DATABASE_URL; }
async function open({ url, pglite = false, dataDir, migrate = false } = {}) {
  let db, client, migrator;
  const schema = require('./schema.ts'); // Node 24 native TypeScript; no transpiler in production.
  if (pglite) {
    const { PGlite } = require('@electric-sql/pglite');
    client = new PGlite(dataDir);
    db = require('drizzle-orm/pglite').drizzle(client, { schema });
    migrator = require('drizzle-orm/pglite/migrator').migrate;
  } else {
    if (!url) throw new Error('Relational storage is not configured');
    client = new (require('pg').Pool)({ connectionString: url, max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    db = require('drizzle-orm/node-postgres').drizzle(client, { schema });
    migrator = require('drizzle-orm/node-postgres/migrator').migrate;
  }
  try { if (migrate) await migrator(db, { migrationsFolder }); }
  catch (error) { await (pglite ? client.close() : client.end()); throw error; }
  return { db, client, close: () => pglite ? client.close() : client.end() };
}
function getRelational() {
  if (!configured()) return null;
  // Schema changes are explicitly applied by an operator, never during API startup.
  if (!instance) instance = open({ url: process.env.DATABASE_URL });
  return instance;
}
async function closeRelational() { if (instance) { const current = instance; instance = undefined; await (await current).close(); } }
module.exports = { open, configured, getRelational, closeRelational };
