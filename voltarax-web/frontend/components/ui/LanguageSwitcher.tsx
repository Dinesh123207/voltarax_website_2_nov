'use client';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
export default function LanguageSwitcher() {
  const locale = useLocale(), t = useTranslations('Locale'), pathname = usePathname(), router = useRouter();
  return <label className="flex items-center gap-2 text-xs text-slate-200">
    <span className="sr-only">{t('language')}</span>
    <select aria-label={t('language')} value={locale} className="bg-[#111a14] border border-slate-500 rounded px-2 py-2 text-sm"
      onChange={event => router.replace(pathname + window.location.search + window.location.hash, { locale: event.target.value, scroll: false })}>
      <option value="en">English</option><option value="hi">हिन्दी</option>
    </select>
  </label>;
}
