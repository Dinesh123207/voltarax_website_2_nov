// Operator-reviewed origin only; request Host headers never choose public URLs.
export function publicPolicy(environment: Record<string, string | undefined> = process.env) {
  let origin: string | null = null;
  try {
    const url = new URL(environment.SITE_URL || '');
    const host = url.hostname.toLowerCase();
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash &&
        host.includes('.') && !host.includes(':') && !/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
        !/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) && !/(^|\.)example\.(com|org|net)$/.test(host)) origin = url.origin;
  } catch { /* Invalid/unset origin keeps indexing disabled. */ }
  return { origin, indexing: !!origin && environment.PUBLIC_INDEXING_ENABLED === 'true' && environment.PUBLIC_CONTENT_REVIEWED === 'true' };
}
export const publicPaths = ['/', '/products', '/pricing', '/technology', '/sustainability', '/about', '/contact'] as const;
export function localizedPath(path: string, locale: string) { return locale === 'hi' ? '/hi' + (path === '/' ? '' : path) : path; }
export function publicSitemap(environment: Record<string, string | undefined> = process.env) {
  const policy = publicPolicy(environment);
  if (!policy.indexing) return [];
  return publicPaths.flatMap(path => ['en', 'hi'].map(locale => ({ loc: policy.origin + localizedPath(path, locale),
    alternateRefs: ['en', 'hi'].map(language => ({ hreflang: language, href: policy.origin + localizedPath(path, language), hrefIsAbsolute: true })) })));
}
export function structuredProject(environment: Record<string, string | undefined> = process.env) {
  const policy = publicPolicy(environment);
  if (!policy.indexing) return null;
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': policy.origin + '/#project', name: 'Voltarax', url: policy.origin, description: 'Renewable equipment monitoring project.' },
    { '@type': 'Product', name: 'VoltVision', description: 'Site monitoring software under development. Hardware and service configuration required; field performance unverified.',
      url: policy.origin + '/products', brand: { '@id': policy.origin + '/#project' } },
  ] };
}
