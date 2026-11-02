'use client';
import DataActivityNotice from '@/components/ui/DataActivityNotice';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api, inr, ist } from '@/lib/commerce';
import type { Order } from '@/lib/commerce';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import { useCopy } from '@/i18n/copy';

export default function Orders() {
  const copyText = useCopy();
  const [orders, setOrders] = useState<Order[]>([]), [error, setError] = useState(''), [loaded, setLoaded] = useState(false);
  useEffect(() => { let active = true; api<{ orders: Order[] }>('/commerce/orders').then(data => { if (active) { setOrders(data.orders); setLoaded(true); } }).catch(failure => { if (active) setError(failure.message); }); return () => { active = false; }; }, []);
  return <div className="space-y-5"><DataActivityNotice/><h1 className="text-3xl font-bold text-white">{copyText("My test orders")}</h1><DataQualityBadge quality={loaded ? 'Calculated' : 'Unavailable'} />
    <p className="text-amber-300">{copyText("Test transactions only. Latest 100 orders; no real funds or automatic site entitlement.")}</p>
    <Link href="/pricing" className="text-green-300 underline">{copyText("View plans")}</Link>{copyText(error && <p role="alert" className="text-red-300">{copyText(error)} <Link href="/login" className="underline">{copyText("Sign in")}</Link></p>)}
    {copyText(loaded && !orders.length && <p>{copyText("No test orders recorded.")}</p>)}
    {orders.map(row => <article key={row.id} className="stat-card space-y-2"><Link className="text-green-300 underline" href={'/account/orders/' + row.id}>{row.planSnapshot.name}</Link><p>{copyText(inr(row.amountPaise))} · {copyText(row.status.replaceAll('_', ' '))}</p><p className="text-sm text-slate-400 break-all">{row.id} · {copyText(ist(row.createdAt))}</p></article>)}
  </div>;
}
