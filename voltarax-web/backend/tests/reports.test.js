const test = require('node:test');
const assert = require('node:assert/strict');
const { reportPeriod, buildEvidence, renderReport, createReports } = require('../services/reports');
const now = Date.parse('2026-11-01T00:00:00Z'), period = reportPeriod('2026-10-01', '2026-10-01', now);
const rows = Array.from({ length: 289 }, (_, i) => ({ site_id: 'test-site', device_id: 'test-device', ts: period.start + i * 300, power_mw: 1000000, simulated: true }));
const input = { siteId: 'test-site', deviceId: 'test-device', readings: rows, ...period, factor: 0.82, source: 'https://factor.example.test/synthetic-unit-test-reference', verified: true, statistics: { alertsCreated: 2, workOrdersCreated: 1, workOrdersClosed: 1 }, fixture: true, now };
test('reports enforce valid IST periods, coverage, real-data policy and explicit factor provenance', () => {
  assert.equal(new Date(period.start * 1000).toISOString(), '2026-09-30T18:30:00.000Z');
  assert.throws(() => reportPeriod('2026-02-30', '2026-03-01', now)); assert.throws(() => reportPeriod('2026-11-01', '2026-11-01', now));
  assert.throws(() => buildEvidence({ ...input, fixture: false }), /Synthetic/);
  assert.throws(() => buildEvidence({ ...input, verified: false }), /verified/);
  assert.throws(() => buildEvidence({ ...input, source: 'https://name:password@example.test/source' }), /public HTTPS/);
  assert.throws(() => buildEvidence({ ...input, readings: rows.slice(0, 100) }), /coverage/);
  const evidence = buildEvidence(input); assert.ok(Math.abs(evidence.energy.kwh - 24) < 1e-9); assert.ok(Math.abs(evidence.carbon.kg - 19.68) < 1e-9);
  assert.equal(evidence.energy.quality, 'Estimated'); assert.equal(evidence.coverage.percent, 100); assert.equal(evidence.uptime.percent, null);
});
test('synthetic report layout is generated as an explicitly marked two-page test fixture', async () => {
  const pdf = await renderReport(buildEvidence(input)); assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  require('node:fs').writeFileSync(require('node:path').join(__dirname, '../../../docs/test-results/phase04-esg-layout-fixture.pdf'), pdf);
});
test('report snapshots persist in SQL, preserve hash and enforce site isolation', async t => {
  const c = await require('../db/client').open({ pglite: true, migrate: true }); t.after(() => c.close());
  const env = { SOLAR_DEVICE_ID: 'test-device', GRID_EMISSION_FACTOR: '0.82', GRID_EMISSION_FACTOR_SOURCE: input.source, GRID_EMISSION_FACTOR_VERIFIED: 'true' };
  // Generated unit-test rows exercise the non-simulator branch only in this ephemeral test database.
  const service = createReports(c.db, { env, now: () => now, readReadings: async () => rows.map(row => ({ ...row, simulated: false })) });
  const report = await service.generate('test-site', { start: '2026-10-01', end: '2026-10-01' }, 'test-operator');
  const record = await service.get('test-site', report.id);
  assert.equal(report.sha256, require('node:crypto').createHash('sha256').update(Buffer.from(record.pdfBase64, 'base64')).digest('hex'));
  assert.equal((await service.list('other-site')).length, 0); await assert.rejects(service.get('other-site', report.id), error => error.status === 404);
  assert.equal(record.evidence.operations.alertsCreated, 0);
  const disabled = createReports(c.db, { env: { ...env, FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000', FIREBASE_PROJECT_ID: 'demo-voltarax', NODE_ENV: 'test' }, readReadings: async () => rows });
  await assert.rejects(disabled.generate('test-site', { start: '2026-10-01', end: '2026-10-01' }, 'test-operator'), /simulator mode/);
});
