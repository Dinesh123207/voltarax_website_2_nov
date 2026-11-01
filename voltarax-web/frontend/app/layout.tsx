import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import CustomCursor from '@/components/ui/CustomCursor';
import ParticlesBg from '@/components/ui/ParticlesBg';
import SiteBackgroundVideo from '@/components/ui/SiteBackgroundVideo';
import ChatWidget from '@/components/chat/ChatWidget';

export const metadata: Metadata = {
  title: {
    default: 'Voltarax — AI-Integrated BioSolar Energy Platform',
    template: '%s | Voltarax',
  },
  description:
    'AI for bio-coated solar panels: monitoring, forecasting and smarter energy use.',
  keywords: [
    'biosolar', 'AI energy', 'solar panel management',
    'VoltVision', 'Voltarax', 'sustainable energy India',
    'IoT solar', 'predictive maintenance solar',
  ],
  authors:  [{ name: 'Voltarax Private Limited' }],
  creator:  'Voltarax Private Limited',
  openGraph: {
    type:        'website',
    locale:      'en_IN',
    url:         'https://voltarax.in',
    siteName:    'Voltarax',
    title:       'Voltarax — AI-Integrated BioSolar Energy Platform',
    description: 'AI for bio-coated solar panels.',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Voltarax — AI-Integrated BioSolar Energy Platform',
    description: 'Solar monitoring and energy estimates.',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0f0d] text-slate-200 antialiased">
        <SiteBackgroundVideo />
        <CustomCursor />
        <ParticlesBg />
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
      </body>
    </html>
  );
}
