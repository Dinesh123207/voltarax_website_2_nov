import { pageMetadata } from '@/lib/seo';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Brain, Eye, TrendingUp, ShieldAlert, Boxes, Cpu } from 'lucide-react';
import { useCopy } from '@/i18n/copy';


export const generateMetadata = pageMetadata("/technology", "Technology", "Site monitoring, current-condition estimates, manual inspections and recorded maintenance.");

const MODULES = [
  { icon: Brain, title: 'Manual coating records', desc: 'Dated area/photo/condition observations with visible categorical rules. Numerical coating score and material performance are unavailable.' },
  { icon: Eye, title: 'Camera inspection', desc: 'Authorized proxy, snapshots and manual records require a configured camera and storage. Automatic classification remains unavailable.' },
  { icon: TrendingUp,  title: 'Generation forecasting', desc: 'Current-condition estimates are available when sufficient telemetry exists; weather-ahead forecasts are not yet connected.' },
  { icon: ShieldAlert, title: 'Maintenance review', desc: 'Site-level sensor rules and unusual-pattern estimates support review, with persistent alerts/work orders. They do not confirm a physical fault.' },
  { icon: Boxes,       title: 'Digital twin',          desc: 'Coming soon: digital twin.' },
  { icon: Cpu,         title: 'Adaptive control',      desc: 'Coming soon: automated energy control.' },
];

export default function TechnologyPage() {
  const copyText = useCopy();
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative z-10 pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="section-tag mx-auto w-fit"><Cpu size={12} /> {copyText(" Technology")}</div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
              <span className="gradient-text">{copyText("Software for equipment review")}</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
              {copyText("Site readings and manual records support review when hardware and services are configured. Individual-panel sensing and autonomous energy dispatch remain planned. Field performance is unverified.")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="stat-card group">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-green-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{copyText(title)}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{copyText(desc)}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-600 text-xs mt-10">
            {copyText("Technical detail is shared with partners on request. Public intellectual-property statements are under review.")}</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
