import { getServerSideSitemap } from 'next-sitemap';
import { publicSitemap } from '@/lib/public-site';
export const dynamic = 'force-dynamic';
export async function GET() {
  return getServerSideSitemap(publicSitemap(), { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
}
