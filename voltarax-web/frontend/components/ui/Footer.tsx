import Link from 'next/link';
import { Zap, Mail, MapPin, Phone, Github, Linkedin, Twitter } from 'lucide-react';

const FOOTER_LINKS = {
  Products: [
    { label: 'VoltVision AI',        href: '/products' },
    { label: 'BFCI Technology',      href: '/technology#bfci' },
    { label: 'Computer Vision',      href: '/technology#cv' },
    { label: 'Energy Forecasting',   href: '/technology#lstm' },
    { label: 'Digital Twin',         href: '/technology#twin' },
  ],
  Company: [
    { label: 'About Us',    href: '/about' },
    { label: 'Our Team',    href: '/about#team' },
    { label: 'Contact',     href: '/contact' },
  ],
  Resources: [
    { label: 'Technology',    href: '/technology' },
    { label: 'Sustainability', href: '/sustainability' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-green-900/20 bg-[#0a0f0d]">
      {/* Green glow top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-7 mb-7">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-black" />
              </div>
              <span className="font-bold text-white text-xl">Voltarax</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-4">
              AI for bio-coated solar panels.
              Site telemetry and current-condition estimates.
            </p>

            {/* Contact info */}
            <div className="space-y-2">
              {[
                { icon: MapPin, text: 'Jaipur, Rajasthan, India', href: undefined as string | undefined },
                ...(process.env.NEXT_PUBLIC_CONTACT_EMAIL ? [{ icon: Mail, text: process.env.NEXT_PUBLIC_CONTACT_EMAIL, href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}` }] : []),
                ...(process.env.NEXT_PUBLIC_CONTACT_PHONE ? [{ icon: Phone, text: process.env.NEXT_PUBLIC_CONTACT_PHONE, href: undefined }] : []),
              ].map(({ icon: Icon, text, href }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-400">
                  <Icon size={13} className="text-green-500 flex-shrink-0" />
                  {href
                    ? <a href={href} className="hover:text-green-400 transition-colors">{text}</a>
                    : <span>{text}</span>
                  }
                </div>
              ))}
            </div>

            {/* Socials */}
            <div className="flex gap-3 mt-4">
              {[
                { icon: Github,   href: 'https://github.com/Dinesh123207/voltarax' },
                { icon: Linkedin, href: '#' },
                { icon: Twitter,  href: '#' },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-green-900/40 rounded-lg flex items-center justify-center text-slate-400 hover:text-green-400 hover:border-green-500/40 transition-all"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-white font-semibold text-sm mb-3">{heading}</h4>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-400 text-sm hover:text-green-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-green-900/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Voltarax. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-green-600 font-mono">
              Solar monitoring under development
            </span>
            <span className="text-slate-600 text-xs">·</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
