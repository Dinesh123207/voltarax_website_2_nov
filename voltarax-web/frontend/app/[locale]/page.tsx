import { pageMetadata } from '@/lib/seo';
import PublicStructuredData from '@/components/ui/PublicStructuredData';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FlowMedia from '@/components/landing/FlowMedia';
import SustainabilityVision from '@/components/landing/SustainabilityVision';
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
        <SustainabilityVision />
        <WhySection />
        <section className="max-w-3xl mx-auto px-5 py-12" aria-label="System flow"><FlowMedia variant="explainer"/></section>
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
