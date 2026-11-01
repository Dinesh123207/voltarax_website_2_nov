import Link from 'next/link';
import {
  TrendingUp, Zap, ShieldAlert, Activity, Eye, Boxes, Cpu, Leaf,
  Radio, Server, Cloud, LayoutDashboard, ChevronRight, Sun, Building2, Tent, Users,
} from 'lucide-react';

function Heading({ tag, title, accent, sub }: { tag: string; title: string; accent?: string; sub?: string }) {
  return (
    <div className="text-center mb-14 max-w-2xl mx-auto">
      <div className="section-tag mx-auto w-fit">{tag}</div>
      <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-3">
        {title} {accent && <span className="gradient-text">{accent}</span>}
      </h2>
      {sub && <p className="text-slate-500">{sub}</p>}
    </div>
  );
}

/* 1 ── Why it matters ─────────────────────────────────────────────────────── */
export function WhySection() {
  const FIGS = [
    { big: 'Read', text: 'Distinguish recorded sensor readings from estimates and missing inputs.' },
    { big: 'Review', text: 'Keep dated manual observations and photos for equipment areas.' },
    { big: 'Track', text: 'Maintain alert and work-order history when storage is configured.' },
  ];
  return (
    <section id="why" className="relative py-28 bg-[#0a0f0d]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="Why monitoring matters" title="Understand recorded" accent="equipment behavior." sub="Measurements, estimates and missing inputs are distinguished so operators can review their basis." />
        <div className="grid md:grid-cols-3 gap-6">
          {FIGS.map((f) => (
            <div key={f.big} className="stat-card text-center py-10">
              <div className="text-5xl font-black gradient-text mb-3">{f.big}</div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 2 ── Coating process ────────────────────────────────────────────────────── */
export function CoatingSection() {
  const STEPS = [
    { n: '01', title: 'Record an observation', text: 'Choose an equipment area and enter its actual observation time and condition.' },
    { n: '02', title: 'Attach a photo', text: 'Save an authorized camera snapshot or equipment photo with notes.' },
    { n: '03', title: 'Review dated records', text: 'Compare manual observations. Categorical rules are visible; no physical coating score is inferred.' },
  ];
  return (
    <section id="coating" className="relative py-28 bg-[#111a14]/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="Coating records" title="Document actual" accent="observations" sub="Manual inspection records do not establish optical conversion, material performance or coating lifetime. Those research claims remain unverified." />
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="stat-card relative overflow-hidden">
              <div className="absolute -right-2 -top-4 text-7xl font-black text-green-500/10 font-mono">{s.n}</div>
              <div className="relative">
                <div className="text-green-500 text-xs font-mono font-bold mb-2">STEP {s.n}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 3 ── Eight AI capabilities ──────────────────────────────────────────────── */
export function CapabilitiesSection() {
  const CAPS = [
    { icon: TrendingUp, title: 'Current power estimates', text: 'Fresh inputs can support a current-condition estimate. Future weather forecasts remain unavailable.' },
    { icon: Zap,        title: 'Energy optimisation',    text: 'Coming soon: energy dispatch control.' },
    { icon: ShieldAlert,title: 'Alerts and maintenance', text: 'Sensor rules and validated unusual-pattern estimates can support review; stored work orders track operator actions.' },
    { icon: Activity, title: 'Environmental readings', text: 'Configured sensors report light, temperature and humidity; airborne dust is an estimate and calibration is unverified.' },
    { icon: Eye, title: 'Camera and manual inspection', text: 'Configured camera proxy and dated manual photo records. Automatic ML classification is unavailable.' },
    { icon: Boxes,      title: 'Digital twin',           text: 'Coming soon: a virtual replica.' },
    { icon: Cpu, title: 'Relay command review', text: 'Authorized commands and device acknowledgements require configured hardware. Physical contact feedback is unavailable; autonomous dispatch is coming soon.' },
    { icon: Leaf, title: 'Energy and carbon reports', text: 'Recorded energy and estimated carbon require coverage and factor evidence. Report generation refuses insufficient or synthetic data.' },
  ];
  return (
    <section id="ai" className="relative py-28 bg-[#0a0f0d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="Software capabilities" title="Monitoring and" accent="planned capabilities" sub="Availability depends on authorized hardware, storage and service configuration. Field performance is not established by the software alone." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CAPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="stat-card group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <Icon size={18} className="text-green-400" />
                  </div>
                  <span className="text-xs font-mono text-slate-600">0{i + 1}</span>
                </div>
                <h3 className="text-white font-semibold mb-1.5">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 4 ── How it works ───────────────────────────────────────────────────────── */
export function HowItWorksSection() {
  const LAYERS = [
    { icon: Radio,           name: 'Sense',     title: 'Site-level sensors', text: 'Site-level electrical and environmental readings can be collected from connected hardware.' },
    { icon: Server,          name: 'Edge',      title: 'On-site display',                    text: 'The Raspberry Pi reference dashboard can analyze readings fetched from the API.' },
    { icon: Cloud, name: 'History', title: 'Analytics and candidate evaluation', text: 'Model candidates are evaluated on later held-out inputs. More data does not guarantee better performance; a candidate may be rejected.' },
    { icon: LayoutDashboard, name: 'Dashboard', title: 'One view for operators',             text: 'Access telemetry, calculated health and estimates; additional features are planned.' },
  ];
  return (
    <section id="how" className="relative py-28 bg-[#111a14]/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="How it works" title="From sensor" accent="to screen" />
        <div className="relative">
          <div className="absolute left-5 top-2 bottom-2 w-px bg-green-900/50" />
          <div className="space-y-8">
            {LAYERS.map(({ icon: Icon, name, title, text }) => (
              <div key={name} className="flex gap-6 relative">
                <div className="w-10 h-10 rounded-full bg-[#0a0f0d] border border-green-500/40 flex items-center justify-center flex-shrink-0 z-10">
                  <Icon size={16} className="text-green-400" />
                </div>
                <div className="pb-2">
                  <div className="text-green-500 text-xs font-mono font-bold uppercase tracking-wider mb-0.5">{name}</div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 5 ── Applications ───────────────────────────────────────────────────────── */
export function ApplicationsSection() {
  const APPS = [
    { icon: Tent, title: 'Remote and off-grid', text: 'A proposed application; communications, equipment and field reliability require site-specific verification.' },
    { icon: Sun,       title: 'Defence & disaster relief', text: 'A proposed application where field reliability still requires validation.' },
    { icon: Building2, title: 'Building-integrated PV', text: 'A proposed application for limited roof and façade area.' },
  ];
  return (
    <section id="applications" className="relative py-28 bg-[#0a0f0d]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="Applications" title="Where it" accent="fits" sub="Places where every watt and every maintenance visit counts." />
        <div className="grid md:grid-cols-3 gap-6">
          {APPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="stat-card">
              <Icon size={22} className="text-green-400 mb-4" />
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 6 ── Team ───────────────────────────────────────────────────────────────── */
export function TeamSection() {
  const TEAM: { name: string; role: string }[] = [];
  return (
    <section id="team" className="relative py-24 bg-[#07110b] overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-grid" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="People" title="The team behind" accent="Voltarax" />
        <p className="text-slate-400 max-w-2xl mb-10">Team and affiliation details are coming soon, pending publication review. No unverified founder, advisor or institutional claim is made here.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAM.map((m, i) => (
            <div key={m.name} className={`stat-card group ${i === 5 ? 'border-emerald-400/20 bg-emerald-400/[.03]' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-400/5 border border-green-500/20 flex items-center justify-center text-emerald-300 text-lg font-black group-hover:scale-105 transition-transform">
                  {m.name.split(' ').map(x => x[0]).slice(0,2).join('')}
                </div>
                <div>
                  <h3 className="text-white font-bold">{m.name}</h3>
                  <div className="text-green-400 text-sm mt-1">{m.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 7 ── CTA ────────────────────────────────────────────────────────────────── */
export function CtaSection() {
  return (
    <section className="relative py-28 overflow-hidden bg-[#0a0f0d]">
      <div className="absolute inset-0 bg-gradient-to-r from-green-950/40 via-green-900/20 to-green-950/40" />
      <div className="relative max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to go <span className="gradient-text">sustainable</span>?</h2>
        <p className="text-slate-500 mb-8">Talk to the team about a pilot, a partnership or a demo.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/contact?type=demo" className="btn-green px-10 py-4 text-base">Schedule a demo <ChevronRight size={18} /></Link>
          <Link href="/login" className="btn-outline px-10 py-4 text-base">Sign in</Link>
        </div>
      </div>
    </section>
  );
}
