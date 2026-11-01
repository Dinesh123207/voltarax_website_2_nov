/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

const nextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: { cpus: 1 },
  images: { domains: ['voltarax.in'] },
  async headers() {
    const development = process.env.NODE_ENV !== 'production';
    const csp = ["default-src 'self'", `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob: https://voltarax.in", "media-src 'self'", `connect-src 'self'${development ? ' ws: wss:' : ''}`, "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ...(!development ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
    ] }, { source: '/account/orders/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp
        .replace("script-src 'self'", "script-src 'self' https://checkout.razorpay.com")
        .replace("connect-src 'self'", "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com")
        + "; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com" },
    ] }, { source: '/hi/account/orders/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp.replace("script-src 'self'", "script-src 'self' https://checkout.razorpay.com")
        .replace("connect-src 'self'", "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com")
        + "; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com" },
    ] }, ...['/api/:path*', '/health', '/dashboard/:path*', '/account/:path*', '/login', '/hi/dashboard/:path*', '/hi/account/:path*', '/hi/login', '/privacy', '/terms', '/refunds', '/hi/privacy', '/hi/terms', '/hi/refunds'].map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }))];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
