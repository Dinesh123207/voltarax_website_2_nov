const bcrypt = require('bcryptjs');
const { db, FirebaseQuery, clone } = require('../services/firebaseModel');

class UserRecord {
  constructor(data) { Object.assign(this, data); }
  async comparePassword(plain) { return bcrypt.compare(plain, this.password || ''); }
  async save() {
    const id = this._id;
    const data = { ...this };
    delete data._id;
    data.updatedAt = new Date().toISOString();
    await db.ref(`users/${id}`).set(clone(data));
    return this;
  }
  toJSON() {
    const obj = { ...this };
    delete obj.password; delete obj.resetToken; delete obj.resetTokenExpiry;
    return obj;
  }
  select() { return this; }
}

async function allUsers() {
  const snap = await db.ref('users').get();
  const value = snap.val() || {};
  return Object.entries(value).map(([id, row]) => new UserRecord({ _id: id, ...row }));
}

// findOne/findById return a UserRecord instance (comparePassword, save, toJSON on
// its prototype). They deliberately do NOT go through FirebaseQuery's default
// .exec(), which JSON-round-trips rows for plain-object models — that would
// silently strip the UserRecord prototype and break login and session handling.
// select()/lean() are accepted as no-ops for Mongoose-style call-site compatibility.
function singleUserQuery(loader) {
  return {
    _cache: null,
    async exec() { return this._cache ?? (this._cache = await loader()); },
    select() { return this; },
    lean() { return this; },
    then(resolve, reject) { return this.exec().then(resolve, reject); },
    catch(reject) { return this.exec().catch(reject); },
  };
}

const User = {
  findOne(filter = {}) {
    return singleUserQuery(async () => {
      const rows = (await allUsers()).filter(row => Object.entries(filter).every(([k,v]) => String(row[k]).toLowerCase() === String(v).toLowerCase()));
      return rows[0] || null;
    });
  },
  findById(id) {
    return singleUserQuery(async () => {
      const snap = await db.ref(`users/${id}`).get();
      return snap.exists() ? new UserRecord({ _id: id, ...snap.val() }) : null;
    });
  },
  find(filter = {}, projection) {
    return new FirebaseQuery(async () => {
      let rows = await allUsers();
      rows = rows.filter(row => Object.entries(filter).every(([k,v]) => String(row[k]) === String(v)));
      return rows.map(row => {
        const out = { ...row };
        if (projection) for (const [k,v] of Object.entries(projection)) if (v === 0) delete out[k];
        return out;
      });
    });
  },
  async create(data) {
    const id = db.ref('users').push().key;
    const password = await bcrypt.hash(data.password, 12);
    const now = new Date().toISOString();
    const row = { name: data.name, email: String(data.email).toLowerCase(), password, role: data.role || 'viewer', company: data.company || '', phone: data.phone || '', isActive: data.isActive !== false, lastLogin: data.lastLogin || null, createdAt: now, updatedAt: now };
    await db.ref(`users/${id}`).set(row);
    return new UserRecord({ _id: id, ...row });
  },
};

module.exports = User;
