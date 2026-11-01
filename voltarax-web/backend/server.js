require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');

// Routes
const authRoutes       = require('./routes/auth');
const contentRoutes    = require('./routes/content');
const voltvisionRoutes = require('./routes/voltvision');
const chatRoutes       = require('./routes/chat');
const telemetryRoutes  = require('./routes/telemetry');
const { startTelemetryWatcher } = require('./services/telemetryWatcher');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect DB ────────────────────────────────────────────────────────────────
connectDB();
startTelemetryWatcher();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://voltarax.in',
    'https://www.voltarax.in',
  ],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Voltarax Corporate API',
    version: '1.0.0',
    env: process.env.NODE_ENV,
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api',            contentRoutes);
app.use('/api/voltvision', voltvisionRoutes);
// Same-origin dashboard API. GoDaddy deployment does not depend on an external service.
app.use('/api', voltvisionRoutes);
// Hardware telemetry ingestion + read API. Devices use x-device-key; dashboard uses JWT.
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/chat',       chatRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error.' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Voltarax API running on port ${PORT} [${process.env.NODE_ENV}]`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
});
