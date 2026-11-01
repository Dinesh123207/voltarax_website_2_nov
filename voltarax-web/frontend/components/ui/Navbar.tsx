'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Zap, ChevronRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home',        href: '/' },
  { label: 'Products',    href: '/products' },
  { label: 'Pricing',     href: '/pricing' },
  { label: 'Technology',  href: '/technology' },
  { label: 'Sustainability', href: '/sustainability' },
  { label: 'About',       href: '/about' },
  { label: 'Contact',     href: '/contact' },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0a0f0d]/90 backdrop-blur-xl border-b border-green-900/30 shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
                <Zap size={16} className="text-black" />
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight">Voltarax</span>
                <div className="text-[10px] text-green-500 font-mono leading-none">
                  Powering a Sustainable Future
                </div>
              </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden xl:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === link.href
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden xl:flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                Dashboard
              </Link>
              <Link
                href="/contact?type=demo"
                className="btn-green text-sm py-2 px-4"
              >
                Request Demo <ChevronRight size={14} />
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="xl:hidden p-2 text-slate-400 hover:text-white"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0f0d]/98 backdrop-blur-xl pt-16 xl:hidden">
          <div className="flex flex-col gap-1 p-4">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  pathname === link.href
                    ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-green-900/30 flex flex-col gap-3">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-center text-slate-300 hover:text-white rounded-xl hover:bg-white/5 font-medium">
                Dashboard
              </Link>
              <Link href="/contact?type=demo" onClick={() => setMenuOpen(false)}
                className="btn-green justify-center">
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
