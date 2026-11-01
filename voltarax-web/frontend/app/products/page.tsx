import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { LayoutDashboard, Sun, Bell, Leaf, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products',
  description: 'VoltVision AI — the monitoring and optimisation platform for bio-coated solar panels.',
};

const PRODUCTS = [
  { icon: LayoutDashboard, title: 'VoltVision dashboard', desc: 'Site-level telemetry, calculated health and estimated generation, with planned work orders and energy flow.' },
  { icon: Sun,             title: 'Bio-coating solution',  desc: 'A fruit-peel-waste fluorescent coating that turns UV light into usable visible light, with coating monitoring planned.' },
  { icon: Bell,            title: 'Alerts and maintenance', desc: 'Site-level warnings are available; persistent work orders are coming soon.' },
  { icon: Leaf,            title: 'Carbon reporting',      desc: 'Calculates an estimated CO₂ offset from available generation data; downloadable reports are coming soon.' },
];

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="section-tag mx-auto w-fit">Products</div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
              The <span className="gradient-text">VoltVision</span> platform
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto">Everything needed to run a bio-coated solar installation intelligently.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PRODUCTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="stat-card">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-green-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/contact?type=demo" className="btn-green px-8 py-3.5">Request a demo <ChevronRight size={16} /></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
