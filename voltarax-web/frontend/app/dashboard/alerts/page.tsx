'use client';
import { useEffect, useState } from 'react';
import { Bell, RefreshCw, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';


const SEV_STYLE: Record<string,{cls:string,icon:any}> = {
  critical: { cls:'text-red-400 bg-red-500/10 border-red-500/20',    icon: AlertTriangle },
  warning:  { cls:'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Bell },
  info:     { cls:'text-blue-400 bg-blue-500/10 border-blue-500/20',   icon: Info },
};

export default function AlertsPage() {
  const [alerts,   setAlerts]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [resolved, setResolved] = useState(false);
  const [sevFilter, setSevFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const r = await fetch(`/api/alerts?resolved=${resolved}&limit=100`, {
        headers: (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>,
      });
      if (r.ok) setAlerts(await r.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [resolved]);

  const displayed = sevFilter === 'all' ? alerts : alerts.filter(a => a.severity === sevFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-500 text-sm mt-0.5">{alerts.length} {resolved ? 'resolved' : 'active'} alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setResolved(!resolved)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
              resolved ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-green-900/30 text-slate-400'
            }`}>
            {resolved ? '✓ Resolved' : '○ Active'}
          </button>
          <button onClick={load} disabled={loading} className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin':''} /> Refresh
          </button>
        </div>
      </div>

      {/* Severity filter */}
      <div className="flex gap-2">
        {['all','critical','warning','info'].map(s => (
          <button key={s}
            onClick={() => setSevFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
              sevFilter === s
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-green-900/30 text-slate-500 hover:text-white'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({length:4}).map((_,i) => (
            <div key={i} className="stat-card"><div className="shimmer h-14 rounded" /></div>
          ))
        ) : displayed.length === 0 ? (
          <div className="stat-card text-center py-16">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <div className="text-white font-semibold">No {sevFilter !== 'all' ? sevFilter+' ' : ''}alerts</div>
            <div className="text-slate-500 text-sm mt-1">
              {resolved ? 'No resolved alerts found' : 'No alerts available for the current analysis'}
            </div>
          </div>
        ) : displayed.map(alert => {
          const s = SEV_STYLE[alert.severity] || SEV_STYLE.info;
          const Icon = s.icon;
          return (
            <div key={alert.id} className={`stat-card flex items-start gap-4 border ${s.cls}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.cls}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-mono font-bold uppercase ${s.cls.split(' ')[0]}`}>
                    {alert.severity}
                  </span>
                  {alert.panel_label && (
                    <span className="text-xs text-green-500 font-mono font-bold">
                      {alert.panel_label}
                    </span>
                  )}
                  <span className="text-xs text-slate-600 font-mono">
                    {alert.alert_type?.replace(/_/g,' ')}
                  </span>
                  {alert.confidence && (
                    <span className="text-xs text-slate-600">
                      conf={( alert.confidence*100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{alert.message}</p>
                <div className="text-slate-600 text-xs mt-1">
                  {new Date(Number(alert.created_at) * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
              </div>
              {!alert.resolved && (
                <button disabled
                  className="btn-outline py-1.5 px-3 text-xs flex-shrink-0">
                  Resolution coming soon
                </button>
              )}
              {alert.resolved && (
                <div className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                  <CheckCircle size={12} /> Resolved
                </div>
              )}
            </div>
          );
        })}
      </div>

      <a href={`/api/alerts`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-green-700 hover:text-green-500 transition-colors">
        <ExternalLink size={12} /> View raw alerts API
      </a>
    </div>
  );
}
