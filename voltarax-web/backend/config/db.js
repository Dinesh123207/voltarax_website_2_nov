const { db } = require('./firebase');

const connectDB = async () => {
  await db.ref('.info/connected').once('value').catch((err) => {
    throw new Error(`Firebase connection failed: ${err.message}`);
  });
  console.log('✅ Firebase Realtime Database configured');
};

module.exports = connectDB;
