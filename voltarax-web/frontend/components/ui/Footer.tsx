import { Link } from '@/i18n/navigation';
import { Zap, Mail, MapPin, Phone, Github, Linkedin, Twitter } from 'lucide-react';
import { useCopy } from '@/i18n/copy';

const FOOTER_LINKS = [
  { heading: 'Platform', links: [{ label: 'Monitoring', href: '/products' }, { label: 'Technology', href: '/technology' }, { label: 'Pricing', href: '/pricing' }] },
  { heading: 'Project', links: [{ label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }, { label: 'Sustainability', href: '/sustainability' }] },
  { heading: 'Account', links: [{ label: 'Sign in', href: '/login' }, { label: 'My test orders', href: '/account/orders' }] },
];
function publicHttps(value: string | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export default function Footer() {
  const copyText = useCopy();
  const socials = [
    { icon: Github, label: 'GitHub', href: publicHttps(process.env.NEXT_PUBLIC_GITHUB_URL) },
    { icon: Linkedin, label: 'LinkedIn', href: publicHttps(process.env.NEXT_PUBLIC_LINKEDIN_URL) },
    { icon: Twitter, label: 'X', href: publicHttps(process.env.NEXT_PUBLIC_X_URL) },
  ];
  return <footer className="relative border-t border-green-900/20 bg-[#0a0f0d]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-7 mb-7">
        <div className="lg:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white"><Zap size={20} aria-hidden="true"/>{copyText("Voltarax")}</Link>
          <p className="text-slate-300 text-sm max-w-xs">{copyText("Site telemetry, current-condition estimates and dated maintenance records. Hardware and service configuration required.")}</p>
          <div className="space-y-2 text-sm text-slate-300">
            {copyText(process.env.NEXT_PUBLIC_CONTACT_LOCATION && <p className="flex gap-2"><MapPin size={16} aria-hidden="true"/>{copyText(process.env.NEXT_PUBLIC_CONTACT_LOCATION)}</p>)}
            {process.env.NEXT_PUBLIC_CONTACT_EMAIL && <a className="flex gap-2 underline" href={'mailto:' + process.env.NEXT_PUBLIC_CONTACT_EMAIL}><Mail size={16} aria-hidden="true"/>{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a>}
            {process.env.NEXT_PUBLIC_CONTACT_PHONE && <p className="flex gap-2"><Phone size={16} aria-hidden="true"/>{process.env.NEXT_PUBLIC_CONTACT_PHONE}</p>}
          </div>
          <div className="flex gap-3">{socials.filter(item => item.href).map(({ icon: Icon, label, href }) => <a key={label} href={href!} aria-label={copyText(label)} target="_blank" rel="noopener noreferrer" className="p-2 border border-slate-600 rounded"><Icon size={18} aria-hidden="true"/></a>)}</div>
        </div>
        {FOOTER_LINKS.map(({ heading, links }) => <div key={heading}><h2 className="font-semibold text-white mb-3">{copyText(heading)}</h2><ul className="space-y-2">{links.map(link => <li key={link.href}><Link className="text-sm text-slate-300 hover:text-green-300" href={link.href}>{copyText(link.label)}</Link></li>)}</ul></div>)}
      </div>
      <p className="border-t border-slate-700 pt-4 text-xs text-slate-400">{copyText("© Voltarax. Software under development; field performance unverified.")}</p>
    </div>
  </footer>;
}
