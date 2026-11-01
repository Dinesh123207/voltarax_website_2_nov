'use client';
/* eslint-disable @next/next/no-img-element -- authenticated streams/photos must be fetched with browser session cookies, without the public image optimizer. */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import DataQualityBadge, { type DataQuality } from '@/components/ui/DataQualityBadge';
import { api, ist } from '@/lib/operations';
import { Notice, useOperator } from './Shared';
import { useCopy } from '@/i18n/copy';

type Photo = { id: string; source: string; savedAt: string; width: number; height: number };
type Indicator = { label: string; dataQuality: DataQuality; observedAt: string; stale: boolean };
type Record = { id: string; area: string; condition: string; notes: string; photoId: string; observedAt: string; createdAt: string; indicator: Indicator };
type Coating = { areas: Record[]; truncated: boolean; rules: { conditions: string[]; label: string }[]; trends: { day: string; condition: string; count: number }[]; note: string; trendPeriodDays: number };
type CameraStatus = { snapshotConfigured: boolean; streamConfigured: boolean; online: null };
const conditions = ['clean', 'dusty', 'cracked', 'peeling', 'other', 'unknown'];

function CameraView({ status }: { status: CameraStatus | null }) {
  const copyText = useCopy();
  const [open, setOpen] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { if (!open) return; const timer = setTimeout(() => { setOpen(false); setMessage('Stream view ended. Open it again to request a new session.'); }, 58000); return () => clearTimeout(timer); }, [open]);
  return <section className="stat-card space-y-3"><h2 className="font-semibold text-white">{copyText("Camera view")}</h2><p className="text-sm text-slate-400">{copyText("A configured camera may be offline. Frame capture time is Unavailable. The stream does not classify defects.")}</p><Notice message={message}/>
    <button className="btn-outline" disabled={!status?.streamConfigured} onClick={() => { setMessage(''); setOpen(!open); }}>{copyText(open ? 'Close stream' : 'Open camera stream')}</button>
    {copyText(!status?.streamConfigured && <p className="text-sm text-slate-500">{copyText("Camera stream unavailable or not configured.")}</p>)}
    {copyText(open && <img className="w-full max-h-96 object-contain rounded-lg" src="/api/camera/stream" alt={copyText("Camera stream; capture time unavailable")} onError={() => { setOpen(false); setMessage('Camera offline, stream busy or session unavailable. Try opening it again.'); }}/>)}
  </section>;
}
export default function Inspections({ kind }: { kind: 'camera' | 'coating' }) {
  const copyText = useCopy();
  const operator = useOperator();
  const [records, setRecords] = useState<Record[] | null>(null), [photos, setPhotos] = useState<Photo[]>([]), [coating, setCoating] = useState<Coating | null>(null), [camera, setCamera] = useState<CameraStatus | null>(null);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [photoId, setPhotoId] = useState('');
  const [area, setArea] = useState(''), [condition, setCondition] = useState('unknown'), [notes, setNotes] = useState(''), [observed, setObserved] = useState('');
  const load = useCallback(async () => {
    try {
      const [rows, images, summary] = await Promise.all([api<Record[]>(`/inspections?kind=${kind}&limit=100`), api<Photo[]>('/inspection-photos?limit=100'), kind === 'coating' ? api<Coating>('/coating') : Promise.resolve(null)]);
      setRecords(rows); setPhotos(images); setCoating(summary); setMessage('');
    } catch (error) { setRecords(null); setPhotos([]); setCoating(null); setMessage((error as Error).message); }
  }, [kind]);
  useEffect(() => { load(); api<CameraStatus>('/camera/status').then(setCamera).catch(() => setCamera(null)); }, [load]);
  const choosePhoto = (photo: Photo) => { setPhotos(current => [photo, ...current.filter(row => row.id !== photo.id)].slice(0, 100)); setPhotoId(photo.id); };
  async function capture() {
    setBusy(true); setMessage('');
    try { choosePhoto(await api<Photo>('/camera/snapshots', 'POST', {})); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setMessage('');
    try {
      if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPEG or PNG up to 2 MB and four megapixels.');
      const response = await fetch('/api/inspection-photos', { method: 'POST', headers: { 'Content-Type': file.type, 'X-Voltarax-Request': '1' }, body: file });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Photo upload unavailable.'); choosePhoto(data);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await api('/inspections', 'POST', { kind, area, condition, notes, photoId, observedAt: new Date(`${observed}+05:30`).toISOString() }); await load(); setPhotoId(''); setNotes(''); setObserved(''); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  const selected = photos.find(row => row.id === photoId);
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">{copyText(kind === 'coating' ? 'Coating inspections' : 'Camera inspections')}</h1><p className="text-sm text-slate-400">{copyText("Photos and operator observations. Automated defect classification and a numerical coating score are Unavailable.")}</p><DataQualityBadge quality={records ? 'Calculated' : 'Unavailable'}/></div><button className="btn-outline" onClick={load} disabled={busy}>{copyText("Refresh records")}</button></div><Notice message={message}/>
    {copyText(kind === 'camera' && <CameraView status={camera}/>)}
    {kind === 'coating' && coating && <section className="stat-card space-y-4"><h2 className="font-semibold text-white">{copyText("Latest observation per area")}</h2><p className="text-sm text-slate-400">{copyText(coating.note)}</p>{copyText(coating.truncated && <Notice message="Only 500 areas are shown. A complete site-wide status is Unavailable."/>)}
      {coating.areas.map(row => <div className="border-b border-green-900/30 pb-3" key={row.id}><p className="text-white break-words">{row.area} · {copyText(row.condition)}</p><p className="text-sm text-slate-400">{copyText(row.indicator.label)} · {copyText(ist(row.observedAt))}</p><DataQualityBadge quality={row.indicator.dataQuality}/></div>)}
      {copyText(coating.areas.length === 0 && <p className="text-slate-400 text-sm">{copyText("No dated coating observations are saved.")}</p>)}
      <h3 className="text-white font-semibold">{copyText("Visible category rules")}</h3><ul className="space-y-2 text-sm text-slate-400">{coating.rules.map(rule => <li key={rule.label}>{rule.conditions.map(condition => copyText(condition)).join(' / ')} → {copyText(rule.label)}</li>)}</ul><p className="text-xs text-slate-500">{copyText("Categories expire after the configured inspection interval (30 days by default). They do not measure coating chemistry, degradation percentage or repair quality.")}</p>
      <h3 className="text-white font-semibold">{copyText("Recorded observation trend · last ")}{copyText(coating.trendPeriodDays)} {copyText(" days")}</h3><DataQualityBadge quality="Calculated"/>
      {coating.trends.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">{copyText("Observation counts by IST calendar date and entered condition")}</caption><thead className="text-slate-400"><tr><th className="p-2">{copyText("Date (IST)")}</th><th className="p-2">{copyText("Entered condition")}</th><th className="p-2">{copyText("Observations")}</th></tr></thead><tbody>{coating.trends.map(row => <tr key={`${row.day}-${row.condition}`} className="border-t border-green-900/20 text-slate-300"><td className="p-2 whitespace-nowrap">{copyText(row.day)}</td><td className="p-2">{copyText(row.condition)}</td><td className="p-2">{copyText(row.count)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-400">{copyText("No observations in this period. Counts describe entries, not panel health.")}</p>}
    </section>}
    {operator && <form onSubmit={save} className="stat-card space-y-4"><h2 className="font-semibold text-white">{copyText("Save an actual observation")}</h2><p className="text-sm text-slate-400">{copyText("Use a photo matching the observed area/time. Photos are re-encoded without metadata; orient them before uploading.")}</p><div className="flex flex-wrap gap-3"><button type="button" className="btn-outline" onClick={capture} disabled={busy || !camera?.snapshotConfigured}>{copyText("Capture camera photo")}</button><label className="block text-sm text-slate-300">{copyText("Upload equipment photo (JPEG/PNG, up to 2 MB)")}<input type="file" accept="image/jpeg,image/png" disabled={busy} className="block mt-1 max-w-full text-sm" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }}/></label></div>
      <label className="block text-sm text-slate-300">{copyText("Stored photo")}<select required className="input-dark mt-1" value={photoId} onChange={e => setPhotoId(e.target.value)}><option value="">{copyText("Choose a captured or uploaded photo")}</option>{photos.map(photo => <option key={photo.id} value={photo.id}>{copyText(photo.source)} · {copyText(ist(photo.savedAt))}</option>)}</select></label>
      {selected && <div className="space-y-2"><img src={`/api/inspection-photos/${selected.id}`} alt={copyText("Selected inspection evidence")} className="max-h-80 w-full object-contain rounded-lg"/><p className="text-xs text-slate-500">{copyText("Saved ")}{copyText(ist(selected.savedAt))} · {copyText(selected.width)} × {copyText(selected.height)} {copyText(" image pixels ")}<DataQualityBadge quality="Calculated"/> {copyText(" · Original capture time Unavailable")}</p></div>}
      <div className="grid sm:grid-cols-2 gap-3"><label className="block text-sm text-slate-300">{copyText("Panel / area")}<input required list="known-inspection-areas" maxLength={160} className="input-dark mt-1" value={area} onChange={e => setArea(e.target.value)}/><datalist id="known-inspection-areas">{Array.from(new Set(records?.map(row => row.area) || [])).map(value => <option key={value} value={value}/>)}</datalist></label><label className="block text-sm text-slate-300">{copyText("Actual observation time (IST)")}<input required type="datetime-local" min="2000-01-01T00:00" className="input-dark mt-1" value={observed} onChange={e => setObserved(e.target.value)}/></label></div>
      <label className="block text-sm text-slate-300">{copyText("Observed condition")}<select className="input-dark mt-1" value={condition} onChange={e => setCondition(e.target.value)}>{conditions.map(value => <option key={value} value={value}>{copyText(value)}</option>)}</select></label><label className="block text-sm text-slate-300">{copyText("Factual notes")}<textarea required maxLength={2000} className="input-dark mt-1" value={notes} onChange={e => setNotes(e.target.value)}/></label><button className="btn-green" disabled={busy || !photoId}>{copyText(busy ? 'Saving…' : 'Save observation')}</button>
    </form>}
    <section className="space-y-3"><h2 className="text-white font-semibold">{copyText("Observation history")}</h2><p className="text-xs text-slate-500">{records ? copyText('{count} records shown (up to 100), ordered by reported observation time.', { count: records.length }) : copyText('Unavailable')}</p>{records?.map(row => <article key={row.id} className="stat-card space-y-2"><h3 className="text-white font-semibold break-words">{row.area} · {copyText(row.condition)}</h3><p className="text-sm text-slate-400 whitespace-pre-wrap break-words">{row.notes}</p><p className="text-xs text-slate-500">{copyText("Reported observation: ")}{copyText(ist(row.observedAt))} {copyText(" · Recorded: ")}{copyText(ist(row.createdAt))}</p><p className="text-sm text-slate-400">{copyText(row.indicator.label)}</p><DataQualityBadge quality={row.indicator.dataQuality}/><div><a className="text-green-400 underline text-sm" href={`/api/inspection-photos/${row.photoId}`} target="_blank" rel="noopener noreferrer">{copyText("Open stored photo")}</a></div></article>)}{copyText(records?.length === 0 && <p className="text-sm text-slate-400">{copyText("No saved observations. This is not evidence of fault-free equipment.")}</p>)}</section>
  </div>;
}
