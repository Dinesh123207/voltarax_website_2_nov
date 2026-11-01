'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, inr } from '@/lib/commerce';
import type { Plan, Order } from '@/lib/commerce';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
export default function Catalog() {
  const [plans, setPlans] = useState<Plan[]>([]), [enabled, setEnabled] = useState(false), [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('Loading plans…'), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<{ plans: Plan[]; checkout_enabled: boolean; message: string }>('/commerce/plans').then(data => {
      if (active) { setPlans(data.plans); setEnabled(data.checkout_enabled); setMessage(data.message); setLoaded(true); }
    }).catch(failure => { if (active) { setError(failure.message); setMessage('Plans are unavailable.'); } });
    return () => { active = false; };
  }, []);
  const purchase = async (plan: Plan) => {
    setBusy(true); setError('');
    try {
      const session = await fetch('/api/auth/me', { cache: 'no-store' });
      if (session.status === 401) { window.location.assign('/login'); return; }
      if (!session.ok) throw Error('Verify your account before checkout.');
      const previous = await api<{ orders: Order[] }>('/commerce/orders');
      const pending = previous.orders.find(row => row.planId === plan.id && ['pending', 'creating', 'creation_unknown', 'review_required'].includes(row.status));
      if (pending) { window.location.assign('/account/orders/' + pending.id); return; }
      const storageKey = 'voltarax-checkout-' + plan.id + '-' + plan.version;
      let requestKey = sessionStorage.getItem(storageKey);
      if (!requestKey) { requestKey = crypto.randomUUID(); sessionStorage.setItem(storageKey, requestKey); }
      const data = await api<{ order: Order }>('/commerce/orders', 'POST', { planId: plan.id, planVersion: plan.version, requestKey });
      window.location.assign('/account/orders/' + data.order.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Checkout unavailable. Check your orders before trying again.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold text-white">Plans and pricing</h1>
    <p className="text-amber-300">Test mode only · one-time purchases · no recurring billing or real funds.</p>
    <DataQualityBadge quality={loaded ? 'Calculated' : 'Unavailable'} />
    <p className="text-slate-300">{message}</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <Link href="/account/orders" className="text-green-300 underline">My test orders</Link>
    {loaded && !plans.length && <p className="stat-card">Plans are coming soon. No products or prices have been published.</p>}
    <div className="grid gap-5 md:grid-cols-2">{plans.map(plan => <section key={plan.id} className="stat-card space-y-4">
      <h2 className="text-xl font-semibold text-white">{plan.name}</h2><p className="text-slate-300 whitespace-pre-wrap">{plan.description}</p>
      <p className="text-2xl text-green-300">{inr(plan.pricePaise)}</p><DataQualityBadge quality={plan.pricePaise == null ? 'Unavailable' : 'Calculated'} />
      <p className="text-sm text-slate-400">One-time purchase. Payment does not automatically grant site access or establish delivery.</p>
      <button disabled={!enabled || plan.pricePaise == null || busy} onClick={() => void purchase(plan)} className="btn-green disabled:opacity-50">{plan.pricePaise == null ? 'Checkout blocked: price unset' : 'Review test order'}</button>
    </section>)}</div>
    <p className="text-sm text-slate-400">GST invoicing is unavailable. A test receipt is issued only after a verified captured-payment webhook. Review the plan and price before continuing.</p>
  </div>;
}
