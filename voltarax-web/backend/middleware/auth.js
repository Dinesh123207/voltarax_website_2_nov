const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT ────────────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'voltarax-api', issuer: 'voltarax' });
    if (typeof decoded.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(decoded.id)) throw new Error('Invalid account identifier');
    const user    = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }
    if (!user.emailVerified || !Number.isInteger(decoded.ver) || decoded.ver !== (user.sessionVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Sign in and verify your email again.' });
    }
    if (!req.headers.authorization && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('x-voltarax-request') !== '1') {
      return res.status(403).json({ success: false, message: 'Request verification required.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ── RBAC ──────────────────────────────────────────────────────────────────────
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role(s): ${roles.join(', ')}`,
    });
  }
  next();
};

exports.requireAdmin    = exports.requireRole('admin');
exports.requireOperator = exports.requireRole('admin', 'operator');
exports.requireSite = (req, res, next) => {
  const site = process.env.SOLAR_SITE_ID || 'solar_site';
  if (req.user?.role === 'admin' || req.user?.siteIds?.includes(site)) return next();
  return res.status(403).json({ success: false, message: 'Site access has not been assigned. Contact an administrator.' });
};
