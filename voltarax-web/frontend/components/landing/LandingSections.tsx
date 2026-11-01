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
    { big: '~⅓',   text: 'of incoming sunlight is wasted by conventional silicon panels.' },
    { big: 'UV',   text: 'is invisible to standard cells — a coating can convert it into usable light.' },
    { big: 'Waste', text: 'Fruit-peel waste is abundant and cheap — a useful input, not a disposal problem.' },
  ];
  return (
    <section id="why" className="relative py-28 bg-[#0a0f0d]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="Why it matters" title="Sunlight is abundant." accent="Most of it is wasted." sub="Rajasthan is one of the sunniest regions in India — an excellent resource that ordinary panels still leave largely unused." />
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
    { n: '01', title: 'Collect & process', text: 'Fruit-peel waste is dried and processed into a fluorescent material.' },
    { n: '02', title: 'Formulate & coat',  text: 'The material is formulated into a coating and applied to the panel surface.' },
    { n: '03', title: 'Sense & monitor',   text: 'Coating monitoring is planned and requires additional measurements.' },
  ];
  return (
    <section id="coating" className="relative py-28 bg-[#111a14]/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="The coating" title="Waste becomes a" accent="UV-to-visible converter" sub="Natural compounds in fruit peels absorb ultraviolet light and re-emit it as visible light that silicon cells can use." />
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
    { icon: TrendingUp, title: 'Generation forecasting', text: 'Provides a current-condition estimate; weather-ahead forecasts are planned.' },
    { icon: Zap,        title: 'Energy optimisation',    text: 'Coming soon: energy dispatch control.' },
    { icon: ShieldAlert,title: 'Predictive maintenance', text: 'Site-level sensor rules and anomaly detection flag unusual readings.' },
    { icon: Activity,   title: 'Environmental monitoring', text: 'Temperature, humidity, light and air quality in one picture.' },
    { icon: Eye,        title: 'Computer vision',        text: 'Coming soon: camera inspection.' },
    { icon: Boxes,      title: 'Digital twin',           text: 'Coming soon: a virtual replica.' },
    { icon: Cpu,        title: 'Autonomous control',     text: 'Coming soon: automated relay control.' },
    { icon: Leaf,       title: 'Carbon analytics',       text: 'Estimates CO₂ offset from readings; ESG reports are coming soon.' },
  ];
  return (
    <section id="ai" className="relative py-28 bg-[#0a0f0d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="AI capabilities" title="Monitoring and" accent="planned capabilities" sub="Current site-level monitoring and planned features are shown below." />
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
    { icon: Cloud,           name: 'Cloud',     title: 'Analytics and model improvement',    text: 'History is stored and models keep improving as more data builds up.' },
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
    { icon: Tent,      title: 'Remote & off-grid', text: 'Fewer site visits and earlier fault warnings where access is difficult.' },
    { icon: Sun,       title: 'Defence & disaster relief', text: 'Reliable, efficient generation where infrastructure is limited.' },
    { icon: Building2, title: 'Building-integrated PV', text: 'Higher yield from limited roof and façade area.' },
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
  const TEAM = [
    { name: 'Shubhika', role: 'Founder & Managing Director' },
    { name: 'Dinesh Kumar', role: 'Team Member' },
    { name: 'Pradeep Patel', role: 'Team Member' },
    { name: 'Rohan', role: 'Team Member' },
    { name: 'Manodeep', role: 'Team Member' },
    { name: 'Dr. Jai Gopal Sharma', role: 'Mentor & Startup Advisor' },
  ];
  return (
    <section id="team" className="relative py-24 bg-[#07110b] overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-grid" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading tag="People" title="The team behind" accent="Voltarax" />
        <p className="text-slate-500 max-w-2xl mb-10">A multidisciplinary team building practical technology for the renewable-energy transition.</p>
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
