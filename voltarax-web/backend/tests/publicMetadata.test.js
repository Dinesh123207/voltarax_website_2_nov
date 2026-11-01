const test = require('node:test'), assert = require('node:assert/strict');
const { publicPolicy, publicSitemap, structuredProject } = require('../../frontend/lib/public-site.ts');
const configured = { SITE_URL: 'https://reviewed-site.voltarax.in', PUBLIC_INDEXING_ENABLED: 'true', PUBLIC_CONTENT_REVIEWED: 'true' };
test('public indexing needs an explicit reviewed origin and both switches', () => {
  for (const SITE_URL of ['', 'https://example.com', 'http://voltarax.in', 'https://user:pass@voltarax.in', 'https://127.0.0.1', 'https://localhost', 'https://private.local', 'https://voltarax.in/path', 'https://voltarax.in/?token=not-a-key']) {
    assert.equal(publicPolicy({ ...configured, SITE_URL }).indexing, false);
    assert.deepEqual(publicSitemap({ ...configured, SITE_URL }), []);
  }
  assert.equal(publicPolicy({ SITE_URL: configured.SITE_URL }).indexing, false);
  assert.equal(publicPolicy({ ...configured, PUBLIC_CONTENT_REVIEWED: 'false' }).indexing, false);
  assert.equal(structuredProject({}), null);
});
test('sitemap allows only public bilingual paths, without invented timestamps or private records', () => {
  const rows = publicSitemap(configured); assert.equal(rows.length, 14);
  assert.equal(new Set(rows.map(row => row.loc)).size, 14);
  assert.ok(rows.some(row => row.loc.endsWith('/hi/products')));
  for (const row of rows) {
    assert.ok(!/dashboard|account|login|api\/|privacy|terms|refunds/.test(row.loc));
    assert.equal(row.alternateRefs.length, 2); assert.equal(row.lastmod, undefined);
  }
  const json = JSON.stringify(structuredProject(configured));
  assert.ok(!/offers|price|aggregateRating|reviewCount|address|email|telephone|founder/.test(json));
  assert.match(json, /field performance unverified/);
});
