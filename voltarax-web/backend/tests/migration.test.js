const test = require('node:test');
const assert = require('node:assert/strict');
const { migrationUpdates } = require('../../../tools/migrate-telemetry.cjs');
test('offline migration is site scoped, preserves keys and is repeatable', () => {
  const raw = { history: { a: { ts: 1, site_id: 'a' }, b: { ts: 2, site_id: 'b' } } };
  assert.deepEqual(migrationUpdates(raw, 'a'), { 'readings/a/a': raw.history.a });
  assert.deepEqual(migrationUpdates(raw, 'a'), migrationUpdates(raw, 'a'));
  assert.throws(() => migrationUpdates({ x: { ts: 'bad', site_id: 'a' } }, 'a'), /Invalid/);
});
