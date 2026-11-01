import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HeroSection from '@/components/landing/HeroSection';
import {
  WhySection, CoatingSection, CapabilitiesSection, HowItWorksSection,
  ApplicationsSection, TeamSection, CtaSection,
} from '@/components/landing/LandingSections';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10">
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
