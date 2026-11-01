'use client';
import { FormEvent, useEffect, useState } from 'react';
import { api, inr, ist, rupeesToPaise } from '@/lib/commerce';
import type { Plan, Order } from '@/lib/commerce';
import OrderDetail from './OrderDetail';
export default function AdminCommerce() {
  const [plans, setPlans] = useState<Plan[]>([]), [orders, setOrders] = useState<Order[]>([]), [selected, setSelected] = useState('');
  const [editing, setEditing] = useState<Plan | null>(null), [name, setName] = useState(''), [description, setDescription] = useState(''), [price, setPrice] = useState(''), [active, setActive] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [authorized, setAuthorized] = useState(false);
  const load = async () => {
    const [catalog, history] = await Promise.all([api<{ plans: Plan[] }>('/commerce/admin/plans'), api<{ orders: Order[] }>('/commerce/admin/orders')]);
    setPlans(catalog.plans); setOrders(history.orders); setAuthorized(true);
  };
  useEffect(() => { void load().catch(failure => setError(failure.message)); }, []);
  const edit = (plan: Plan | null) => {
    setEditing(plan); setName(plan?.name || ''); setDescription(plan?.description || ''); setActive(plan?.active || false);
    setPrice(plan?.pricePaise != null ? Math.floor(plan.pricePaise / 100) + '.' + String(plan.pricePaise % 100).padStart(2, '0') : ''); setMessage('');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/commerce/admin/plans' + (editing ? '/' + editing.id : ''), editing ? 'PATCH' : 'POST', { name, description, pricePaise: rupeesToPaise(price), active, ...(editing ? { version: editing.version } : {}) });
      edit(null); await load(); setMessage('Plan saved. Prices remain unset unless explicitly entered.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save plan.'); } finally { setBusy(false); }
  };
  return <div className="space-y-6"><h1 className="text-2xl font-bold text-white">Commerce administration</h1><p className="text-amber-300">TEST mode only. No seeded prices, recurring billing, real payments or automatic site access.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}{message && <p role="status" className="text-slate-300">{message}</p>}
    {authorized && <>
      <section className="stat-card space-y-4"><h2 className="text-xl font-semibold text-white">{editing ? 'Edit plan' : 'New plan'}</h2>
        <form onSubmit={save} className="space-y-4">
          <label className="block">Name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="input-field mt-1"/></label>
          <label className="block">Description<textarea maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} className="input-field mt-1"/></label>
          <label className="block">One-time price (INR) · leave blank to keep unset<input inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} className="input-field mt-1"/></label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/>Publish this plan in pricing</label>
          <p className="text-sm text-slate-400">Publishing an unpriced plan displays “Price unset” and blocks checkout. Set only an actual reviewed price. Concurrent edits require reloading the latest version.</p>
          <div className="flex flex-wrap gap-3"><button disabled={busy} className="btn-green disabled:opacity-50">Save plan</button>{editing && <button type="button" disabled={busy} className="btn-outline" onClick={() => edit(null)}>Cancel edit</button>}</div>
        </form>
      </section>
      <section className="stat-card space-y-3"><h2 className="text-xl font-semibold text-white">Plans · latest 200</h2>
        {!plans.length && <p>No plans stored.</p>}{plans.map(plan => <div key={plan.id} className="flex flex-wrap justify-between gap-3 border-t border-slate-700 pt-3"><p>{plan.name} · {inr(plan.pricePaise)} · {plan.active ? 'Published' : 'Hidden'} · Version {plan.version}</p><button className="btn-outline" onClick={() => edit(plan)}>Edit {plan.name}</button></div>)}
      </section>
      <section className="stat-card space-y-3"><h2 className="text-xl font-semibold text-white">Orders · latest 100</h2><button disabled={busy} className="btn-outline" onClick={() => void load().catch(failure => setError(failure.message))}>Refresh orders</button>
        {!orders.length && <p>No orders recorded.</p>}{orders.map(row => <article key={row.id} className="border-t border-slate-700 pt-3 space-y-2"><p>{row.planSnapshot.name} · {inr(row.amountPaise)} · {row.status.replaceAll('_', ' ')}</p><p className="break-all text-sm text-slate-400">Buyer {row.userId} · Order {row.id} · {ist(row.createdAt)}</p><button className="btn-outline" onClick={() => setSelected(row.id)}>Review order {row.id.slice(0, 8)}</button></article>)}
      </section>
      {selected && <OrderDetail key={selected} id={selected} admin/>}
    </>}
  </div>;
}
