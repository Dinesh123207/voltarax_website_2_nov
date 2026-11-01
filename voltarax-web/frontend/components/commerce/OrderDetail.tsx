'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { api, inr, ist, rupeesToPaise } from '@/lib/commerce';
import type { OrderDetails, Order, Checkout } from '@/lib/commerce';
import { checkoutConstructor } from '@/lib/checkout';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
const failureText = (failure: unknown) => failure instanceof Error ? failure.message : 'Request unavailable.';
export default function OrderDetail({ id, admin = false }: { id: string; admin?: boolean }) {
  const [data, setData] = useState<OrderDetails | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setError(''); try { setData(await api<OrderDetails>('/commerce/orders/' + id)); } catch (failure) { setData(null); setError(failureText(failure)); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  const pay = async () => {
    if (!data || admin) return;
    setBusy(true); setError(''); setMessage(''); let opened = false;
    try {
      const response = await api<{ order: Order; checkout: Checkout | null; mode: string }>('/commerce/orders', 'POST', { planId: data.order.planId, planVersion: data.order.planSnapshot.version, requestKey: data.order.requestKey });
      const options = response.checkout;
      if (response.mode !== 'test' || response.order.id !== id || !options || !/^rzp_test_[A-Za-z0-9]+$/.test(options.key) || options.amount !== data.order.amountPaise || options.currency !== 'INR' || options.order_id !== data.order.gatewayOrderId) throw Error('No matching test checkout is available. Refresh order status.');
      const Constructor = await checkoutConstructor();
      const instance = new Constructor({ ...options, name: 'Voltarax (TEST)', description: data.order.planSnapshot.name,
        modal: { ondismiss: () => { setBusy(false); setMessage('Checkout closed. Refresh to check the signed payment confirmation.'); } },
        handler: async value => {
          try { const result = await api<{ message: string }>('/commerce/orders/' + id + '/verify', 'POST', value); setMessage(result.message); await load(); }
          catch (failure) { setError(failureText(failure)); } finally { setBusy(false); }
        } });
      instance.on('payment.failed', () => setMessage('Test payment was not confirmed. Review the checkout or close it, then refresh this order.'));
      instance.open(); opened = true;
    } catch (failure) { setError(failureText(failure)); } finally { if (!opened) setBusy(false); }
  };
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold text-white">Test order</h1><DataQualityBadge quality={data ? 'Calculated' : 'Unavailable'} />
    <p className="text-amber-300">Test mode only. No real funds, automatic site access or delivery established.</p>
    <div className="flex flex-wrap gap-4"><Link href="/account/orders" className="text-green-300 underline">My orders</Link><button onClick={() => void load()} disabled={busy} className="btn-outline disabled:opacity-50">Refresh status</button></div>
    {error && <p role="alert" className="text-red-300">{error}</p>}{message && <p role="status" className="text-slate-300">{message}</p>}
    {data && <>
      <section className="stat-card space-y-3"><h2 className="text-xl text-white font-semibold">{data.order.planSnapshot.name}</h2><p>{data.order.planSnapshot.description}</p>
        <p className="text-2xl text-green-300">{inr(data.order.amountPaise)} · one-time</p><p>Status: {data.order.status.replaceAll('_', ' ')}</p>
        <p className="text-sm text-slate-400 break-all">Order {data.order.id}<br/>Gateway order {data.order.gatewayOrderId || 'Unavailable'}<br/>Created {ist(data.order.createdAt)}<br/>Capture confirmed {ist(data.order.paidAt)}</p>
        {data.order.callbackVerifiedAt && <p className="text-sm text-slate-300">Browser signature verified {ist(data.order.callbackVerifiedAt)}. This alone does not confirm capture.</p>}
        {['creating', 'creation_unknown', 'review_required'].includes(data.order.status) && <p className="text-amber-300">Administrator review required. Do not create another order because the gateway response is uncertain. Preserve this order reference.</p>}
        {data.order.status === 'pending' && !admin && <><p className="text-sm text-slate-300">Opening test checkout loads Razorpay. Use only its official test payment instructions; do not enter real payment details.</p><button disabled={busy} onClick={() => void pay()} className="btn-green disabled:opacity-50">Continue test checkout · {inr(data.order.amountPaise)}</button></>}
      </section>
      <section className="stat-card space-y-3"><h2 className="text-lg text-white font-semibold">Test receipt / invoice</h2>
        {data.invoice ? <><a className="text-green-300 underline" href={'/api/commerce/orders/' + id + '/invoice.pdf'}>Download test invoice PDF</a><p className="break-all text-sm text-slate-400">SHA-256: {data.invoice.sha256}</p></> : <p>Unavailable until a verified captured-payment webhook is recorded.</p>}
        <p className="text-sm text-slate-400">GST details unavailable. This is not a tax invoice or evidence of real payment.</p>
      </section>
      <section className="stat-card space-y-3"><h2 className="text-lg text-white font-semibold">Refund records</h2>
        <p>Confirmed test refunds: {data.payment ? inr(data.payment.refundedPaise) : 'Unavailable'}</p>
        <p className="text-sm text-slate-400">Latest 100 records. Requested/submitted is a manual record; only a signed processed event confirms a refund.</p>
        {data.refunds.map(row => <div key={row.id} className="border-t border-slate-700 pt-3"><p>{inr(row.amountPaise)} · {row.status}</p><p className="text-sm text-slate-400 break-all">{row.note}<br/>{row.gatewayRefundId || 'Gateway reference unavailable'}</p></div>)}
        {!data.refunds.length && <p>No refund records.</p>}
      </section>
      {admin && <AdminActions data={data} reload={load} />}
    </>}
  </div>;
}
function AdminActions({ data, reload }: { data: OrderDetails; reload: () => Promise<void> }) {
  const [gatewayId, setGatewayId] = useState(''), [reconcileConfirm, setReconcileConfirm] = useState(false);
  const [amount, setAmount] = useState(''), [note, setNote] = useState(''), [refundKey, setRefundKey] = useState(''), [refundConfirm, setRefundConfirm] = useState(false);
  const [references, setReferences] = useState<Record<string, string>>({}), [recordConfirm, setRecordConfirm] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const action = async (work: () => Promise<unknown>) => { setBusy(true); setError(''); try { await work(); await reload(); } catch (failure) { setError(failureText(failure)); } finally { setBusy(false); } };
  const requestRefund = (event: FormEvent) => {
    event.preventDefault();
    void action(async () => {
      const amountPaise = rupeesToPaise(amount); if (amountPaise == null) throw Error('Enter a refund amount.');
      const requestId = refundKey || crypto.randomUUID(); setRefundKey(requestId);
      await api('/commerce/admin/orders/' + data.order.id + '/refunds', 'POST', { requestId, amountPaise, note, confirm: refundConfirm });
      setRefundKey(''); setAmount(''); setNote(''); setRefundConfirm(false);
    });
  };
  return <section className="stat-card space-y-5"><h2 className="text-xl text-white font-semibold">Administrator test actions</h2>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {['creating', 'creation_unknown'].includes(data.order.status) && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void action(() => api('/commerce/admin/orders/' + data.order.id + '/reconcile', 'POST', { gatewayOrderId: gatewayId, confirm: reconcileConfirm })); }}>
      <p className="text-sm text-slate-300">Find this local order UUID as the receipt in Razorpay TEST Orders. The server checks the test order; it cannot infer captured payment from an order fetch.</p>
      <label className="block">Matching test gateway order ID<input required value={gatewayId} onChange={event => setGatewayId(event.target.value)} className="input-field mt-1" placeholder="order_…"/></label>
      <label className="flex items-center gap-2"><input required type="checkbox" checked={reconcileConfirm} onChange={event => setReconcileConfirm(event.target.checked)}/>I reviewed the matching TEST receipt and amount.</label>
      <button disabled={busy} className="btn-outline">Reconcile test order</button>
    </form>}
    {data.order.status === 'paid' && <form onSubmit={requestRefund} className="space-y-3 border-t border-slate-700 pt-4">
      <h3 className="text-white font-semibold">Request manual test refund</h3><p className="text-sm text-slate-300">This records a request only. A separate reviewed action in the Razorpay TEST dashboard is required; this app does not call a refund API.</p>
      <label className="block">Refund amount (INR)<input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className="input-field mt-1"/></label>
      <label className="block">Reason<textarea required maxLength={2000} value={note} onChange={event => setNote(event.target.value)} className="input-field mt-1"/></label>
      <label className="flex items-center gap-2"><input required type="checkbox" checked={refundConfirm} onChange={event => setRefundConfirm(event.target.checked)}/>I reviewed the intended TEST refund and unreserved amount.</label>
      <button disabled={busy} className="btn-outline">Record manual request</button>
    </form>}
    {data.refunds.some(row => ['requested', 'submitted'].includes(row.status)) && <div className="space-y-4 border-t border-slate-700 pt-4">
      <label className="flex items-center gap-2"><input type="checkbox" checked={recordConfirm} onChange={event => setRecordConfirm(event.target.checked)}/>I reviewed these manual TEST dashboard actions.</label>
      {data.refunds.filter(row => ['requested', 'submitted'].includes(row.status)).map(row => <div key={row.id} className="space-y-2">
        <label className="block">Refund reference for {inr(row.amountPaise)}<input disabled={row.status === 'submitted'} value={row.gatewayRefundId || references[row.id] || ''} onChange={event => setReferences(previous => ({ ...previous, [row.id]: event.target.value }))} className="input-field mt-1" placeholder="rfnd_…"/></label>
        <div className="flex flex-wrap gap-3">{row.status === 'requested' && <button disabled={busy || !recordConfirm || !references[row.id]} className="btn-outline" onClick={() => void action(() => api('/commerce/admin/orders/' + data.order.id + '/refunds/' + row.id, 'PATCH', { status: 'submitted', gatewayRefundId: references[row.id], confirm: recordConfirm }))}>Record submitted reference</button>}
          <button disabled={busy || !recordConfirm} className="btn-outline" onClick={() => void action(() => api('/commerce/admin/orders/' + data.order.id + '/refunds/' + row.id, 'PATCH', { status: 'rejected', confirm: recordConfirm }))}>Reject request record</button></div>
      </div>)}
    </div>}
  </section>;
}
