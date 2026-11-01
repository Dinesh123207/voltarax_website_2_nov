import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Shield, Users, BookOpen, Zap, MapPin, GraduationCap, Building2 } from 'lucide-react';
import AvatarImage from '@/components/ui/AvatarImage';
import LogoBadge from '@/components/ui/LogoBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Voltarax Private Limited',
  description: 'Learn about Voltarax — the team behind AI for bio-coated solar panels, our research and our mission for sustainable energy.',
};

// photo: served from public/team/<file> if present (see public/team/README.md);
// falls back to the gradient initial badge automatically when it isn't.
const TEAM = [
  { name: 'Shubhika', role: 'Founder & Managing Director', dept: 'Leadership', focus: 'Company direction and renewable-energy innovation', avatar: 'S', color: 'from-green-500 to-emerald-600', photo: '/team/shubhika.jpg' },
  { name: 'Dinesh Kumar', role: 'Team Member', dept: 'Technology', focus: 'AI, software and cybersecurity', avatar: 'D', color: 'from-blue-500 to-cyan-600', photo: '/team/dinesh-kumar.jpg' },
  { name: 'Pradeep Patel', role: 'Team Member', dept: 'Technology', focus: 'Engineering and product development', avatar: 'P', color: 'from-purple-500 to-violet-600', photo: '/team/pradeep-patel.jpg' },
  { name: 'Rohan', role: 'Team Member', dept: 'Team', focus: 'Product and execution', avatar: 'R', color: 'from-amber-500 to-orange-600', photo: '/team/rohan.jpg' },
  { name: 'Manodeep', role: 'Team Member', dept: 'Team', focus: 'Product and execution', avatar: 'M', color: 'from-cyan-500 to-teal-600', photo: '/team/manodeep.jpg' },
  { name: 'Dr. Jai Gopal Sharma', role: 'Mentor & Startup Advisor', dept: 'Advisory', focus: 'Mentorship and startup guidance', avatar: 'J', color: 'from-rose-500 to-pink-600', photo: '/team/jai-gopal-sharma.jpg' },
];

// logo: served from public/partners/ or public/clients/ if present; falls
// back to a plain text wordmark automatically when it isn't (see the
// README.md in each of those folders for exact filenames).
const INCUBATION = { name: 'Institutional details under review', logo: '' };
const CLIENTS: { name: string; short: string; logo: string }[] = [];

const PATENTS = [
  {
    number: 'Information on request',
    title:  'Protected innovations',
    claim:  'Intellectual property details are available on request.',
    status: 'Under review',
    year:   '',
  },
];

const MILESTONES = [
  { year: 'Research', event: 'BioSolar coating research' },
  { year: 'Development', event: 'VoltVision software development' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-24">

        {/* Hero */}
        <section className="py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-green-950/20 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 relative">
            <div className="section-tag mx-auto w-fit"><Users size={12} /> About Us</div>
            <h1 className="text-5xl font-black text-white mt-3 mb-5">
              Powering a{' '}
              <span className="gradient-text">Sustainable Future</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Voltarax Private Limited is a deeptech startup from Delhi, India —
              building AI-integrated BioSolar energy management systems.
              developing a monitoring platform for renewable-energy applications.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Zap,     title: 'Mission',  text: 'Make solar energy smarter through AI — reducing waste, predicting failures, and maximising every watt of clean power generated.' },
              { icon: Shield,  title: 'Vision',   text: 'Become India\'s leading AI-solar intelligence platform, deployed across commercial and agricultural solar installations.' },
              { icon: BookOpen,title: 'Research', text: 'Publish IEEE-grade research on BFCI spectral analysis, RL-based energy management, and bio-coating degradation modelling.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="stat-card text-center">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-green-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section id="team" className="py-16 bg-[#111a14]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="section-tag mx-auto w-fit"><Users size={12} /> Core Team</div>
              <h2 className="text-3xl font-bold text-white mt-2">The Inventors</h2>
              <p className="text-slate-500 mt-2">The team working on Voltarax</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {TEAM.map(member => (
                <div key={member.name} className="stat-card text-center group">
                  <AvatarImage src={member.photo} alt={member.name} initial={member.avatar} colorClass={member.color} size={64} />
                  <h3 className="text-white font-bold text-lg">{member.name}</h3>
                  <div className="text-green-500 text-sm font-semibold mt-1 mb-1">{member.role}</div>
                  <div className="flex items-center gap-1 justify-center text-slate-500 text-xs mb-3">
                    <GraduationCap size={11} /> {member.dept}
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">{member.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Incubation */}
        <section id="incubation" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="section-tag mx-auto w-fit"><Building2 size={12} /> Incubation Partner</div>
            <h2 className="text-3xl font-bold text-white mt-2 mb-8">Institutional information</h2>
          <div className="flex justify-center">
            <LogoBadge src={INCUBATION.logo} name={INCUBATION.name} />
          </div>
        </section>

        {/* High-value clients */}
        <section id="clients" className="py-16 bg-[#111a14]/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="section-tag mx-auto w-fit"><Users size={12} /> Institutions &amp; Clients</div>
            <h2 className="text-3xl font-bold text-white mt-2 mb-2">Institutions and clients</h2>
            <p className="text-slate-500 mb-8">Public partnership details are under review.</p>
            <div className="flex flex-wrap justify-center gap-4">
              {CLIENTS.map(c => <LogoBadge key={c.short} src={c.logo} name={c.short} />)}
              <div className="h-16 px-6 flex items-center justify-center rounded-xl border border-dashed border-green-900/40 text-slate-500 text-sm">
                Others coming soon
              </div>
            </div>
          </div>
        </section>

        {/* Patents */}
        <section id="patents" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="section-tag mx-auto w-fit"><Shield size={12} /> Intellectual Property</div>
            <h2 className="text-3xl font-bold text-white mt-2">Patents</h2>
          </div>
          <div className="space-y-5 max-w-4xl mx-auto">
            {PATENTS.map((pat, i) => (
              <div key={i} className="stat-card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-700" />
                <div className="pl-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="font-mono text-green-500 text-sm font-bold">{pat.number}</div>
                    <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      pat.status === 'Filed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {pat.status} · {pat.year}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">{pat.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{pat.claim}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 bg-[#111a14]/40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="section-tag mx-auto w-fit">📅 Journey</div>
              <h2 className="text-3xl font-bold text-white mt-2">Milestones</h2>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-green-900/50" />
              <div className="space-y-6">
                {MILESTONES.map((m, i) => (
                  <div key={i} className="flex gap-6 relative">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <div className="pb-2">
                      <div className="text-green-500 text-xs font-mono font-bold mb-0.5">{m.year}</div>
                      <div className="text-slate-300 text-sm">{m.event}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="py-16 text-center">
          <div className="max-w-xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-slate-400 mb-4">
              <MapPin size={16} className="text-green-500" />
              <span>Jaipur, Rajasthan, India</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Want to <span className="gradient-text">collaborate</span>?
            </h2>
            <p className="text-slate-500 mb-8">
              We're open to research partnerships, investment discussions,
              and enterprise deployments.
            </p>
            <a href="/contact" className="btn-green px-8 py-3.5">
              Get in Touch
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
