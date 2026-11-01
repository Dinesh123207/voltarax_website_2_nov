'use client';
import { useEffect, useState } from 'react';
import { Users, RefreshCw, ExternalLink, Settings as SettingsIcon, Shield } from 'lucide-react';
import { useCopy } from '@/i18n/copy';



const ROLE_COL: Record<string, string> = {
  admin:    'text-red-400 bg-red-500/10 border-red-500/20',
  operator: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  viewer:   'text-slate-400 bg-slate-500/10 border-slate-500/20',
  client:   'text-purple-400 bg-purple-500/10 border-purple-500/20',
};


export default function UsersPage() {
  const copyText = useCopy();
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({ id: '', role: 'viewer', siteIds: '', isActive: true, code: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const changeAccess = async (requestCode: boolean) => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(requestCode ? '/api/auth/sensitive/request' : `/api/auth/users/${access.id}/access`, {
        method: requestCode ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' },
        body: JSON.stringify(requestCode ? { action: 'user-access', target: access.id } : { role: access.role, siteIds: access.siteIds.split(',').map(s => s.trim()).filter(Boolean), isActive: access.isActive, code: access.code }),
      });
      const data = await response.json(); setMessage(data.message || (response.ok ? 'Access updated. Existing sessions have been revoked.' : 'Unable to update access.'));
      if (response.ok && !requestCode) { setAccess({ ...access, code: '' }); await load(); }
    } catch { setMessage('Server unavailable.'); } finally { setBusy(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = null;
      const h: Record<string, string> = token ? { 'x-voltarax-request': '1' } : {};
      // Load users from the local Voltarax API
      const r = await fetch(`/api/users`, { headers: h });
      if (r.ok) {
        const d = await r.json();
        setUsers(d.data || []);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{copyText("User Management")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{copyText("Admin-only · Voltarax RBAC")}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/users`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12} /> {copyText(" API")}</a>
          <button onClick={load} disabled={loading}
            className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {copyText("Refresh")}</button>
        </div>
      </div>

      {/* RBAC info */}
      <div className="stat-card border border-green-500/10 bg-green-500/3">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-green-500" />
          <div className="text-xs text-green-600 font-mono font-bold">{copyText("RBAC — ROLE-BASED ACCESS CONTROL")}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { role: 'admin',    perms: 'Access to the user list and admin content.' },
            { role: 'operator', perms: 'Dashboard access to assigned sites.' },
            { role: 'viewer',   perms: 'Dashboard access to assigned sites.' },
          ].map(({ role, perms }) => (
            <div key={role} className={`rounded-lg border px-3 py-2 ${ROLE_COL[role]}`}>
              <div className="font-bold text-xs uppercase font-mono mb-1">{copyText(role)}</div>
              <div className="text-xs text-slate-200 leading-relaxed">{copyText(perms)}</div>
            </div>
          ))}
        </div>
      </div>

      <form className="stat-card space-y-3" onSubmit={e => { e.preventDefault(); changeAccess(false); }}>
        <h2 className="text-white font-semibold">{copyText("Assign account access")}</h2>
        <p className="text-sm text-slate-400">{copyText("An email code confirms each change. New viewers need a site assignment. Ask another administrator to change your own access.")}</p>
        <label className="block text-sm text-slate-300" htmlFor="access-user">{copyText("Account")}<select id="access-user" className="input-dark mt-1" required value={access.id} onChange={e => {
          const u = users.find(row => row._id === e.target.value);
          setAccess({ id: e.target.value, role: u?.role || 'viewer', siteIds: (u?.siteIds || []).join(','), isActive: u?.isActive === true, code: '' });
        }}><option value="">{copyText("Choose an account")}</option>{users.map(u => <option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}</select></label>
        <label className="block text-sm text-slate-300" htmlFor="access-role">{copyText("Role")}<select id="access-role" className="input-dark mt-1" value={access.role} onChange={e => setAccess({ ...access, role: e.target.value })}>{['viewer', 'operator', 'admin'].map(role => <option key={role} value={role}>{copyText(role)}</option>)}</select></label>
        <label className="block text-sm text-slate-300" htmlFor="access-sites">{copyText("Site IDs (comma separated)")}<input id="access-sites" className="input-dark mt-1" value={access.siteIds} onChange={e => setAccess({ ...access, siteIds: e.target.value })} /></label>
        <label className="block text-sm text-slate-300"><input type="checkbox" checked={access.isActive} onChange={e => setAccess({ ...access, isActive: e.target.checked })} /> {copyText(" Account active")}</label>
        <button type="button" disabled={busy || !access.id} className="btn-outline" onClick={() => changeAccess(true)}>{copyText("Email confirmation code")}</button>
        <label className="block text-sm text-slate-300" htmlFor="access-code">{copyText("Six-digit code")}<input id="access-code" className="input-dark mt-1" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={access.code} onChange={e => setAccess({ ...access, code: e.target.value })} /></label>
        <button type="submit" disabled={busy || !access.id} className="btn-green">{copyText("Save access")}</button>
        <p role="status" className="text-sm text-slate-300">{copyText(message)}</p>
        <a className="block text-sm text-green-400" href="/api/auth/audit" target="_blank" rel="noopener noreferrer">{copyText("View administrator audit events")}</a>
      </form>
      {/* Users table */}
      <div className="stat-card overflow-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-green-900/20">
              {['ID', 'Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider py-2 px-3 font-semibold">{copyText(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-green-900/10">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-3 px-3"><div className="shimmer h-4 rounded w-16" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-600">
                  <Users size={32} className="mx-auto mb-2 text-slate-700" />
                  {copyText("No users found — admin access required")}</td>
              </tr>
            ) : users.map(u => (
              <tr key={u._id} className="border-b border-green-900/10 hover:bg-green-500/3 transition-colors">
                <td className="py-2.5 px-3 text-slate-600 text-xs font-mono">#{u._id}</td>
                <td className="py-2.5 px-3 text-slate-200 text-sm font-semibold">{u.name}</td>
                <td className="py-2.5 px-3 text-slate-400 text-xs font-mono">{u.email}</td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase font-mono ${ROLE_COL[u.role] || ''}`}>
                    {copyText(u.role)}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className={`flex items-center gap-1.5 text-xs ${u.isActive ? 'text-green-400' : 'text-slate-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-slate-600'}`} />
                    {copyText(u.isActive == null ? 'Unavailable' : u.isActive ? 'Active' : 'Inactive')}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-500">
                  {copyText(u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
