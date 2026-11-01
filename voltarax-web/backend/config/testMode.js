function demoEmulator(env = process.env) {
  if (!env.FIREBASE_DATABASE_EMULATOR_HOST) return false;
  const match = /^127\.0\.0\.1:(\d{1,5})$/.exec(env.FIREBASE_DATABASE_EMULATOR_HOST);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535 || !/^demo-[a-z0-9-]+$/.test(env.FIREBASE_PROJECT_ID || '') || env.NODE_ENV === 'production') throw new Error('Emulator mode requires a loopback host, demo project and non-production runtime');
  return true;
}
const simulatorAllowed = (env = process.env) => env.DEVICE_SIMULATOR_ENABLED === 'true' && demoEmulator(env);
module.exports = { demoEmulator, simulatorAllowed };
