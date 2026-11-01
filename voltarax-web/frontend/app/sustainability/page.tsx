import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Leaf, Globe, TrendingUp, Sun, Droplets, Wind, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sustainability — Voltarax',
  description: 'Voltarax\'s commitment to sustainable energy — carbon offsetting, ESG reporting, and the environmental impact of AI-optimised BioSolar systems.',
};

const IMPACT = [
  { icon: Leaf,       value: '0.82',   unit: 'kg CO₂/kWh', label: 'India Grid Emission Factor',   color: 'text-green-400' },
  { icon: Sun,        value: '5–7',    unit: 'kWh/m²/day', label: 'Jaipur Solar Irradiance',     color: 'text-yellow-400' },
  { icon: Globe,      value: '21.77',  unit: 'kg CO₂',     label: 'CO₂ per Tree per Year',       color: 'text-blue-400'  },
  { icon: TrendingUp, value: '7.5',    unit: '₹/kWh',      label: 'Avg Grid Electricity Cost',   color: 'text-purple-400'},
];

const SDGs = [
  { num: '7',  title: 'Affordable Clean Energy',      desc: 'AI optimisation maximises every watt of solar generation' },
  { num: '9',  title: 'Industry, Innovation',         desc: 'Deeptech for renewable energy infrastructure' },
  { num: '11', title: 'Sustainable Cities',           desc: 'Smart solar management for urban and peri-urban sites' },
  { num: '13', title: 'Climate Action',               desc: 'Real-time CO₂ offset tracking and ESG reporting' },
  { num: '17', title: 'Partnerships for Goals',       desc: 'Collaboration with research institutions and solar developers' },
];

const BIO_COATING = [
  'Made from fruit-peel waste — a natural UV absorber',
  'Converts UV light into visible light the cells can use',
  'Bio-degradable, non-toxic and locally sourced',
  'AI tracks coating condition so it is refreshed only when needed',
];

export default function SustainabilityPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-24">

        {/* Hero */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-green-950/20 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 text-center relative">
            <div className="section-tag mx-auto w-fit"><Leaf size={12} /> Sustainability</div>
            <h1 className="text-5xl font-black text-white mt-3 mb-5">
              Powering a <span className="gradient-text">Greener India</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Every VoltVision-managed panel is monitored, optimised, and carbon-tracked
              in real time. We don't just generate clean energy — we prove it.
            </p>
          </div>
        </section>

        {/* Impact numbers */}
        <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {IMPACT.map(({ icon: Icon, value, unit, label, color }) => (
              <div key={label} className="stat-card text-center">
                <Icon size={20} className={`${color} mx-auto mb-3`} />
                <div className={`text-3xl font-counter font-bold ${color}`}>{value}</div>
                <div className="text-xs text-green-600 font-mono mb-1">{unit}</div>
                <div className="text-slate-500 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Carbon analytics */}
        <section className="py-16 bg-[#111a14]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="section-tag"><TrendingUp size={12} /> Carbon Analytics</div>
                <h2 className="text-3xl font-bold text-white mt-2 mb-4">
                  Real-Time CO₂ Offset Tracking
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  VoltVision AI calculates CO₂ offset in real time using India's
                  Central Electricity Authority emission factor (0.82 kg CO₂/kWh, 2024).
                  Every kWh generated is logged, every kilogram of CO₂ avoided is tracked.
                </p>
                <div className="space-y-3">
                  {[
                    'Live CO₂ offset per 30-second reading interval',
                    'Daily / monthly / annual ESG report generation',
                    'Trees equivalent calculation (21.77 kg CO₂/tree/year)',
                    'Grid savings in ₹ at current electricity tariff',
                    'API endpoint: /api/carbon for direct integration',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <Link href="/dashboard/carbon" className="btn-outline text-sm py-2.5 px-5">
                    Carbon Dashboard
                  </Link>
                </div>
              </div>

              {/* Visual carbon card */}
              <div className="glass rounded-2xl p-6 border border-green-500/15">
                <div className="text-xs text-green-600 font-mono font-bold mb-4">CARBON DASHBOARD PREVIEW</div>
                <div className="space-y-4">
                  {[
                    { label: 'Sample daily generation',  value: '~24 kWh', sub: '32 panels · Jaipur site' },
                    { label: 'Sample CO₂ offset',    value: '~19.7 kg', sub: 'At 0.82 kg/kWh factor' },
                    { label: 'Trees Equivalent',     value: '~0.9/day', sub: '328/year projected' },
                    { label: 'Sample grid savings',         value: '~₹180/day', sub: 'At ₹7.5/kWh tariff' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-green-900/20 last:border-0">
                      <div>
                        <div className="text-slate-300 text-sm">{label}</div>
                        <div className="text-slate-600 text-xs">{sub}</div>
                      </div>
                      <div className="text-green-400 font-counter font-bold text-sm">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-slate-600">
                  * Projected values based on Jaipur 5–7 kWh/m²/day irradiance
                </div>
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
                <div className="text-white font-bold">Bio-Coating Composition</div>
              </div>
              <ul className="space-y-3">
                {BIO_COATING.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                    <div className="w-5 h-5 rounded bg-green-500/20 text-green-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-mono">
                      {i + 1}
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="section-tag"><Leaf size={12} /> Bio Innovation</div>
              <h2 className="text-3xl font-bold text-white mt-2 mb-4">
                Nature-Derived Panel Coating
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Our bio-fluorescent coating is made from fruit-peel waste —
                abundantly available in Rajasthan — acting as a natural UV absorber. Fully biodegradable. Zero toxic chemicals.
              </p>
              <p className="text-slate-400 leading-relaxed mb-6">
                Our AI monitors coating health,
                predicting when recoating is needed — eliminating both
                premature recoating waste and efficiency-loss from overdue coats.
              </p>
              <Link href="/technology" className="btn-green text-sm py-2.5 px-5">
                BFCI Technology Deep Dive <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* SDGs */}
        <section className="py-16 bg-[#111a14]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="section-tag mx-auto w-fit"><Globe size={12} /> Global Goals</div>
              <h2 className="text-3xl font-bold text-white mt-2">UN Sustainable Development Goals</h2>
              <p className="text-slate-500 mt-2">VoltVision AI contributes to 5 SDGs</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {SDGs.map(({ num, title, desc }) => (
                <div key={num} className="stat-card text-center">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3 text-green-400 font-black text-xl">
                    {num}
                  </div>
                  <div className="text-white font-semibold text-xs mb-2">{title}</div>
                  <div className="text-slate-500 text-xs leading-relaxed">{desc}</div>
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
