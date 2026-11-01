'use client';
import { useEffect, useState } from 'react';
import { Users, RefreshCw, ExternalLink, Settings as SettingsIcon, Shield } from 'lucide-react';


const ROLE_COL: Record<string, string> = {
  admin:    'text-red-400 bg-red-500/10 border-red-500/20',
  operator: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  viewer:   'text-slate-400 bg-slate-500/10 border-slate-500/20',
  client:   'text-purple-400 bg-purple-500/10 border-purple-500/20',
};


export default function UsersPage() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Admin-only · Voltarax RBAC</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/users`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12} /> API</a>
          <button onClick={load} disabled={loading}
            className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* RBAC info */}
      <div className="stat-card border border-green-500/10 bg-green-500/3">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-green-500" />
          <div className="text-xs text-green-600 font-mono font-bold">RBAC — ROLE-BASED ACCESS CONTROL</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { role: 'admin',    perms: 'Access to the user list and admin content.' },
            { role: 'operator', perms: 'Authenticated dashboard access.' },
            { role: 'viewer',   perms: 'Authenticated dashboard access.' },
          ].map(({ role, perms }) => (
            <div key={role} className={`rounded-lg border px-3 py-2 ${ROLE_COL[role]}`}>
              <div className="font-bold text-xs uppercase font-mono mb-1">{role}</div>
              <div className="text-xs opacity-70 leading-relaxed">{perms}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="stat-card overflow-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-green-900/20">
              {['ID', 'Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider py-2 px-3 font-semibold">{h}</th>
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
                  No users found — admin access required
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u._id} className="border-b border-green-900/10 hover:bg-green-500/3 transition-colors">
                <td className="py-2.5 px-3 text-slate-600 text-xs font-mono">#{u._id}</td>
                <td className="py-2.5 px-3 text-slate-200 text-sm font-semibold">{u.name}</td>
                <td className="py-2.5 px-3 text-slate-400 text-xs font-mono">{u.email}</td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase font-mono ${ROLE_COL[u.role] || ''}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className={`flex items-center gap-1.5 text-xs ${u.isActive ? 'text-green-400' : 'text-slate-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-slate-600'}`} />
                    {u.isActive == null ? 'Unavailable' : u.isActive ? 'Active' : 'Inactive'}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-500">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
