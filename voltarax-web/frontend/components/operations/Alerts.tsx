'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import { api, ist, type AlertRecord } from '@/lib/operations';
import { EventHistory, Notice, useOperator } from './Shared';
import { useCopy } from '@/i18n/copy';

export default function Alerts() {
  const copyText = useCopy();
  const operator = useOperator();
  const [records, setRecords] = useState<AlertRecord[] | null>(null), [resolved, setResolved] = useState(false);
  const [selected, setSelected] = useState<AlertRecord | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [note, setNote] = useState(''), [title, setTitle] = useState(''), [description, setDescription] = useState(''), [severity, setSeverity] = useState('warning');
  const load = useCallback(async () => {
    try { setRecords(await api<AlertRecord[]>(`/alerts?resolved=${resolved}&limit=100`)); setMessage(''); }
    catch (error) { setRecords(null); setMessage((error as Error).message); }
  }, [resolved]);
  useEffect(() => { setSelected(null); load(); }, [load]);
  async function open(id: string) { try { setSelected(await api<AlertRecord>(`/alerts/${id}`)); setNote(''); setMessage(''); } catch (error) { setSelected(null); setMessage((error as Error).message); } }
  async function transition(action: string) {
    if (!selected || !note.trim()) return; setBusy(true);
    try { await api(`/alerts/${selected.id}/${action}`, 'PUT', { note }); await load(); await open(selected.id); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const row = await api<AlertRecord>('/alerts', 'POST', { title, message: description, severity }); setTitle(''); setDescription(''); await load(); await open(row.id); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">{copyText("Alerts")}</h1><p className="text-sm text-slate-400">{copyText("Saved rule observations and operator reports. Resolving a record does not certify that a fault is repaired.")}</p><DataQualityBadge quality={records ? 'Calculated' : 'Unavailable'}/></div><button className="btn-outline" onClick={load} disabled={busy}>{copyText("Refresh")}</button></div>
    <Notice message={message}/>
    <div className="flex gap-3"><button className="btn-outline" onClick={() => setResolved(!resolved)}>{copyText(resolved ? 'Show active alerts' : 'Show resolved alerts')}</button><p className="text-sm text-slate-400 self-center">{copyText(records ? `${records.length} records shown (up to 100)` : 'Unavailable')}</p></div>
    <div className="grid gap-3">{records?.map(row => <article className="stat-card space-y-2" key={row.id}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-white">{row.title}</h2><DataQualityBadge quality={row.simulated ? 'Estimated' : 'Calculated'}/></div><p className="text-sm text-slate-400 whitespace-pre-wrap break-words">{row.message}</p><p className="text-xs text-slate-500">{copyText(row.severity)} · {copyText(row.status)} · {copyText(ist(row.createdAt))}{copyText(row.simulated ? ' · Test data' : '')}</p><button className="btn-outline text-xs" onClick={() => open(row.id)}>{copyText("View history and actions")}</button></article>)}</div>
    {copyText(records?.length === 0 && <p className="text-slate-400">{copyText("No matching saved alerts. This does not prove that equipment is fault-free.")}</p>)}
    {selected && <section className="stat-card space-y-4"><h2 className="text-lg font-semibold text-white">{selected.title} · {copyText(selected.status)}</h2><EventHistory events={selected.history}/>{operator && <><label className="block text-sm text-slate-300">{copyText("Action note")}<textarea className="input-dark mt-1" value={note} maxLength={2000} onChange={e => setNote(e.target.value)} /></label><div className="flex flex-wrap gap-3">{copyText(selected.status === 'open' && <button className="btn-green" disabled={busy || !note.trim()} onClick={() => transition('acknowledge')}>{copyText("Acknowledge")}</button>)}{copyText(selected.status !== 'resolved' && <button className="btn-outline" disabled={busy || !note.trim()} onClick={() => transition('resolve')}>{copyText("Resolve with note")}</button>)}<Link className="btn-outline" href={`/dashboard/work-orders?alert=${selected.id}`}>{copyText("Create work order")}</Link></div></>}</section>}
    {operator && <form onSubmit={create} className="stat-card space-y-3"><h2 className="font-semibold text-white">{copyText("Record an observed issue")}</h2><label className="block text-sm text-slate-300">{copyText("Title")}<input required maxLength={160} className="input-dark mt-1" value={title} onChange={e => setTitle(e.target.value)}/></label><label className="block text-sm text-slate-300">{copyText("Observation")}<textarea required maxLength={2000} className="input-dark mt-1" value={description} onChange={e => setDescription(e.target.value)}/></label><label className="block text-sm text-slate-300">{copyText("Severity")}<select className="input-dark mt-1" value={severity} onChange={e => setSeverity(e.target.value)}>{['info', 'warning', 'critical'].map(v => <option key={v}>{copyText(v)}</option>)}</select></label><button className="btn-green" disabled={busy}>{copyText("Save alert")}</button></form>}
  </div>;
}
