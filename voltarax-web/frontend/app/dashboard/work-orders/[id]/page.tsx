'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import { api, ist, type WorkOrder } from '@/lib/operations';
import { EventHistory, Notice, useOperator } from '@/components/operations/Shared';
export default function WorkOrderDetail() {
  const id = useParams<{ id: string }>().id; const operator = useOperator();
  const [record, setRecord] = useState<WorkOrder | null>(null), [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState(''), [note, setNote] = useState(''), [comment, setComment] = useState(''), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('open'), [assignee, setAssignee] = useState(''), [priority, setPriority] = useState('medium'), [due, setDue] = useState('');
  const load = useCallback(async () => {
    try { const row = await api<WorkOrder>(`/work-orders/${encodeURIComponent(id)}`); setRecord(row); setStatus(row.status); setAssignee(row.assigneeId || ''); setPriority(row.priority); setDue(row.dueAt ? new Date(new Date(row.dueAt).getTime() + 330 * 60000).toISOString().slice(0, 10) : ''); setMessage(''); }
    catch (error) { setRecord(null); setMessage((error as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (operator) api<{ id: string; name: string }[]>('/work-orders/assignees').then(setPeople).catch(error => setMessage(error.message)); }, [operator]);
  async function save(event: FormEvent, isComment = false) {
    event.preventDefault(); if (!record) return; setBusy(true);
    try { if (isComment) { await api(`/work-orders/${record.id}/comments`, 'POST', { note: comment }); setComment(''); }
      else { await api(`/work-orders/${record.id}`, 'PATCH', { status, assigneeId: assignee || null, priority, dueAt: due ? new Date(`${due}T00:00:00+05:30`).toISOString() : null, version: record.version, note }); setNote(''); }
      await load();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-5"><Link className="text-green-400 underline" href="/dashboard/work-orders">Back to work orders</Link><Notice message={message}/>{!record ? <p className="text-slate-400">Work order unavailable.</p> : <><section className="stat-card space-y-3"><h1 className="text-2xl font-bold text-white">{record.title}</h1><DataQualityBadge quality={record.simulated ? 'Estimated' : 'Calculated'}/><p className="text-slate-300 whitespace-pre-wrap break-words">{record.description}</p><p className="text-sm text-slate-400">{record.status.replace('_', ' ')} · {record.priority} priority · Due: {ist(record.dueAt)}</p><p className="text-sm text-slate-400 break-all">Assigned account: {people.find(p => p.id === record.assigneeId)?.name || record.assigneeId || 'Unassigned'}</p><p className="text-xs text-slate-500">Created: {ist(record.createdAt)} · Updated: {ist(record.updatedAt)}</p></section>
    {operator && record.status !== 'closed' && <form onSubmit={save} className="stat-card space-y-3"><h2 className="text-white font-semibold">Update work order</h2><label className="block text-sm text-slate-300">Status<select className="input-dark mt-1" value={status} onChange={e => setStatus(e.target.value)}>{(record.status === 'open' ? ['open', 'in_progress'] : ['in_progress', 'closed']).map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select></label><label className="block text-sm text-slate-300">Assigned to<select className="input-dark mt-1" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Unassigned</option>{record.assigneeId && !people.some(p => p.id === record.assigneeId) && <option value={record.assigneeId}>Previous account (choose a current assignee)</option>}{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="block text-sm text-slate-300">Priority<select className="input-dark mt-1" value={priority} onChange={e => setPriority(e.target.value)}>{['low', 'medium', 'high', 'critical'].map(v => <option key={v}>{v}</option>)}</select></label><label className="block text-sm text-slate-300">Due date (IST)<input type="date" className="input-dark mt-1" value={due} onChange={e => setDue(e.target.value)}/></label><label className="block text-sm text-slate-300">Change note<textarea required maxLength={2000} className="input-dark mt-1" value={note} onChange={e => setNote(e.target.value)}/></label><button className="btn-green" disabled={busy || !note.trim()}>Save changes</button></form>}
    <section className="stat-card"><EventHistory events={record.history}/></section>{operator && <form className="stat-card space-y-3" onSubmit={event => save(event, true)}><label className="block text-sm text-slate-300">Add a comment<textarea required maxLength={2000} className="input-dark mt-1" value={comment} onChange={e => setComment(e.target.value)}/></label><button className="btn-outline" disabled={busy || !comment.trim()}>Save comment</button></form>}</>}
  </div>;
}
