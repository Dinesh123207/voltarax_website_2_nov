import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import Catalog from '@/components/commerce/Catalog';
export const metadata = { title: 'Plans and pricing', description: 'Published one-time plans. Test-mode checkout only; unset prices block purchase.' };
export default function PricingPage() { return <><Navbar/><main className="mx-auto max-w-5xl px-4 pt-28 pb-16"><Catalog/></main><Footer/></>; }
