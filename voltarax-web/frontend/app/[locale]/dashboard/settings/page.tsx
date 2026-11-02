'use client';
import { dataFetch as fetch } from '@/lib/data-activity';

import { useEffect, useState } from 'react';
import { Users, RefreshCw, ExternalLink, Settings as SettingsIcon, Shield } from 'lucide-react';
import { useCopy } from '@/i18n/copy';
import { useRouter } from '@/i18n/navigation';



const ROLE_COL: Record<string, string> = {
  admin:    'text-red-400 bg-red-500/10 border-red-500/20',
  operator: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  viewer:   'text-slate-400 bg-slate-500/10 border-slate-500/20',
  client:   'text-purple-400 bg-purple-500/10 border-purple-500/20',
};



export default function SettingsPage() {
  const copyText = useCopy();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState(''); const [code, setCode] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const changePassword = async (requestCode: boolean) => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(requestCode ? '/api/auth/sensitive/request' : '/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voltarax-request': '1' }, body: JSON.stringify(requestCode ? { action: 'password', target: user._id } : { password, code }) });
      const data = await response.json(); setMessage(data.message || 'Unable to continue.');
      if (response.ok && !requestCode) router.replace('/login');
    } catch { setMessage('Server unavailable.'); } finally { setBusy(false); }
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => setUser(null));
  }, []);

  const ENDPOINTS = [
    { label: 'Dashboard',      path: '/api/dashboard'   },
    { label: 'Panels',         path: '/api/panels'      },
    { label: 'Forecast',       path: '/api/forecast'    },
    { label: 'BFCI Fleet',     path: '/api/bfci'        },
    { label: 'CV Detections',  path: '/api/cv'          },
    { label: 'Alerts',         path: '/api/alerts'      },
    { label: 'Work Orders',    path: '/api/work-orders' },
    { label: 'Relay State',    path: '/api/relay'       },
    { label: 'Carbon Impact',  path: '/api/carbon'      },
    { label: 'System Health',  path: '/api/system'      },
    { label: 'Users',          path: '/api/users'       },
    { label: 'Auth Me',        path: '/api/auth/me'     },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{copyText("Settings")}</h1>

      {/* Current user */}
      {user && (
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon size={15} className="text-green-500" />
            <div className="text-sm font-semibold text-white">{copyText("Current Session")}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Name',      value: user.name || user.full_name || 'Unavailable' },
              { label: 'Email',     value: user.email },
              { label: 'Role',      value: user.role },
              { label: 'Session', value: 'Secure cookie' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0a0f0d] rounded-lg border border-green-900/20 p-3">
                <div className="text-xs text-slate-500 mb-1">{copyText(label)}</div>
                <div className="text-xs text-green-400 font-mono truncate">{copyText(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user && <form className="stat-card space-y-3" onSubmit={e => { e.preventDefault(); changePassword(false); }}>
        <h2 className="text-white font-semibold">{copyText("Change password")}</h2>
        <p className="text-sm text-slate-400">{copyText("Email confirmation is required. This signs out every device.")}</p>
        <button type="button" disabled={busy} className="btn-outline" onClick={() => changePassword(true)}>{copyText("Email confirmation code")}</button>
        <label className="block text-sm text-slate-300" htmlFor="new-password">{copyText("New password (12–72 characters)")}<input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} className="input-dark mt-1" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <p className="text-xs text-slate-400">{copyText('Passwords also have a 72-byte UTF-8 limit; Hindi characters can use more than one byte.')}</p>
        <label className="block text-sm text-slate-300" htmlFor="password-code">{copyText("Six-digit code")}<input id="password-code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} className="input-dark mt-1" value={code} onChange={e => setCode(e.target.value)} /></label>
        <button type="submit" disabled={busy} className="btn-green">{copyText("Change password")}</button>
        <p role="status" className="text-sm text-slate-300">{copyText(message)}</p>
      </form>}
      {/* API connections */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { title: 'Local Solar Telemetry API', url: '', badge: 'Live' },
          { title: 'Node.js Corporate API', url: '', badge: 'Backend' },
        ].map(s => (
          <div key={s.title} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">{copyText(s.title)}</div>
              <span className="text-xs text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded">{copyText(s.badge)}</span>
            </div>
            <div className="input-dark font-mono text-xs text-green-400 bg-[#0a0f0d]">{copyText(s.url)}</div>
            <a href={`${s.url || ''}/health`} target="_blank" rel="noopener noreferrer"
              className="mt-2 text-xs text-green-700 hover:text-green-500 transition-colors flex items-center gap-1">
              <ExternalLink size={10} /> {copyText("Health check")}</a>
          </div>
        ))}
      </div>

      {/* All endpoints */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm font-semibold text-white">{copyText("local telemetry API Endpoints")}</div>
          <span className="text-xs text-slate-500 font-mono">{copyText("Authenticated API")}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {ENDPOINTS.map(e => (
            <a key={e.path}
              href={e.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-900/30 hover:border-green-500/40 bg-green-500/3 hover:bg-green-500/8 text-xs text-slate-400 hover:text-green-400 transition-all">
              <ExternalLink size={10} className="flex-shrink-0" />
              {copyText(e.label)}
            </a>
          ))}
        </div>
      </div>

      {/* Swagger link */}
      <div className="text-center">
        <a href="/health" target="_blank" rel="noopener noreferrer"
          className="btn-outline px-8 py-3 text-sm">
          {copyText("Open API Health")}<ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

