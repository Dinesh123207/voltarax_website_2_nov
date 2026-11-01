'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, inr, ist } from '@/lib/commerce';
import type { Order } from '@/lib/commerce';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]), [error, setError] = useState(''), [loaded, setLoaded] = useState(false);
  useEffect(() => { let active = true; api<{ orders: Order[] }>('/commerce/orders').then(data => { if (active) { setOrders(data.orders); setLoaded(true); } }).catch(failure => { if (active) setError(failure.message); }); return () => { active = false; }; }, []);
  return <div className="space-y-5"><h1 className="text-3xl font-bold text-white">My test orders</h1><DataQualityBadge quality={loaded ? 'Calculated' : 'Unavailable'} />
    <p className="text-amber-300">Test transactions only. Latest 100 orders; no real funds or automatic site entitlement.</p>
    <Link href="/pricing" className="text-green-300 underline">View plans</Link>{error && <p role="alert" className="text-red-300">{error} <Link href="/login" className="underline">Sign in</Link></p>}
    {loaded && !orders.length && <p>No test orders recorded.</p>}
    {orders.map(row => <article key={row.id} className="stat-card space-y-2"><Link className="text-green-300 underline" href={'/account/orders/' + row.id}>{row.planSnapshot.name}</Link><p>{inr(row.amountPaise)} · {row.status.replaceAll('_', ' ')}</p><p className="text-sm text-slate-400 break-all">{row.id} · {ist(row.createdAt)}</p></article>)}
  </div>;
}
