import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({ locales: ['en', 'hi'], defaultLocale: 'en', localePrefix: 'as-needed', localeDetection: true, alternateLinks: false,
  localeCookie: { name: 'VOLTARAX_LOCALE', sameSite: 'lax', maxAge: 31536000 } });
