import { pageMetadata } from '@/lib/seo';
import PublicStructuredData from '@/components/ui/PublicStructuredData';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HeroSection from '@/components/landing/HeroSection';
import {
  WhySection, CoatingSection, CapabilitiesSection, HowItWorksSection,
  ApplicationsSection, TeamSection, CtaSection,
} from '@/components/landing/LandingSections';

export const generateMetadata = pageMetadata('/', 'Voltarax — Renewable Equipment Monitoring', 'Site telemetry, calculated health and current-condition energy estimates.');
export default function HomePage() {
  return (
    <>
      <PublicStructuredData />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative z-10">
        <HeroSection />
        <WhySection />
        <CoatingSection />
        <CapabilitiesSection />
        <HowItWorksSection />
        <ApplicationsSection />
        <TeamSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
