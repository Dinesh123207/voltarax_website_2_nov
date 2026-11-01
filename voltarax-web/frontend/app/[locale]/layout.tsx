import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Toaster } from 'react-hot-toast';
import SiteBackgroundVideo from '@/components/ui/SiteBackgroundVideo';
import SkipToContent from '@/components/ui/SkipToContent';
import ChatWidget from '@/components/chat/ChatWidget';

export const metadata: Metadata = { title: { default: 'Voltarax', template: '%s | Voltarax' }, robots: { index: false, follow: false, noarchive: true } };

export const viewport: Viewport = {
  themeColor: '#22c55e',
};

export function generateStaticParams() { return routing.locales.map(locale => ({ locale })); }
export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  return (
    <html lang={locale} className="dark">
      <body className="bg-[#0a0f0d] text-slate-200 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
        <SkipToContent />
        {process.env.NEXT_PUBLIC_BACKGROUND_VIDEO_ENABLED === 'true' && <SiteBackgroundVideo />}
        {children}
        <ChatWidget />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111a14',
              color: '#e2e8f0',
              border: '1px solid #1e3020',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#000' } },
          }}
        />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
