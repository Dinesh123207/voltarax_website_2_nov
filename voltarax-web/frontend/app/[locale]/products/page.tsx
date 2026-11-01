import { Link } from '@/i18n/navigation';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { LayoutDashboard, Sun, Bell, Leaf, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { useCopy } from '@/i18n/copy';


export const metadata: Metadata = {
  title: 'Products',
  description: 'VoltVision site monitoring and energy estimates, with further capabilities under development.',
};

const PRODUCTS = [
  { icon: LayoutDashboard, title: 'VoltVision dashboard', desc: 'Site readings, estimated current power, dated manual inspections and recorded maintenance, when services are configured.' },
  { icon: Sun, title: 'Coating records', desc: 'Manual area/condition/photo records with visible categorical rules. Material performance and numerical coating scores are unverified.' },
  { icon: Bell, title: 'Alerts and maintenance', desc: 'Persistent alert acknowledgement/resolution and work-order history require configured storage and authorized operators.' },
  { icon: Leaf, title: 'Energy and carbon reporting', desc: 'Evidence-backed PDFs require sufficient real recorded-power coverage and a reviewed emission factor/source. Missing evidence blocks generation.' },
];

export default function ProductsPage() {
  const copyText = useCopy();
  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="section-tag mx-auto w-fit">{copyText("Products")}</div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
              <span className="gradient-text">{copyText("The VoltVision platform")}</span></h1>
            <p className="text-slate-500 max-w-2xl mx-auto">{copyText("Site monitoring and estimates, with planned capabilities identified below.")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PRODUCTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="stat-card">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-green-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{copyText(title)}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{copyText(desc)}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/contact?type=demo" className="btn-green px-8 py-3.5">{copyText("Request a demo ")}<ChevronRight size={16} /></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
