'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
type Command = { id: string; status: string; desired: boolean; created_at: number; expires_at: number; reason?: string; acknowledgement?: { ts: number; output?: boolean } };
export default function RelayPage() {
  const [state, setState] = useState<any>(null); const [history, setHistory] = useState<Command[]>([]);
  const [device, setDevice] = useState(''); const [devices, setDevices] = useState<any[]>([]); const [admin, setAdmin] = useState(false);
  const [desired, setDesired] = useState(''); const [code, setCode] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const suffix = device ? `?device_id=${encodeURIComponent(device)}` : '';
      const [statusResponse, historyResponse] = await Promise.all([fetch(`/api/relay${suffix}`), fetch(`/api/relay/history${suffix}${suffix ? '&' : '?'}limit=15`)]);
      if (!statusResponse.ok || !historyResponse.ok) { setState(null); setMessage('Relay data unavailable.'); return; }
      const status = await statusResponse.json(); setState(status); const rows = await historyResponse.json(); setHistory(Array.isArray(rows) ? rows : []);
      if (!device && status.device_id) setDevice(status.device_id);
      setMessage(previous => previous === 'Relay data unavailable.' ? '' : previous);
    } catch { setState(null); setMessage('Relay data unavailable.'); }
  }, [device]);
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(async data => { if (data.user?.role === 'admin') { setAdmin(true); const response = await fetch('/api/devices'); if (response.ok) setDevices((await response.json()).devices || []); } }).catch(() => {}); }, []);
  const requestCode = async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/sensitive/request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' }, body: JSON.stringify({ action: 'relay-command', target: `${device}-${desired}` }) });
      const data = await response.json(); setMessage(data.message || 'Unable to request a code.');
    } catch { setMessage('Server unavailable.'); } finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!confirmed || !desired) return; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/relay/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' }, body: JSON.stringify({ device_id: device, desired: desired === 'on', code }) });
      const data = await response.json(); setMessage(data.message || (response.ok ? 'Command pending. Wait for the device acknowledgement.' : 'Command unavailable.'));
      if (response.ok) { setCode(''); setConfirmed(false); await load(); }
    } catch { setMessage('Server unavailable. Refresh status before retrying.'); } finally { setBusy(false); }
  };
  const canControl = admin && state?.device_id === device && state?.control_enabled === true && state?.command?.status !== 'pending';
  const when = (seconds: number) => new Date(seconds * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return <div className="space-y-6 text-slate-300">
    <div className="flex justify-between gap-3"><h1 className="text-2xl text-white font-bold">Energy Management Relay</h1><button className="btn-outline" onClick={load}>Refresh</button></div>
    <p className="text-sm">Commands expire after 30 seconds. An applied acknowledgement reports the device&apos;s GPIO action; physical contact feedback is Unavailable.</p>
    <p role="status" className="text-sm">{message}</p>
    <div className="stat-card space-y-3"><h2 className="font-semibold text-white">Physical relay state <DataQualityBadge quality="Unavailable" /></h2>
      {['Battery Charging', 'Load Supply', 'Grid Export', 'Spare Channel'].map(label => <div key={label} className="flex justify-between gap-3 border-b border-green-900/20 py-2"><span>{label}</span><span>Unavailable{label === 'Load Supply' ? ' · contact feedback missing' : ' · Coming soon'}</span></div>)}
    </div>
    <div className="stat-card space-y-3"><h2 className="font-semibold text-white">Latest command <DataQualityBadge quality={state?.command ? 'Calculated' : 'Unavailable'} /></h2>
      {state?.command ? <><p>Status: {state.command.status}</p><p>Requested output: {state.command.desired ? 'ON' : 'OFF'}</p><p>Issued: {when(state.command.created_at)}</p>{state.command.acknowledgement && <p>GPIO acknowledgement: {state.command.acknowledgement.output == null ? 'Unavailable' : state.command.acknowledgement.output ? 'ON' : 'OFF'} at {when(state.command.acknowledgement.ts)}</p>}<p>{state.command.reason}</p></> : <p>Command data Unavailable.</p>}
    </div>
    {admin ? <form className="stat-card space-y-3" onSubmit={submit}>
      <h2 className="text-white font-semibold">Request load output</h2>
      <p className="text-sm">Control requires administrator permission and verified device setup. Confirm the target and output before sending. Current physical state remains unknown.</p>
      <label className="block text-sm" htmlFor="relay-device">Device<select id="relay-device" className="input-dark mt-1" required value={device} onChange={e => { setDevice(e.target.value); setCode(''); setConfirmed(false); }}>{!devices.some(row => row.device_id === device) && <option value={device}>{device || 'Choose a device'}</option>}{devices.map(row => <option key={row.device_id} value={row.device_id}>{row.name} ({row.device_id})</option>)}</select></label>
      <label className="block text-sm" htmlFor="relay-output">Requested output<select id="relay-output" required className="input-dark mt-1" value={desired} onChange={e => { setDesired(e.target.value); setCode(''); setConfirmed(false); }}><option value="">Choose output</option><option value="on">ON</option><option value="off">OFF</option></select></label>
      {!state?.control_enabled && <p className="text-amber-300 text-sm">Control is disabled. Complete the device and server setup before issuing a command.</p>}
      <button type="button" className="btn-outline" disabled={busy || !canControl || !desired} onClick={requestCode}>Email command confirmation code</button>
      <label className="block text-sm" htmlFor="relay-code">Six-digit code<input id="relay-code" className="input-dark mt-1" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} required onChange={e => setCode(e.target.value)} /></label>
      <label className="block text-sm"><input type="checkbox" checked={confirmed} required onChange={e => setConfirmed(e.target.checked)} /> I confirm device {device || 'Unavailable'} and requested output {desired ? desired.toUpperCase() : 'Unavailable'}.</label>
      <button className="btn-green" disabled={busy || !canControl || !confirmed || !desired}>Send command</button>
    </form> : <p className="text-sm">Only administrators can issue relay commands.</p>}
    <div className="stat-card space-y-3"><h2 className="font-semibold text-white">Command history <DataQualityBadge quality={history.length ? 'Calculated' : 'Unavailable'} /></h2>{history.length ? history.map(command => <div className="border-b border-green-900/20 py-2 text-sm" key={command.id}>{when(command.created_at)} · requested {command.desired ? 'ON' : 'OFF'} · {command.status}</div>) : <p>Command history Unavailable.</p>}</div>
  </div>;
}
