'use client';
import { useParams } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import OrderDetail from '@/components/commerce/OrderDetail';
export default function OrderPage() { const params = useParams<{ id: string }>(); return <><Navbar/><main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 pt-28 pb-16"><OrderDetail id={params.id}/></main></>; }
