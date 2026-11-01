const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('../db/client');
test('relational lifecycle is site-scoped, atomic, persistent and safe against concurrent edits', async t => {
  const c = await open({ pglite: true, migrate: true }); t.after(() => c.close());
  const service = require('../services/operations').createOperations(c.db);
  const input = { title: 'Real operator report', message: 'Inspection required', severity: 'warning' };
  const alert = await service.createAlert('site-a', input, 'operator-a');
  assert.equal(alert.status, 'open');
  assert.equal((await service.listAlerts('site-b')).length, 0);
  await assert.rejects(service.transitionAlert('site-b', alert.id, 'resolve', 'checked', 'operator-b'), e => e.status === 404);
  await service.transitionAlert('site-a', alert.id, 'acknowledge', 'Review started', 'operator-a');
  const order = await service.createWorkOrder('site-a', { alertId: alert.id, title: 'Inspect wiring', description: 'Check actual wiring', priority: 'high' }, 'operator-a');
  assert.equal(order.status, 'open');
  await assert.rejects(service.updateWorkOrder('site-a', order.id, { status: 'closed', version: 1, note: 'Skipped work' }, 'operator-a'), e => e.status === 409);
  const edits = await Promise.allSettled([
    service.updateWorkOrder('site-a', order.id, { status: 'in_progress', version: 1, note: 'Started' }, 'operator-a'),
    service.updateWorkOrder('site-a', order.id, { dueAt: new Date().toISOString(), version: 1, note: 'Set due date' }, 'operator-a'),
  ]);
  assert.equal(edits.filter(e => e.status === 'fulfilled').length, 1);
  assert.equal(edits.filter(e => e.status === 'rejected' && e.reason.status === 409).length, 1);
  const detail = await service.getWorkOrder('site-a', order.id);
  assert.equal(detail.version, 2);
  await service.comment('site-a', order.id, 'Measured cable condition recorded', 'operator-a');
  assert.ok((await service.getWorkOrder('site-a', order.id)).history.some(e => e.action === 'comment'));
  await service.transitionAlert('site-a', alert.id, 'resolve', 'Inspection completed', 'operator-a');
  const resolved = await service.getAlert('site-a', alert.id);
  assert.equal(resolved.status, 'resolved'); assert.equal(resolved.resolvedBy, 'operator-a');
  assert.equal(resolved.history.length, 3);
  assert.equal((await service.listAlerts('site-a', { resolved: false })).length, 0);
  const { auditEvents, notificationOutbox } = require('../db/schema.ts');
  assert.ok((await c.db.select().from(auditEvents)).length >= 6);
  assert.ok((await c.db.select().from(notificationOutbox)).length >= 6);
  const { parseExport, importRows } = require('../scripts/import-audit');
  const imported = parseExport({ auditLog: { 'synthetic-legacy-1': { actorId: 'operator-a', targetId: 'site-a', action: 'test.import', at: '2026-11-01T00:00:00.000Z', unexpectedSecret: 'must-be-discarded' } } });
  assert.equal('unexpectedSecret' in imported[0], false);
  assert.equal(await importRows(c.db, imported), 1); assert.equal(await importRows(c.db, imported), 0);
  const client = require('../db/client'), previous = client.getRelational;
  client.getRelational = () => Promise.resolve(c);
  try {
    const audit = require('../services/auditLog');
    await audit.audit({ actorId: 'operator-a', targetId: alert.id, action: 'test.audit', requestId: 'synthetic-request' });
    assert.equal((await audit.listAudit(1))[0].action, 'test.audit');
  } finally { client.getRelational = previous; }
});
test('rule episodes deduplicate replay, preserve acknowledgement and require a cleared condition to recur', async t => {
  const c = await open({ pglite: true, migrate: true }); t.after(() => c.close());
  const service = require('../services/operations').createOperations(c.db);
  const signal = { sourceKey: 'sensor:ina219', title: 'INA219 not responding', message: 'Check sensor', severity: 'warning' };
  await service.syncSignals('site-a', 100, [signal]);
  const first = (await service.listAlerts('site-a'))[0];
  await service.transitionAlert('site-a', first.id, 'resolve', 'Checked', 'operator');
  await service.syncSignals('site-a', 100, [signal]);
  await service.syncSignals('site-a', 101, [signal]);
  await service.syncSignals('site-a', 99, []);
  assert.equal((await service.listAlerts('site-a')).length, 1);
  await service.syncSignals('site-a', 102, []);
  await service.syncSignals('site-a', 103, [signal]);
  assert.equal((await service.listAlerts('site-a')).length, 2);
  assert.equal((await service.listAlerts('site-a', { resolved: false })).length, 1);
  assert.equal((await service.listAlerts('site-b')).length, 0);
});
