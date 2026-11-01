import { publicPolicy } from '@/lib/public-site';
export const dynamic = 'force-dynamic';
export function GET() {
  const policy = publicPolicy();
  const body = policy.indexing ? 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /account\nDisallow: /login\nDisallow: /hi/dashboard\nDisallow: /hi/account\nDisallow: /hi/login\nDisallow: /privacy\nDisallow: /terms\nDisallow: /refunds\nDisallow: /hi/privacy\nDisallow: /hi/terms\nDisallow: /hi/refunds\nSitemap: ' + policy.origin + '/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
