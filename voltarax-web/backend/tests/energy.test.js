const test = require('node:test');
const assert = require('node:assert/strict');
const { periodStartsIST, integrateKwh } = require('../services/energy');

test('period starts follow India time across month and year boundaries', () => {
  const p = periodStartsIST(new Date('2025-12-31T19:00:00Z'));
  assert.equal(new Date(p.day * 1000).toISOString(), '2025-12-31T18:30:00.000Z');
  assert.equal(p.day, p.month);
  assert.equal(p.day, p.year);
  const q = periodStartsIST(new Date('2026-03-31T18:29:59Z'));
  assert.equal(new Date(q.month * 1000).toISOString(), '2026-02-28T18:30:00.000Z');
});

test('integrates milliwatts over seconds, clips periods and caps stale gaps', () => {
  const rows = [{ ts: 0, power_mw: 1000000 }, { ts: 600, power_mw: 2000000 }, { ts: 1800, power_mw: 0 }];
  assert.ok(Math.abs(integrateKwh(rows, 300, 1200) - (300 + 2 * 600) / 3600) < 1e-10);
  assert.equal(integrateKwh([{ ts: 0, power_mw: 1000000 }, { ts: 7200 }], 0, 7200), 0.25);
  assert.equal(integrateKwh([], 0, 7200), 0);
});
