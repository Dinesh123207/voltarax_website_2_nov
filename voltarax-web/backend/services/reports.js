const { randomUUID, createHash } = require('node:crypto');
const { eq, and, gte, lt, desc, count } = require('drizzle-orm');
const { reports, alerts, workOrders, auditEvents } = require('../db/schema.ts');
const { energyStats } = require('./energy');
const { OperationError } = require('./operations');
const fail = message => { throw new OperationError(422, message); };
const IST_MS = 330 * 60000;
function reportPeriod(start, end, now = Date.now()) {
  function parse(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Use a valid calendar date.');
    const result = new Date(`${value}T00:00:00+05:30`).getTime();
    if (!Number.isFinite(result) || new Date(result + IST_MS).toISOString().slice(0, 10) !== value) fail('Use a valid calendar date.');
    return result / 1000;
  }
  const from = parse(start), until = parse(end) + 86400;
  if (until <= from || until - from > 31 * 86400 || until > now / 1000) fail('Choose a completed period of one to thirty-one days in IST.');
  return { start: from, end: until };
}
function buildEvidence({ siteId, deviceId, readings, start, end, factor, source, verified, minimumCoverage = 90, statistics, fixture = false, now = Date.now() }) {
  if (!(Number.isFinite(start) && Number.isFinite(end) && end > start && end <= now / 1000 && end - start <= 31 * 86400)) fail('Invalid or incomplete reporting period.');
  if (!verified || !Number.isFinite(factor) || factor <= 0 || factor > 5) fail('A verified grid emission factor in kg CO2/kWh is required.');
  let reference;
  try { reference = new URL(source); } catch { fail('A verified HTTPS emission-factor source is required.'); }
  if (reference.protocol !== 'https:' || reference.username || reference.password || reference.search || reference.hash || reference.href.length > 300) fail('Use a public HTTPS factor source without credentials or query parameters (up to 300 characters).');
  if (!statistics || !['alertsCreated', 'workOrdersCreated', 'workOrdersClosed'].every(key => Number.isSafeInteger(statistics[key]) && statistics[key] >= 0)) fail('Operations record counts are unavailable.');
  if (!Number.isFinite(minimumCoverage) || minimumCoverage < 90 || minimumCoverage > 100) fail('Coverage policy must be between 90 and 100 percent.');
  const rows = readings.filter(r => r.site_id === siteId && r.device_id === deviceId && Number.isFinite(r.ts));
  if (!fixture && rows.some(r => r.simulated)) fail('Synthetic readings cannot issue an ESG report.');
  const energy = energyStats(rows, start, end);
  const coverage = energy.coveredSeconds / energy.periodSeconds * 100;
  if (energy.kwh == null || coverage + 1e-8 < minimumCoverage) fail(`Insufficient recorded-power coverage; at least ${minimumCoverage}% is required. Gaps are not extrapolated.`);
  const quality = fixture ? 'Estimated' : 'Calculated';
  return { siteId, deviceId, fixture, generatedAt: new Date(now).toISOString(),
    period: { start: new Date(start * 1000).toISOString(), endExclusive: new Date(end * 1000).toISOString(), timezone: 'Asia/Kolkata' },
    energy: { kwh: energy.kwh, quality }, carbon: { kg: energy.kwh * factor, quality: 'Estimated' },
    coverage: { percent: coverage, seconds: energy.coveredSeconds, minimumPercent: minimumCoverage, quality },
    factor: { kgCo2PerKwh: factor, source: reference.href, operatorVerified: true, quality: 'Estimated' },
    uptime: { percent: null, quality: 'Unavailable', reason: 'Recorded-power coverage is not physical or operational uptime.' },
    operations: { alertsCreated: statistics.alertsCreated, workOrdersCreated: statistics.workOrdersCreated, workOrdersClosed: statistics.workOrdersClosed, quality },
    method: 'Left-held power integrated between recorded valid samples, capped at 900 seconds per interval. Missing intervals are not extrapolated. This is an operational estimate, not independent assurance or a certified carbon credit.' };
}
async function renderReport(evidence) {
  const { PDFDocument } = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: evidence.fixture ? 'Voltarax - synthetic report layout test' : 'Voltarax - recorded energy and operations report', Author: 'Voltarax', CreationDate: new Date(evidence.generatedAt) } });
  const chunks = []; const complete = new Promise((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const green = '#12604a', dark = '#123126', gray = '#51665c';
  const format = value => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const metric = (label, value, quality, y) => {
    doc.roundedRect(50, y, 495, 43, 5).fill('#f0f5f2');
    doc.fillColor(dark).font('Helvetica').fontSize(11).text(label, 62, y + 15, { width: 210, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12).text(value, 277, y + 14, { width: 150, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor(green).text(quality, 440, y + 16, { width: 95, lineBreak: false });
  };
  doc.rect(0, 0, 595.28, 110).fill(green);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('VOLTARAX', 50, 32);
  doc.font('Helvetica').fontSize(12).text(evidence.fixture ? 'TEST FIXTURE - SYNTHETIC DATA ONLY' : 'Recorded energy and operations report', 50, 68);
  doc.fillColor(dark).fontSize(11).text(`Site: ${evidence.siteId}    Primary sensor: ${evidence.deviceId}`, 50, 132, { width: 495 });
  doc.fillColor(gray).fontSize(10).text(`From ${format(evidence.period.start)} IST\nUntil ${format(evidence.period.endExclusive)} IST (end not included)\nPrepared ${format(evidence.generatedAt)} IST`, 50, 158, { width: 495, lineGap: 4 });
  metric('Recorded energy', `${evidence.energy.kwh.toFixed(3)} kWh`, evidence.energy.quality, 238);
  metric('Estimated carbon avoided', `${evidence.carbon.kg.toFixed(3)} kg CO2`, 'Estimated', 289);
  metric('Recorded-power time coverage', `${evidence.coverage.percent.toFixed(2)}%`, evidence.coverage.quality, 340);
  metric('Alerts created in period', String(evidence.operations.alertsCreated), evidence.operations.quality, 391);
  metric('Work orders created / closed', `${evidence.operations.workOrdersCreated} / ${evidence.operations.workOrdersClosed}`, evidence.operations.quality, 442);
  metric('Physical / operational uptime', 'Unavailable', 'Unavailable', 493);
  doc.fillColor(dark).font('Helvetica-Bold').fontSize(12).text('Read these figures with their limits', 50, 566);
  doc.fillColor(gray).font('Helvetica').fontSize(10).text(evidence.method, 50, 590, { width: 495, lineGap: 4 });
  doc.text('A resolved alert or closed work order is an operator record. It does not independently verify a physical repair.', 50, 672, { width: 495, lineGap: 4 });
  doc.fontSize(9).text('Voltarax | Operational evidence | 1 / 2', 50, 775, { width: 495, lineBreak: false });
  doc.addPage();
  doc.fillColor(green).font('Helvetica-Bold').fontSize(23).text('Method, source and quality', 50, 50);
  let y = 108;
  const paragraph = (title, text) => { doc.fillColor(dark).font('Helvetica-Bold').fontSize(12).text(title, 50, y, { width: 495 }); y = doc.y + 9; doc.fillColor(gray).font('Helvetica').fontSize(10).text(text, 50, y, { width: 495, lineGap: 4 }); y = doc.y + 24; };
  paragraph('Energy method - Calculated', `Only the configured primary device is integrated. Valid power intervals are held from the preceding reading and capped at fifteen minutes. Actual recorded zero power contributes zero. Coverage is ${evidence.coverage.percent.toFixed(2)}%; minimum policy ${evidence.coverage.minimumPercent}%. No missing-period production is inferred.`);
  paragraph('Carbon conversion - Estimated', `Recorded kWh multiplied by ${evidence.factor.kgCo2PerKwh} kg CO2/kWh. The operator explicitly marked this factor/source verified; this software has not independently certified its applicability. Factor source:\n${evidence.factor.source}`);
  paragraph('Operations records - Calculated', 'Counts use site-scoped PostgreSQL records. Alert and work-order creation counts use their creation time within this period; closures use their actual recorded closure time, including work orders created earlier. All period boundaries are in IST.');
  paragraph('Uptime - Unavailable', 'Sensor power coverage cannot establish relay contact state, inverter availability, physical repair quality or operational uptime. No uptime percentage is invented.');
  paragraph('Data-quality legend', 'Measured: a reported observation, without a calibration guarantee. Calculated: arithmetic or stored-record aggregation. Estimated: a model, factor or synthetic layout-test value. Unavailable: evidence is missing. No number in this report certifies a saving, compliance result or carbon credit.');
  if (evidence.fixture) paragraph('Synthetic layout fixture', 'This document is generated only by automated tests. Its values are invented test inputs and must not be used as a site or ESG statement.');
  doc.fillColor(gray).font('Helvetica').fontSize(9).text('Voltarax | Operational evidence | 2 / 2', 50, 775, { width: 495, lineBreak: false });
  doc.end(); return complete;
}
function createReports(db, { readReadings, env = process.env, now = () => Date.now() }) {
  return {
    async generate(siteId, dates, actorId) {
      if (require('../config/testMode').demoEmulator(env)) fail('Formal ESG reports are disabled in simulator mode.');
      const period = reportPeriod(dates.start, dates.end, now()), from = new Date(period.start * 1000), until = new Date(period.end * 1000);
      const countRows = async (table, at) => Number((await db.select({ value: count() }).from(table).where(and(eq(table.siteId, siteId), gte(at, from), lt(at, until))))[0].value);
      const statistics = { alertsCreated: await countRows(alerts, alerts.createdAt), workOrdersCreated: await countRows(workOrders, workOrders.createdAt), workOrdersClosed: await countRows(workOrders, workOrders.closedAt) };
      const evidence = buildEvidence({ siteId, deviceId: env.SOLAR_DEVICE_ID || 'nodemcu-01', readings: await readReadings(siteId, period.start - 900, period.end), ...period,
        factor: env.GRID_EMISSION_FACTOR?.trim() ? Number(env.GRID_EMISSION_FACTOR) : NaN, source: env.GRID_EMISSION_FACTOR_SOURCE, verified: env.GRID_EMISSION_FACTOR_VERIFIED === 'true',
        minimumCoverage: Number(env.ESG_MIN_COVERAGE_PCT || 90), statistics, now: now() });
      const pdf = await renderReport(evidence), id = randomUUID(), sha256 = createHash('sha256').update(pdf).digest('hex');
      await db.transaction(async tx => {
        await tx.insert(reports).values({ id, siteId, startAt: from, endAt: until, createdBy: actorId, createdAt: new Date(now()), evidence, sha256, pdfBase64: pdf.toString('base64') });
        await tx.insert(auditEvents).values({ id: randomUUID(), siteId, actorId, targetId: id, action: 'report.created', at: new Date(now()) });
      });
      return { id, siteId, evidence, sha256 };
    },
    async list(siteId, limit = 50) { return db.select({ id: reports.id, siteId: reports.siteId, startAt: reports.startAt, endAt: reports.endAt, createdAt: reports.createdAt, sha256: reports.sha256 }).from(reports).where(eq(reports.siteId, siteId)).orderBy(desc(reports.createdAt)).limit(limit); },
    async get(siteId, id) { const row = (await db.select().from(reports).where(and(eq(reports.siteId, siteId), eq(reports.id, id))))[0]; if (!row) throw new OperationError(404, 'Report not found.'); return row; },
  };
}
async function getReports() {
  const c = require('../db/client').getRelational(); if (!c) throw new OperationError(503, 'Report storage is not configured.');
  return createReports((await c).db, { readReadings: (site, start, end) => require('../models/SolarTelemetry').find({ site_id: site, ts: { $gte: start, $lte: end } }).sort({ ts: 1 }).lean() });
}
module.exports = { reportPeriod, buildEvidence, renderReport, createReports, getReports };
