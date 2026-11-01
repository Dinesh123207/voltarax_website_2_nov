import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import CustomCursor from '@/components/ui/CustomCursor';
import ParticlesBg from '@/components/ui/ParticlesBg';
import SiteBackgroundVideo from '@/components/ui/SiteBackgroundVideo';
import ChatWidget from '@/components/chat/ChatWidget';

export const metadata: Metadata = {
  title: {
    default: 'Voltarax — Renewable Equipment Monitoring',
    template: '%s | Voltarax',
  },
  description:
    'Site telemetry, calculated health and current-condition energy estimates.',
  keywords: [
    'solar telemetry', 'equipment monitoring', 'solar panel management',
    'VoltVision', 'Voltarax', 'sustainable energy India',
    'IoT solar', 'maintenance records',
  ],
  authors:  [{ name: 'Voltarax' }],
  creator:  'Voltarax',
  openGraph: {
    type:        'website',
    locale:      'en_IN',
    url:         'https://voltarax.in',
    siteName:    'Voltarax',
    title:       'Voltarax — Renewable Equipment Monitoring',
    description: 'Site telemetry, dated inspections and current-condition estimates.',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Voltarax — Renewable Equipment Monitoring',
    description: 'Solar monitoring and energy estimates.',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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
