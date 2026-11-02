'use client';
import { dataFetch as fetch } from '@/lib/data-activity';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useCopy } from '@/i18n/copy';

type Device = { device_id: string; site_id: string; name: string; enabled: boolean; relayEnabled: boolean; last_seen: string | null; firmware_version: string | null };
type Operation = { id: string; action: 'device-key-rotate' | 'device-configure'; enabled?: boolean; relayEnabled?: boolean };
export default function DevicesPage() {
  const copyText = useCopy();
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState({ device_id: '', site_id: '', name: '', code: '' });
  const [operation, setOperation] = useState<Operation | null>(null);
  const [code, setCode] = useState(''); const [oneTimeKey, setOneTimeKey] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const response = await fetch('/api/devices'); const data = await response.json(); if (response.ok) setDevices(data.devices || []); else setMessage(data.message || 'Device list unavailable.'); }
    catch { setMessage('Device list unavailable.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const requestCode = async (action: string, target: string) => {
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/auth/sensitive/request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' }, body: JSON.stringify({ action, target }) }); const data = await response.json(); setMessage(data.message || 'Unable to request a code.'); }
    catch { setMessage('Server unavailable.'); } finally { setBusy(false); }
  };
  const submit = async (e: FormEvent, editing = false) => {
    e.preventDefault(); setBusy(true); setMessage(''); setOneTimeKey('');
    try {
      const rotate = operation?.action === 'device-key-rotate';
      const response = await fetch(editing ? `/api/devices/${operation?.id}${rotate ? '/rotate-key' : ''}` : '/api/devices', {
        method: editing && !rotate ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' },
        body: JSON.stringify(editing ? rotate ? { code } : { enabled: operation?.enabled, relayEnabled: operation?.relayEnabled, code } : form),
      });
      const data = await response.json(); setMessage(data.message || (response.ok ? 'Device updated.' : 'Unable to update device.'));
      if (response.ok) { setOneTimeKey(data.key || ''); setForm({ ...form, code: '' }); setOperation(null); setCode(''); await load(); }
    } catch { setMessage('Server unavailable.'); } finally { setBusy(false); }
  };
  const begin = (op: Operation) => { setOperation(op); setCode(''); setOneTimeKey(''); setMessage('Request a confirmation code, then confirm this change.'); };
  return <div className="space-y-6 text-slate-300">
    <h1 className="text-2xl font-bold text-white">{copyText("Device registration")}</h1>
    <p className="text-sm">{copyText("Administrator access and email confirmation are required. Keys appear once. Device status comes from accepted telemetry; missing status is Unavailable.")}</p>
    {oneTimeKey && <div className="stat-card space-y-3"><p className="text-white">{copyText("Copy this key to the device's local secret configuration now.")}</p><output className="block break-all select-all font-mono">{oneTimeKey}</output><button className="btn-outline" onClick={() => setOneTimeKey('')}>{copyText("Hide key")}</button></div>}
    <p role="status" className="text-sm">{copyText(message)}</p>
    <form className="stat-card space-y-3" onSubmit={e => submit(e)}>
      <h2 className="font-semibold text-white">{copyText("Register device")}</h2>
      {(['device_id', 'site_id', 'name'] as const).map(field => <label className="block text-sm" htmlFor={field} key={field}>{copyText(field === 'device_id' ? 'Device ID' : field === 'site_id' ? 'Configured site ID' : 'Name')}<input id={field} required className="input-dark mt-1" maxLength={field === 'name' ? 100 : 64} pattern={field === 'name' ? undefined : '[A-Za-z0-9_-]{1,64}'} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} /></label>)}
      <button type="button" className="btn-outline" disabled={busy || !form.device_id} onClick={() => requestCode('device-register', form.device_id)}>{copyText("Email registration code")}</button>
      <label className="block text-sm" htmlFor="register-code">{copyText("Six-digit code")}<input id="register-code" className="input-dark mt-1" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></label>
      <button className="btn-green" disabled={busy}>{copyText("Register and show key")}</button>
    </form>
    {operation && <form className="stat-card space-y-3 border border-amber-700" onSubmit={e => submit(e, true)}>
      <h2 className="text-white font-semibold">{copyText("Confirm ")}{copyText(operation.action === 'device-key-rotate' ? 'key rotation' : 'configuration change')}: {operation.id}</h2>
      <p className="text-sm">{copyText(operation.action === 'device-key-rotate' ? 'The existing key will stop working immediately.' : copyText('Device enabled: {enabled}. Relay permission: {relay}. Server and firmware safety gates also apply.', { enabled: copyText(operation.enabled ? 'Yes' : 'No'), relay: copyText(operation.relayEnabled ? 'Yes' : 'No') }))}</p>
      <button type="button" className="btn-outline" disabled={busy} onClick={() => requestCode(operation.action, operation.id)}>{copyText("Email confirmation code")}</button>
      <label className="block text-sm" htmlFor="device-code">{copyText("Six-digit code")}<input id="device-code" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" className="input-dark mt-1" value={code} onChange={e => setCode(e.target.value)} /></label>
      <button className="btn-green" disabled={busy}>{copyText("Confirm change")}</button> <button type="button" className="btn-outline" onClick={() => setOperation(null)}>{copyText("Cancel")}</button>
    </form>}
    <div tabIndex={0} role="region" aria-label={copyText('Registered devices table')} className="stat-card overflow-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr>{['Device', 'Site', 'Enabled', 'Last seen (IST)', 'Firmware', 'Actions'].map(label => <th key={label} className="text-left p-2">{copyText(label)}</th>)}</tr></thead><tbody>{devices.map(device => <tr key={device.device_id}>
      <td className="p-2">{device.name}<br /><code>{device.device_id}</code></td><td className="p-2">{device.site_id}</td><td className="p-2">{copyText(device.enabled ? 'Yes' : 'No')}</td><td className="p-2">{copyText(device.last_seen ? new Date(device.last_seen).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Unavailable')}</td><td className="p-2">{copyText(device.firmware_version || 'Unavailable')}</td>
      <td className="p-2 flex flex-wrap gap-2"><button className="btn-outline" onClick={() => begin({ id: device.device_id, action: 'device-key-rotate' })}>{copyText("Rotate key")}</button><button className="btn-outline" onClick={() => begin({ id: device.device_id, action: 'device-configure', enabled: !device.enabled, relayEnabled: device.relayEnabled })}>{copyText(device.enabled ? 'Disable' : 'Enable')}</button><button className="btn-outline" onClick={() => begin({ id: device.device_id, action: 'device-configure', enabled: device.enabled, relayEnabled: !device.relayEnabled })}>{copyText(device.relayEnabled ? 'Revoke' : 'Allow')} {copyText(" relay")}</button></td>
    </tr>)}</tbody></table>{copyText(!devices.length && <p className="p-4">{copyText("Device records are Unavailable or no devices are registered.")}</p>)}<p className="text-xs mt-3">{copyText("Most recent 200 devices.")}</p></div>
  </div>;
}
