const { randomUUID, createHash } = require('node:crypto');
const { eq, and, desc, asc, gte, lte, sql, count } = require('drizzle-orm');
const s = require('../db/schema.ts');
const { OperationError } = require('./operations');
const RULES = Object.freeze([
  { conditions: ['clean'], category: 'no_issue_reported', label: 'No issue reported in this observation' },
  { conditions: ['dusty'], category: 'cleaning_review', label: 'Review cleaning need' },
  { conditions: ['cracked', 'peeling'], category: 'technician_review', label: 'Arrange technician review' },
  { conditions: ['other', 'unknown'], category: 'assessment_needed', label: 'Further assessment needed' },
]);
function indicator(row, now = Date.now(), maximumAgeDays = 30) {
  if (!Number.isFinite(maximumAgeDays) || maximumAgeDays < 1 || maximumAgeDays > 365) throw new OperationError(503, 'Inspection freshness policy is unavailable.');
  if (!row) return { category: null, label: 'Unavailable', dataQuality: 'Unavailable', score: null };
  const stale = now - new Date(row.observedAt).getTime() > maximumAgeDays * 86400000;
  const rule = RULES.find(rule => rule.conditions.includes(row.condition));
  return { category: stale || !rule ? null : rule.category, label: stale ? 'Observation is old; record a new inspection' : rule?.label || 'Unavailable', stale,
    maximumAgeDays, basedOnId: row.id, observedAt: row.observedAt, score: null, dataQuality: stale || !rule ? 'Unavailable' : 'Calculated',
    basis: 'Rule applied to an operator-entered condition. No coating score, material test or ML classification is inferred.' };
}
const photoMetadata = ({ dataBase64, ...row }) => ({ ...row, captureTime: null, quality: { captureTime: 'Unavailable', savedAt: 'Calculated' }, timestampNote: 'Saved at server receipt time; camera capture time is unavailable.' });
function createInspections(db, { now = () => Date.now(), maximumAgeDays = 30 } = {}) {
  async function savePhoto(siteId, image, source, actorId) {
    if (!['camera', 'upload'].includes(source) || !['image/jpeg', 'image/png'].includes(image.mime) || !Buffer.isBuffer(image.bytes) || image.bytes.length > 2 * 1024 * 1024) throw new OperationError(422, 'Invalid photo.');
    const row = { id: randomUUID(), siteId, source, mime: image.mime, width: image.width, height: image.height,
      sha256: createHash('sha256').update(image.bytes).digest('hex'), dataBase64: image.bytes.toString('base64'), savedAt: new Date(now()), savedBy: actorId };
    await db.transaction(async tx => { await tx.insert(s.inspectionPhotos).values(row);
      await tx.insert(s.auditEvents).values({ id: randomUUID(), siteId, actorId, action: 'photo.created', targetId: row.id, at: row.savedAt }); });
    return photoMetadata(row);
  }
  async function getPhoto(siteId, id) {
    const row = (await db.select().from(s.inspectionPhotos).where(and(eq(s.inspectionPhotos.id, id), eq(s.inspectionPhotos.siteId, siteId))))[0];
    if (!row) throw new OperationError(404, 'Photo not found.'); return row;
  }
  async function listPhotos(siteId, limit = 100) {
    const p = s.inspectionPhotos;
    const rows = await db.select({ id: p.id, siteId: p.siteId, source: p.source, mime: p.mime, width: p.width, height: p.height, sha256: p.sha256, savedAt: p.savedAt, savedBy: p.savedBy }).from(p).where(eq(p.siteId, siteId)).orderBy(desc(p.savedAt), desc(p.id)).limit(limit);
    return rows.map(photoMetadata);
  }
  async function create(siteId, data, actorId) {
    const stamp = new Date(data.observedAt);
    if (!Number.isFinite(stamp.getTime()) || stamp.getTime() < Date.UTC(2000, 0, 1) || stamp.getTime() > now() + 300000) throw new OperationError(422, 'Use a valid past observation time.');
    return db.transaction(async tx => {
      const photo = (await tx.select({ id: s.inspectionPhotos.id }).from(s.inspectionPhotos).where(and(eq(s.inspectionPhotos.siteId, siteId), eq(s.inspectionPhotos.id, data.photoId))))[0];
      if (!photo) throw new OperationError(404, 'Photo not found for this site.');
      const row = { id: randomUUID(), siteId, kind: data.kind, area: data.area.trim().replace(/\s+/g, ' '), areaKey: data.area.trim().replace(/\s+/g, ' ').toLowerCase(), condition: data.condition,
        notes: data.notes, observedAt: stamp, photoId: photo.id, createdAt: new Date(now()), createdBy: actorId };
      await tx.insert(s.inspections).values(row);
      await tx.insert(s.auditEvents).values({ id: randomUUID(), siteId, actorId, action: 'inspection.created', targetId: row.id, at: row.createdAt });
      return { ...row, indicator: indicator(row, now(), maximumAgeDays), dataQuality: 'Calculated', source: 'operator-observation' };
    });
  }
  async function list(siteId, { kind, limit = 100 } = {}) {
    const rows = await db.select().from(s.inspections).where(and(eq(s.inspections.siteId, siteId), kind ? eq(s.inspections.kind, kind) : undefined)).orderBy(desc(s.inspections.observedAt), desc(s.inspections.createdAt), desc(s.inspections.id)).limit(limit);
    return rows.map(row => ({ ...row, indicator: indicator(row, now(), maximumAgeDays), dataQuality: 'Calculated', source: 'operator-observation' }));
  }
  async function coating(siteId) {
    const rows = await db.selectDistinctOn([s.inspections.areaKey]).from(s.inspections).where(and(eq(s.inspections.siteId, siteId), eq(s.inspections.kind, 'coating')))
      .orderBy(asc(s.inspections.areaKey), desc(s.inspections.observedAt), desc(s.inspections.createdAt), desc(s.inspections.id)).limit(501);
    const day = sql`to_char(${s.inspections.observedAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`;
    const trends = await db.select({ day, condition: s.inspections.condition, count: count() }).from(s.inspections)
      .where(and(eq(s.inspections.siteId, siteId), eq(s.inspections.kind, 'coating'), gte(s.inspections.observedAt, new Date(now() - 90 * 86400000)), lte(s.inspections.observedAt, new Date(now()))))
      .groupBy(day, s.inspections.condition).orderBy(asc(day), asc(s.inspections.condition)).limit(600);
    return { areas: rows.slice(0, 500).map(row => ({ ...row, indicator: indicator(row, now(), maximumAgeDays), source: 'operator-observation' })), truncated: rows.length > 500,
      rules: RULES, trends, trendPeriodDays: 90, trendTimezone: 'Asia/Kolkata', score: null, quality: { score: 'Unavailable' },
      note: 'Categories reflect the latest dated manual observation per named area, not measured coating health or ML. Trends count recorded observations, not panels or prevalence.' };
  }
  return { savePhoto, getPhoto, listPhotos, create, list, coating };
}
async function getInspections() {
  const c = require('../db/client').getRelational(); if (!c) throw new OperationError(503, 'Inspection storage is not configured.');
  return createInspections((await c).db, { maximumAgeDays: Number(process.env.INSPECTION_MAX_AGE_DAYS || 30) });
}
module.exports = { RULES, indicator, photoMetadata, createInspections, getInspections };
