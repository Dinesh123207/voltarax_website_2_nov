require('dotenv').config();
async function main() {
  if (process.env.ALLOW_RELATIONAL_MIGRATIONS !== 'true' || !process.env.DATABASE_URL) throw new Error('Set DATABASE_URL and explicit ALLOW_RELATIONAL_MIGRATIONS=true after reviewing migrations and backups');
  const connection = await require('../db/client').open({ url: process.env.DATABASE_URL, migrate: true });
  await connection.close(); console.log('Reviewed relational migrations applied');
}
if (require.main === module) main().catch(() => { console.error('Migration failed; review database access and migrations locally without logging credentials'); process.exitCode = 1; });
