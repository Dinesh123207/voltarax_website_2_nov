const jwt = require('jsonwebtoken');
function ttl() { const seconds = Number(process.env.SESSION_TTL_SECONDS || 28800); if (!Number.isInteger(seconds) || seconds < 300 || seconds > 604800) throw new Error('Invalid session lifetime'); return seconds; }
const options = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
function sendSession(user, res) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Session secret is not configured');
  const token = jwt.sign({ id: user._id, ver: user.sessionVersion || 0 }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: ttl(), audience: 'voltarax-api', issuer: 'voltarax' });
  res.cookie('token', token, { ...options(), maxAge: ttl() * 1000 });
  return token;
}
module.exports = { sendSession, options };
