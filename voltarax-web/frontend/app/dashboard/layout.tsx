'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Zap, LayoutDashboard, Sun, Bell, Wrench,
  TestTube, Battery, Leaf, Users, Settings,
  LogOut, Menu, X, ChevronRight, ExternalLink,
} from 'lucide-react';

const NAV = [
  { label: 'Overview',       href: '/dashboard',              icon: LayoutDashboard },
  { label: 'Panels',         href: '/dashboard/panels',       icon: Sun },
  { label: 'AI Forecast',    href: '/dashboard/forecast',     icon: Zap },
  { label: 'BFCI Coating',   href: '/dashboard/bfci',         icon: TestTube },
  { label: 'CV Inspection',  href: '/dashboard/cv',           icon: Zap },
  { label: 'Alerts',         href: '/dashboard/alerts',       icon: Bell },
  { label: 'Work Orders',    href: '/dashboard/work-orders',  icon: Wrench },
  { label: 'Energy Relay',   href: '/dashboard/relay',        icon: Battery },
  { label: 'Carbon Impact',  href: '/dashboard/carbon',       icon: Leaf },
  { label: 'Users',          href: '/dashboard/users',        icon: Users },
  { label: 'Settings',       href: '/dashboard/settings',     icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const router     = useRouter();
  const [sideOpen, setSideOpen] = useState(false);
  const [user,     setUser]     = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('vv_token');
    const stored = localStorage.getItem('vv_user');
    if (!token) { router.replace('/login'); return; }
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.removeItem('vv_user'); }
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('vv_token');
    localStorage.removeItem('vv_user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex">

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#111a14] border-r border-green-900/20 flex flex-col transition-transform duration-300 ${
        sideOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>

        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-green-900/20">
          <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-black" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Voltarax Solar Intelligence</div>
            <div className="text-[9px] text-green-600 font-mono leading-none">Hardware-ready · Live</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSideOpen(false)}
              className={`nav-link ${pathname === href ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {pathname === href && <ChevronRight size={13} className="ml-auto text-green-500" />}
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
              <div className="text-white text-xs font-semibold truncate">{user?.name || 'Admin'}</div>
              <div className="text-slate-500 text-[10px] truncate">{user?.role || 'admin'}</div>
            </div>
            <button onClick={logout} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sideOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSideOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="h-14 bg-[#111a14]/80 backdrop-blur border-b border-green-900/20 flex items-center gap-3 px-4 sticky top-0 z-20">
          <button
            onClick={() => setSideOpen(!sideOpen)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
          >
            {sideOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb */}
          <div className="text-slate-400 text-sm hidden sm:flex items-center gap-1">
            <Link href="/" className="hover:text-green-400 transition-colors">Voltarax</Link>
            <ChevronRight size={13} />
            <span className="text-white">
              {NAV.find(n => n.href === pathname)?.label || 'Dashboard'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-green-600 font-mono">
              <div className="live-dot" />
              LIVE
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
