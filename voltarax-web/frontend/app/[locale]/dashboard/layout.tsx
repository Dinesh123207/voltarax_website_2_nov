'use client';
import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import type { DataQuality } from '@/components/ui/DataQualityBadge';
import ISTClock from '@/components/ui/ISTClock';
import { useCopy } from '@/i18n/copy';
import {
  Zap, LayoutDashboard, Sun, Bell, Wrench,
  TestTube, Battery, Leaf, Users, Settings,
  LogOut, Menu, X, ChevronRight, ExternalLink,
} from 'lucide-react';

const NAV = [
  { label: 'Overview',       href: '/dashboard',              icon: LayoutDashboard },
  { label: 'Panels',         href: '/dashboard/panels',       icon: Sun },
  { label: 'Power estimates',    href: '/dashboard/forecast',     icon: Zap },
  { label: 'Coating inspections',   href: '/dashboard/bfci',         icon: TestTube },
  { label: 'Camera inspections',  href: '/dashboard/cv',           icon: Zap },
  { label: 'Alerts',         href: '/dashboard/alerts',       icon: Bell },
  { label: 'Work Orders',    href: '/dashboard/work-orders',  icon: Wrench },
  { label: 'Energy Relay',   href: '/dashboard/relay',        icon: Battery },
  { label: 'Carbon Impact',  href: '/dashboard/carbon',       icon: Leaf },
  { label: 'Users',          href: '/dashboard/users',        icon: Users },
  { label: 'Devices',        href: '/dashboard/devices',      icon: Settings },
  { label: 'Settings',       href: '/dashboard/settings',     icon: Settings },
  { label: 'My test orders', href: '/account/orders', icon: Settings },
  { label: 'Commerce admin', href: '/dashboard/commerce', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const copyText = useCopy();
  const c = useCopy();
  const pathname   = usePathname();
  const router     = useRouter();
  const [sideOpen, setSideOpen] = useState(false);
  const [user,     setUser]     = useState<any>(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const [siteAccess, setSiteAccess] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const sectionQuality: DataQuality = ['/dashboard/bfci', '/dashboard/cv', '/dashboard/work-orders'].includes(pathname)
    ? 'Unavailable' : ['/dashboard/panels', '/dashboard/forecast', '/dashboard/carbon'].includes(pathname) ? 'Estimated' : 'Calculated';

  useEffect(() => {
    fetch('/health').then(response => response.json()).then(data => setTestMode(data.testMode === true)).catch(() => {});
    localStorage.removeItem('vv_token');
    localStorage.removeItem('vv_user');
    let active = true;
    fetch('/api/auth/me').then(async response => {
      if (!response.ok) { router.replace('/login'); return; }
      const data = await response.json();
      if (active) { setUser(data.user); setSiteAccess(data.siteAccess === true); }
    }).catch(() => router.replace('/login'));
    return () => { active = false; };
  }, [router]);

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-voltarax-request': '1' } });
      if (response.ok || response.status === 401) router.replace('/login');
      else setSessionMessage('Unable to sign out. Please try again.');
    } catch { setSessionMessage('Server unavailable. Please try signing out again.'); }
  };

  if (!user) return <p role="status" className="p-8 text-slate-300">{c('Checking your session…')}</p>;

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex">

      {/* Sidebar */}
      {copyText(sessionMessage && <p role="alert" className="fixed bottom-2 right-2 z-50 bg-slate-900 p-3 text-white">{copyText(sessionMessage)}</p>)}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#111a14] border-r border-green-900/20 flex flex-col transition-transform duration-300 ${
        sideOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>

        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-green-900/20">
          <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-black" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">{copyText("Voltarax Solar Intelligence")}</div>
            <div className="text-[9px] text-green-600 font-mono leading-none">{copyText("Site monitoring")}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.filter(item => item.href !== '/dashboard/commerce' || user.role === 'admin').map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSideOpen(false)}
              className={`nav-link ${pathname === href ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{c(label)}</span>
              {copyText(pathname === href && <ChevronRight size={13} className="ml-auto text-green-500" />)}
            </Link>
          ))}
        </nav>

        {/* VoltVision live link */}
        {/* User */}
        <div className="p-3 border-t border-green-900/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 text-sm font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name || 'Account'}</div>
              <div className="text-slate-500 text-[10px] truncate">{copyText(user?.role || 'Unavailable')}</div>
            </div>
            <button onClick={logout} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {copyText(sideOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSideOpen(false)}
        />
      ))}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="h-14 bg-[#111a14]/80 backdrop-blur border-b border-green-900/20 flex items-center gap-3 px-4 sticky top-0 z-20">
          <button
            onClick={() => setSideOpen(!sideOpen)}
            aria-label={c(sideOpen ? 'Close dashboard navigation' : 'Open dashboard navigation')}
            aria-expanded={sideOpen}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
          >
            {copyText(sideOpen ? <X size={20} /> : <Menu size={20} />)}
          </button>

          {/* Breadcrumb */}
          <div className="text-slate-400 text-sm hidden sm:flex items-center gap-1">
            <Link href="/" className="hover:text-green-400 transition-colors">{copyText("Voltarax")}</Link>
            <ChevronRight size={13} />
            <span className="text-white">
              {c(NAV.find(n => n.href === pathname)?.label || 'Dashboard')}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ISTClock />
            <div className="hidden md:flex items-center gap-2 text-xs text-green-600 font-mono">
              {copyText(testMode && <span className="text-amber-300">{c('Test data')}</span>)}
              {c('Dashboard')}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{c('Section data:')}</span><DataQualityBadge quality={sectionQuality} />
            <span>{c('Individual readings are labelled where their quality differs. Missing data is unavailable.')}</span>
          </div>
          {copyText(siteAccess || pathname === '/dashboard/settings' ? children : <p role="status" className="stat-card text-slate-300">{copyText("Site data is Unavailable. Ask an administrator to assign access to this site. You can still manage your password in Settings.")}</p>)}
        </main>
      </div>
    </div>
  );
}
