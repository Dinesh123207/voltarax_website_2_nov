const { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } = require('node:crypto');

function createOtpService({ store, send, secret, now = Date.now, generateCode = () => String(randomInt(0, 1000000)).padStart(6, '0') }) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('OTP secret must contain at least 32 characters');
  const identity = (email, purpose) => createHash('sha256').update(`${purpose}:${email.trim().toLowerCase()}`).digest('hex');
  const digest = (key, nonce, code) => createHmac('sha256', secret).update(`${key}:${nonce}:${code}`).digest('hex');
  return {
    async issue(email, purpose = 'registration') {
      const key = identity(email, purpose); const stamp = now();
      const code = generateCode(); const nonce = randomBytes(16).toString('hex');
      const next = { hash: digest(key, nonce, code), nonce, expiresAt: stamp + 600000, attempts: 0, sentAt: stamp, consumed: false };
      const result = await store.transaction(key, current => {
        if (current && stamp - current.sentAt < 60000) return undefined;
        return next;
      });
      if (!result.committed) return { issued: false, retryAfter: 60 };
      try { await send({ email, code, purpose, expiresMinutes: 10 }); }
      catch (error) {
        await store.transaction(key, current => current?.nonce === nonce ? null : undefined);
        throw new Error('Verification delivery unavailable');
      }
      return { issued: true };
    },
    async verify(email, code, purpose = 'registration') {
      if (!/^\d{6}$/.test(String(code))) return false;
      const key = identity(email, purpose); const stamp = now();
      const result = await store.transaction(key, current => {
        if (!current || current.consumed || current.expiresAt <= stamp || current.attempts >= 5) return undefined;
        const expected = Buffer.from(digest(key, current.nonce, code), 'hex');
        const actual = Buffer.from(current.hash, 'hex');
        const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
        return { ...current, attempts: current.attempts + 1, consumed: valid, ...(valid ? { consumedAt: stamp } : {}) };
      });
      return result.committed && result.value?.consumed === true && result.value?.consumedAt === stamp;
    },
  };
}
module.exports = { createOtpService };
