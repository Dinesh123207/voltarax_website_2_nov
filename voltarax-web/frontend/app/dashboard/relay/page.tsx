'use client';
import { useEffect, useState } from 'react';
import { Battery, RefreshCw, ExternalLink } from 'lucide-react';


export default function RelayPage() {
  const [state,   setState]   = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [s, hist] = await Promise.all([
        fetch(`/api/relay`,         { headers: h }).then(r => r.json()),
        fetch(`/api/relay/history?limit=15`, { headers: h }).then(r => r.json()),
      ]);
      setState(s);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const Dot = ({ on }: { on: boolean }) => (
    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${on ? 'bg-green-500 shadow-md shadow-green-500/50' : 'bg-slate-700'}`} />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Energy Management Relay</h1>
          <p className="text-slate-500 text-sm mt-0.5">Relay control is not connected · Coming soon</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/relay`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12} /> API</a>
          <button onClick={load} disabled={loading}
            className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current state */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-5">
            <Battery size={15} className="text-blue-400" />
            <div className="text-sm font-semibold text-white">Current Relay State</div>
            {state && state.source !== 'not-connected' && <div className="live-dot ml-auto" />}
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer h-8 rounded" />
              ))}
            </div>
          ) : state ? (
            <>
              <div className="space-y-4">
                {[
                  { label: 'Battery Charging', on: state.battery_on,  gpio: 'GPIO 25' },
                  { label: 'Load Supply',       on: state.load_on,     gpio: 'GPIO 26' },
                  { label: 'Grid Export',       on: state.grid_export, gpio: 'GPIO 27' },
                  { label: 'Spare Channel',     on: state.spare_on,    gpio: 'GPIO 14' },
                ].map(({ label, on, gpio }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-green-900/10 last:border-0">
                    <div>
                      <div className="text-slate-300 text-sm">{label}</div>
                      <div className="text-slate-600 text-xs font-mono">{gpio}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {on != null && <Dot on={on} />}
                      <span className={`text-xs font-mono font-bold ${on ? 'text-green-400' : 'text-slate-600'}`}>
                        {on == null ? 'Unavailable' : on ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-xs text-slate-500 font-mono space-y-1">
                <div>Reason: <span className="text-green-600">{state.reason}</span></div>
                <div>Commanded by: <span className="text-slate-400">{state.commanded_by}</span></div>
                {state.soc_pct && <div>SoC: <span className="text-blue-400">{state.soc_pct}%</span></div>}
                <div>At: {state.commanded_at && new Date(state.commanded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
              </div>
            </>
          ) : (
            <div className="ai-placeholder py-10">
              <Battery size={28} className="text-green-500/30" />
              <div className="text-slate-600 text-sm">Relay state unavailable</div>
              <div className="text-slate-700 text-xs">Check the local hardware gateway</div>
            </div>
          )}
        </div>

        {/* History */}
        <div className="stat-card">
          <div className="text-sm font-semibold text-white mb-4">Command History</div>
          <div className="space-y-2 overflow-auto max-h-72">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shimmer h-10 rounded" />
              ))
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">No history</div>
            ) : history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-green-900/10 text-xs">
                <div className="text-slate-600 font-mono text-[10px]">
                  {new Date(h.commanded_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
                <div className="flex gap-1.5">
                  {[
                    { l: 'B', v: h.battery_on },
                    { l: 'L', v: h.load_on },
                    { l: 'G', v: h.grid_export },
                  ].map(({ l, v }) => (
                    <span key={l}
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                        v ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-600'
                      }`}>
                      {l}
                    </span>
                  ))}
                </div>
                <div className="text-slate-600 truncate max-w-[90px]">{h.reason}</div>
                <div className="text-slate-700 text-[10px]">{h.commanded_by}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="stat-card border border-green-500/10 bg-green-500/3">
        <div className="text-xs text-green-600 font-mono font-bold mb-2">HARDWARE NOTE</div>
        <p className="text-slate-400 text-sm leading-relaxed">Relay hardware and automated control are not connected yet. Coming soon.</p>
      </div>
    </div>
  );
}
