const admin = require('firebase-admin');

function parseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); }
    catch (err) { throw new ConfigError(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${err.message}`); }
  }
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  return null;
}

class ConfigError extends Error {}

function initFirebase() {
  if (admin.apps.length) return admin.app();

  if (!process.env.FIREBASE_DATABASE_URL) {
    throw new ConfigError(
      'FIREBASE_DATABASE_URL is not set.\n' +
      '  Firebase Console -> Project settings -> General -> your web app, or\n' +
      '  Realtime Database -> the URL shown above the data tree.\n' +
      '  Set it in backend/.env, e.g. FIREBASE_DATABASE_URL=https://voltarax-default-rtdb.firebaseio.com'
    );
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new ConfigError(
      'No Firebase service account credentials found.\n' +
      '  Firebase Console -> Project settings -> Service accounts -> Generate new private key,\n' +
      '  then set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in backend/.env\n' +
      '  (or the whole file as one line in FIREBASE_SERVICE_ACCOUNT_JSON). Never commit this key.'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

let app;
try {
  app = initFirebase();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error('\n❌ Firebase is not configured.\n');
    console.error(err.message);
    console.error('\nSee backend/README-FIREBASE.md for the full setup steps.\n');
    process.exit(1);
  }
  throw err;
}

const db = admin.database(app);

module.exports = { admin, app, db, ConfigError };
