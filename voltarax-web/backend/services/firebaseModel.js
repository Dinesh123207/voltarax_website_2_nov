const { db, admin } = require('../config/firebase');

const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
const nowIso = () => new Date().toISOString();
const matches = (row, filter = {}) => Object.entries(filter).every(([key, expected]) => {
  const actual = row?.[key];
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if ('$gte' in expected && !(Number(actual) >= Number(expected.$gte))) return false;
    if ('$lte' in expected && !(Number(actual) <= Number(expected.$lte))) return false;
    if ('$gt' in expected && !(Number(actual) > Number(expected.$gt))) return false;
    if ('$lt' in expected && !(Number(actual) < Number(expected.$lt))) return false;
    return true;
  }
  return String(actual) === String(expected);
});

class FirebaseQuery {
  constructor(loader) { this.loader = loader; this.ops = []; }
  sort(spec = {}) { this.ops.push({ type: 'sort', spec }); return this; }
  skip(n = 0) { this.ops.push({ type: 'skip', n: Number(n) }); return this; }
  limit(n) { this.ops.push({ type: 'limit', n: Number(n) }); return this; }
  select() { return this; }
  populate() { return this; }
  lean() { return this; }
  async exec() {
    let rows = await this.loader(this.ops);
    for (const op of this.ops) {
      if (op.type === 'sort') {
        const entries = Object.entries(op.spec);
        rows.sort((a, b) => {
          for (const [field, direction] of entries) {
            const av = a?.[field]; const bv = b?.[field];
            if (av === bv) continue;
            const cmp = av > bv ? 1 : -1;
            return cmp * (Number(direction) < 0 ? -1 : 1);
          }
          return 0;
        });
      } else if (op.type === 'skip') rows = rows.slice(op.n);
      else if (op.type === 'limit') rows = rows.slice(0, op.n);
    }
    return clone(rows);
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
}

class FirebaseModel {
  constructor(collectionPath, { idField = '_id', timestamps = true } = {}) {
    this.collectionPath = collectionPath;
    this.idField = idField;
    this.timestamps = timestamps;
  }
  ref(id) { return db.ref(`${this.collectionPath}/${id}`); }
  async _all() {
    const snap = await db.ref(this.collectionPath).get();
    const value = snap.val() || {};
    return Object.entries(value).map(([id, row]) => ({ [this.idField]: id, ...row }));
  }
  async _filtered(filter = {}, ops = []) {
    const entries = Object.entries(filter);
    if (filter[this.idField] != null && typeof filter[this.idField] !== 'object') {
      const id = String(filter[this.idField]);
      const snap = await this.ref(id).get();
      return snap.exists() ? [{ [this.idField]: id, ...snap.val() }] : [];
    }
    const range = entries.find(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
    const equality = entries.find(([, v]) => v == null || typeof v !== 'object');
    const chosen = range || equality;
    if (!chosen) return this._all();
    const [field, value] = chosen;
    let query = db.ref(this.collectionPath).orderByChild(field);
    if (value && typeof value === 'object') {
      if (value.$gte != null) query = query.startAt(value.$gte);
      if (value.$lte != null) query = query.endAt(value.$lte);
    } else query = query.equalTo(value);
    // A Firebase query can order by only one field. Only push a limit down
    // when it cannot discard rows needed by a second filter or local sort.
    const sort = ops.find(op => op.type === 'sort');
    const limit = ops.find(op => op.type === 'limit');
    const skip = ops.find(op => op.type === 'skip');
    const sortEntries = Object.entries(sort?.spec || {});
    if (entries.length === 1 && limit && !skip && !(value && typeof value === 'object' && ('$gt' in value || '$lt' in value)) && sortEntries.length === 1 && sortEntries[0][0] === field && limit.n > 0) {
      query = sortEntries[0][1] < 0 ? query.limitToLast(limit.n) : query.limitToFirst(limit.n);
    }
    const snap = await query.get();
    return Object.entries(snap.val() || {}).map(([id, row]) => ({ [this.idField]: id, ...row }));
  }
  find(filter = {}, projection) {
    return new FirebaseQuery(async ops => {
      const rows = (await this._filtered(filter, ops)).filter(row => matches(row, filter));
      if (!projection) return rows;
      return rows.map(row => {
        const out = { ...row };
        for (const [k, v] of Object.entries(projection)) if (v === 0) delete out[k];
        return out;
      });
    });
  }
  findOne(filter = {}) {
    const q = new FirebaseQuery(async () => {
      const rows = (await this._filtered(filter)).filter(row => matches(row, filter));
      return rows.slice(0, 1);
    });
    q.execOne = async () => {
      const rows = await q.exec();
      return rows[0] || null;
    };
    const originalExec = q.exec.bind(q);
    q.exec = async () => (await originalExec())[0] || null;
    q.then = (resolve, reject) => q.exec().then(resolve, reject);
    return q;
  }
  async create(data) {
    const id = db.ref(this.collectionPath).push().key;
    const value = clone({ ...data });
    if (this.timestamps) {
      const stamp = nowIso();
      value.createdAt = value.createdAt || stamp;
      value.updatedAt = stamp;
    }
    await this.ref(id).set(value);
    return this._decorate({ [this.idField]: id, ...value });
  }
  async countDocuments(filter = {}) { return (await this._filtered(filter)).filter(row => matches(row, filter)).length; }
  async findOneAndUpdate(filter, update, options = {}) {
    const found = (await this._filtered(filter)).find(row => matches(row, filter));
    let id = found?.[this.idField];
    let current = found ? { ...found } : null;
    if (!id && options.upsert) id = db.ref(this.collectionPath).push().key;
    if (!id) return null;
    if (!current) current = { [this.idField]: id };
    if (update?.$inc) for (const [k, v] of Object.entries(update.$inc)) current[k] = Number(current[k] || 0) + Number(v);
    for (const [k, v] of Object.entries(update || {})) if (!k.startsWith('$')) current[k] = v;
    if (this.timestamps) current.updatedAt = nowIso();
    await this.ref(id).set(clone(Object.fromEntries(Object.entries(current).filter(([k]) => k !== this.idField))));
    return this._decorate(current);
  }
  _decorate(row) { return row; }
}

function makeModel(path, options) { return new FirebaseModel(path, options); }
module.exports = { db, admin, FirebaseQuery, FirebaseModel, makeModel, matches, clone };
