import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Brain, Eye, TrendingUp, ShieldAlert, Boxes, Cpu } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology',
  description: 'How VoltVision AI monitors, predicts and optimises bio-coated solar panels.',
};

const MODULES = [
  { icon: Brain,       title: 'Coating intelligence',  desc: 'Coming soon: coating condition tracking requires dedicated measurements.' },
  { icon: Eye,         title: 'Visual inspection',     desc: 'Coming soon: web-based camera inspection is not connected.' },
  { icon: TrendingUp,  title: 'Generation forecasting', desc: 'Current-condition estimates are available when sufficient telemetry exists; weather-ahead forecasts are not yet connected.' },
  { icon: ShieldAlert, title: 'Predictive maintenance', desc: 'Site-level sensor rules and anomaly detection can flag unusual readings; per-panel fault prediction is not yet connected.' },
  { icon: Boxes,       title: 'Digital twin',          desc: 'Coming soon: digital twin.' },
  { icon: Cpu,         title: 'Adaptive control',      desc: 'Coming soon: automated energy control.' },
];

export default function TechnologyPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="section-tag mx-auto w-fit"><Cpu size={12} /> Technology</div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
              AI built for <span className="gradient-text">bio-coated solar</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Site-level sensor readings can inform monitoring and estimates. Individual-panel sensing, camera inspection and automated control are planned.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="stat-card group">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-green-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-600 text-xs mt-10">
            Technical detail is shared with partners on request. Aspects of the technology are patent-pending.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
