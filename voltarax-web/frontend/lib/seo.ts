import type { Metadata } from 'next';
import english from '../messages/en.json';
import hindi from '../messages/hi.json';
import { lookupCopy } from '../i18n/phrase-id';
import { publicPolicy, localizedPath, publicPaths } from './public-site';

export function pageMetadata(path: string, title: string, description: string, draft = false) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const { locale } = await params;
    const copy = (value: string) => lookupCopy(value, english.Phrases, locale === 'hi' ? hindi.Phrases : {});
    const policy = publicPolicy(), index = policy.indexing && !draft && (publicPaths as readonly string[]).includes(path);
    const url = policy.origin ? policy.origin + localizedPath(path, locale) : undefined;
    const localizedTitle = copy(title), localizedDescription = copy(description);
    return {
      title: { absolute: localizedTitle + ' | Voltarax' }, description: localizedDescription,
      metadataBase: policy.origin ? new URL(policy.origin) : undefined,
      robots: { index, follow: index, noarchive: !index },
      alternates: url && !draft ? { canonical: url, languages: { en: policy.origin + path, hi: policy.origin + localizedPath(path, 'hi'), 'x-default': policy.origin + path } } : undefined,
      openGraph: { type: 'website', title: localizedTitle, description: localizedDescription, siteName: 'Voltarax', locale: locale === 'hi' ? 'hi_IN' : 'en_IN',
        ...(url ? { url, images: [{ url: policy.origin + '/og.png', width: 1200, height: 630, alt: 'Voltarax' }] } : {}) },
      twitter: { card: 'summary_large_image', title: localizedTitle, description: localizedDescription, ...(policy.origin ? { images: [policy.origin + '/og.png'] } : {}) },
    };
  };
}
