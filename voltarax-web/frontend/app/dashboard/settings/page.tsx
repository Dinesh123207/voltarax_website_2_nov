'use client';
import { useEffect, useState } from 'react';
import { Users, RefreshCw, ExternalLink, Settings as SettingsIcon, Shield } from 'lucide-react';


const ROLE_COL: Record<string, string> = {
  admin:    'text-red-400 bg-red-500/10 border-red-500/20',
  operator: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  viewer:   'text-slate-400 bg-slate-500/10 border-slate-500/20',
  client:   'text-purple-400 bg-purple-500/10 border-purple-500/20',
};



export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('vv_user');
    if (u) { try { setUser(JSON.parse(u)); } catch { setUser(null); } }
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
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Current user */}
      {user && (
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon size={15} className="text-green-500" />
            <div className="text-sm font-semibold text-white">Current Session</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Name',      value: user.name || user.full_name || '—' },
              { label: 'Email',     value: user.email },
              { label: 'Role',      value: user.role },
              { label: 'Token',     value: localStorage.getItem('vv_token')?.slice(0,20) + '…' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0a0f0d] rounded-lg border border-green-900/20 p-3">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="text-xs text-green-400 font-mono truncate">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API connections */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { title: 'Local Solar Telemetry API', url: '', badge: 'Live' },
          { title: 'Node.js Corporate API', url: '', badge: 'Backend' },
        ].map(s => (
          <div key={s.title} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">{s.title}</div>
              <span className="text-xs text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded">{s.badge}</span>
            </div>
            <div className="input-dark font-mono text-xs text-green-400 bg-[#0a0f0d]">{s.url}</div>
            <a href={`${s.url || ''}/health`} target="_blank" rel="noopener noreferrer"
              className="mt-2 text-xs text-green-700 hover:text-green-500 transition-colors flex items-center gap-1">
              <ExternalLink size={10} /> Health check
            </a>
          </div>
        ))}
      </div>

      {/* All endpoints */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm font-semibold text-white">local telemetry API Endpoints</div>
          <span className="text-xs text-slate-500 font-mono">19 endpoints · JWT protected</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {ENDPOINTS.map(e => (
            <a key={e.path}
              href={e.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-900/30 hover:border-green-500/40 bg-green-500/3 hover:bg-green-500/8 text-xs text-slate-400 hover:text-green-400 transition-all">
              <ExternalLink size={10} className="flex-shrink-0" />
              {e.label}
            </a>
          ))}
        </div>
      </div>

      {/* Swagger link */}
      <div className="text-center">
        <a href="/health" target="_blank" rel="noopener noreferrer"
          className="btn-outline px-8 py-3 text-sm">
          Open API Health <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

