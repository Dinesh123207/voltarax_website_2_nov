'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import { api, ist, type AlertRecord, type WorkOrder } from '@/lib/operations';
import { Notice, useOperator } from './Shared';
export default function WorkOrders() {
  const operator = useOperator(); const [records, setRecords] = useState<WorkOrder[] | null>(null), [filter, setFilter] = useState('open');
  const [alerts, setAlerts] = useState<AlertRecord[]>([]), [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [alertId, setAlertId] = useState(''), [title, setTitle] = useState(''), [description, setDescription] = useState(''), [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState(''), [due, setDue] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setRecords(await api<WorkOrder[]>(`/work-orders?limit=100${filter ? `&status=${filter}` : ''}`)); setMessage(''); } catch (error) { setRecords(null); setMessage((error as Error).message); } }, [filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!operator) return;
    Promise.all([api<AlertRecord[]>('/alerts?limit=100'), api<{ id: string; name: string }[]>('/work-orders/assignees')]).then(async ([rows, people]) => {
      setAssignees(people); const selected = new URLSearchParams(window.location.search).get('alert');
      if (selected && /^[A-Za-z0-9_-]{1,128}$/.test(selected)) { const row = await api<AlertRecord>(`/alerts/${selected}`); setAlerts(rows.some(a => a.id === row.id) ? rows : [row, ...rows]); setAlertId(row.id); }
      else setAlerts(rows);
    }).catch(error => setMessage(error.message));
  }, [operator]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const row = await api<WorkOrder>('/work-orders', 'POST', { alertId, title, description, priority, assigneeId: assigneeId || null, dueAt: due ? new Date(`${due}T00:00:00+05:30`).toISOString() : null }); window.location.assign(`/dashboard/work-orders/${row.id}`); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">Work orders</h1><p className="text-sm text-slate-400">Saved maintenance records linked to observed issues.</p><DataQualityBadge quality={records ? 'Calculated' : 'Unavailable'}/></div><button className="btn-outline" disabled={busy} onClick={load}>Refresh</button></div><Notice message={message}/>
    <label className="block text-sm text-slate-300">Status<select className="input-dark mt-1" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All</option>{['open', 'in_progress', 'closed'].map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select></label>
    <p className="text-xs text-slate-500">{records ? `${records.length} records shown (up to 100)` : 'Unavailable'}</p>
    {records?.map(row => <article key={row.id} className="stat-card space-y-2"><h2 className="font-semibold text-white"><Link className="underline" href={`/dashboard/work-orders/${row.id}`}>{row.title}</Link></h2><p className="text-sm text-slate-400">{row.status.replace('_', ' ')} · {row.priority} priority</p><p className="text-xs text-slate-500">Due: {ist(row.dueAt)} · Created: {ist(row.createdAt)}</p><DataQualityBadge quality={row.simulated ? 'Estimated' : 'Calculated'}/></article>)}
    {records?.length === 0 && <p className="text-slate-400">No matching saved work orders.</p>}
    {operator && <form className="stat-card space-y-3" onSubmit={create}><h2 className="font-semibold text-white">Create from an alert</h2><label className="block text-sm text-slate-300">Alert<select required className="input-dark mt-1" value={alertId} onChange={e => setAlertId(e.target.value)}><option value="">Choose an alert</option>{alerts.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label><label className="block text-sm text-slate-300">Title<input required maxLength={160} className="input-dark mt-1" value={title} onChange={e => setTitle(e.target.value)}/></label><label className="block text-sm text-slate-300">Work description<textarea required maxLength={2000} className="input-dark mt-1" value={description} onChange={e => setDescription(e.target.value)}/></label><label className="block text-sm text-slate-300">Priority<select className="input-dark mt-1" value={priority} onChange={e => setPriority(e.target.value)}>{['low', 'medium', 'high', 'critical'].map(v => <option key={v}>{v}</option>)}</select></label><label className="block text-sm text-slate-300">Assigned to<select className="input-dark mt-1" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{assignees.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="block text-sm text-slate-300">Due date (IST)<input type="date" className="input-dark mt-1" value={due} onChange={e => setDue(e.target.value)}/></label><button className="btn-green" disabled={busy || !alertId}>Create work order</button></form>}
  </div>;
}
