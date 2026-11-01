import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Leaf, Globe, TrendingUp, Sun, Droplets, Wind, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';
import { useCopy } from '@/i18n/copy';


export const metadata: Metadata = {
  title: 'Sustainability — Voltarax',
  description: 'Voltarax monitoring and estimated carbon impact from available solar telemetry.',
};

const SDGs = [
  { num: '7',  title: 'Affordable Clean Energy',      desc: 'Solar monitoring supports energy awareness' },
  { num: '9',  title: 'Industry, Innovation',         desc: 'Deeptech for renewable energy infrastructure' },
  { num: '11', title: 'Sustainable Cities',           desc: 'Smart solar management for urban and peri-urban sites' },
  { num: '13', title: 'Climate Action', desc: 'Carbon estimates require recorded energy and emission-factor evidence; impact is unverified' },
  { num: '17', title: 'Partnerships for Goals', desc: 'An illustrative collaboration objective; no institutional affiliation is asserted' },
];

const BIO_COATING = [
  'Coating material performance is unverified',
  'Optical conversion requires independent measurements',
  'Material and environmental properties require independent verification',
  'Manual observations do not establish material chemistry or coating lifetime',
];

export default function SustainabilityPage() {
  const copyText = useCopy();
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-24">

        {/* Hero */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-green-950/20 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 text-center relative">
            <div className="section-tag mx-auto w-fit"><Leaf size={12} /> {copyText(" Sustainability")}</div>
            <h1 className="text-5xl font-black text-white mt-3 mb-5">
              <span className="gradient-text">{copyText("Review energy and carbon evidence")}</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {copyText("VoltVision is designed to monitor site telemetry and estimate carbon impact when real readings are available.")}</p>
          </div>
        </section>

        {/* Carbon analytics */}
        <section className="py-16 bg-[#111a14]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="section-tag"><TrendingUp size={12} /> {copyText(" Carbon Analytics")}</div>
                <h2 className="text-3xl font-bold text-white mt-2 mb-4">
                  {copyText("Estimated CO₂ Offset")}</h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  {copyText("VoltVision estimates CO₂ offset using available telemetry and a configurable grid factor. Results depend on sensor accuracy and the factor selected for the installation.")}</p>
                <div className="space-y-3">
                  {[
                    'Estimated CO₂ offset based on available readings',
                    'Reports require sufficient recorded coverage and emission-factor evidence',
                    'Illustrative tree equivalent; methodology requires validation',
                    'Savings estimates require an explicitly configured tariff; no guarantee is made',
                    'API endpoint: /api/carbon for direct integration',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      {copyText(item)}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <Link href="/dashboard/carbon" className="btn-outline text-sm py-2.5 px-5">
                    {copyText("Carbon Dashboard")}</Link>
                </div>
              </div>

              {/* Visual carbon card */}
              <div className="glass rounded-2xl p-6 border border-green-500/15">
                <div className="text-xs text-green-600 font-mono font-bold mb-4">{copyText("CARBON DASHBOARD")}</div>
                <p className="text-slate-400 text-sm">{copyText("Readings require authorized configured hardware. Reports refuse insufficient coverage, missing factor evidence and synthetic inputs; they do not certify carbon credits.")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bio-coating */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="glass rounded-2xl p-6 border border-green-500/15">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Leaf size={18} className="text-green-400" />
                </div>
                <div className="text-white font-bold">{copyText("Coating evidence limits")}</div>
              </div>
              <ul className="space-y-3">
                {BIO_COATING.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                    <div className="w-5 h-5 rounded bg-green-500/20 text-green-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-mono">
                      {copyText(i + 1)}
                    </div>
                    {copyText(item)}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="section-tag"><Leaf size={12} /> {copyText(" Coating records")}</div>
              <h2 className="text-3xl font-bold text-white mt-2 mb-4">
                {copyText("Observations with clear limits")}</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                {copyText("Coating composition, optical conversion and environmental performance require independent measurements. No material benefit is established here.")}</p>
              <p className="text-slate-400 leading-relaxed mb-6">
                {copyText("Dated manual observations, photos and visible categorical rules can support review. They do not establish coating lifetime, a chemical health score or avoided recoating waste.")}</p>
              <Link href="/technology" className="btn-green text-sm py-2.5 px-5">
                {copyText("Review inspection capabilities")}<ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* SDGs */}
        <section className="py-16 bg-[#111a14]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="section-tag mx-auto w-fit"><Globe size={12} /> {copyText(" Global Goals")}</div>
              <h2 className="text-3xl font-bold text-white mt-2">{copyText("UN Sustainable Development Goals")}</h2>
              <p className="text-slate-400 mt-2">{copyText("Illustrative project objectives; no affiliation or verified contribution is asserted.")}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {SDGs.map(({ num, title, desc }) => (
                <div key={num} className="stat-card text-center">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3 text-green-400 font-black text-xl">
                    {copyText(num)}
                  </div>
                  <div className="text-white font-semibold text-xs mb-2">{copyText(title)}</div>
                  <div className="text-slate-500 text-xs leading-relaxed">{copyText(desc)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
