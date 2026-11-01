'use client';
import { useEffect, useState } from 'react';
import { Brain, RefreshCw, ExternalLink } from 'lucide-react';


export default function BFCIPage() {
  const [fleet,   setFleet]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shap,    setShap]    = useState<Record<string,number>>({});

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [f, s] = await Promise.all([
        fetch(`/api/bfci`, { headers: h }).then(r => r.json()),
        fetch(`/api/bfci/shap/1`, { headers: h }).then(r => r.json()),
      ]);
      setFleet(Array.isArray(f) ? f : []);
      if (s?.shap) setShap(s.shap); else if (s && typeof s === 'object') setShap(s);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const avg     = fleet.length ? fleet.reduce((s,p) => s + p.bfci_score, 0) / fleet.length : 0;
  const critical = fleet.filter(p => p.bfci_score < 65).length;
  const warning  = fleet.filter(p => p.bfci_score >= 65 && p.bfci_score < 75).length;
  const good     = fleet.filter(p => p.bfci_score >= 75).length;

  const scoreColor = (s: number) =>
    s < 65 ? 'text-red-400' : s < 75 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">BFCI — Bio-Coating Intelligence</h1>
          <p className="text-slate-500 text-sm mt-0.5">Coating health monitoring</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/bfci`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12}/> API</a>
          <button onClick={load} disabled={loading}
            className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {/* Fleet KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Fleet Avg BFCI', value: avg.toFixed(1), unit:'%', color:'text-green-400' },
          { label:'Good (≥75%)',    value: good,    unit:'panels', color:'text-green-400' },
          { label:'Warning (<75%)', value: warning, unit:'panels', color:'text-amber-400' },
          { label:'Critical (<65%)',value: critical,unit:'panels', color:'text-red-400' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="text-xs text-slate-500 mb-1">{k.label}</div>
            {loading ? <div className="shimmer h-8 w-20 rounded mt-1"/> :
              <div className={`text-2xl font-counter font-bold ${k.color}`}>
                {k.value}<span className="text-sm text-slate-500 ml-1">{k.unit}</span>
              </div>
            }
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fleet table */}
        <div className="lg:col-span-2 stat-card overflow-auto">
          <div className="text-sm font-semibold text-white mb-4">Fleet BFCI Scores</div>
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-green-900/20">
                {['Panel','BFCI Score','Status','UV Abs.','Days to Recoat','Batch'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider py-2 px-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i) => (
                <tr key={i} className="border-b border-green-900/10">
                  {Array.from({length:6}).map((_,j) => (
                    <td key={j} className="py-3 px-2"><div className="shimmer h-4 rounded w-14"/></td>
                  ))}
                </tr>
              )) : fleet.map(p => (
                <tr key={p.panel_id} className="border-b border-green-900/10 hover:bg-green-500/3 transition-colors">
                  <td className="py-2.5 px-2 font-mono font-bold text-green-400 text-sm">{p.panel_label}</td>
                  <td className={`py-2.5 px-2 font-counter font-bold text-base ${scoreColor(p.bfci_score)}`}>
                    {p.bfci_score.toFixed(1)}%
                    <div className="w-full h-1 rounded-full bg-green-900/30 mt-0.5">
                      <div className={`h-1 rounded-full ${p.bfci_score<65?'bg-red-500':p.bfci_score<75?'bg-amber-500':'bg-green-500'}`}
                        style={{width:`${p.bfci_score}%`}}/>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                      p.status==='critical'?'bg-red-500/20 text-red-400':
                      p.status==='warning'?'bg-amber-500/20 text-amber-400':
                      'bg-green-500/20 text-green-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 font-mono text-sm text-slate-400">
                    {p.uv_absorption_pct?.toFixed(1) ?? '—'}%
                  </td>
                  <td className={`py-2.5 px-2 font-mono text-sm ${p.days_to_recoat<15?'text-red-400':p.days_to_recoat<30?'text-amber-400':'text-slate-400'}`}>
                    {p.days_to_recoat ?? '—'}d
                  </td>
                  <td className="py-2.5 px-2 text-xs text-slate-600 font-mono">{p.batch_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Factor importance panel */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={15} className="text-green-500"/>
            <div className="text-sm font-semibold text-white">Factor importance</div>
          </div>
          <div className="text-xs text-slate-600 mb-3">Panel A1 — top predictors</div>
          {Object.keys(shap).length === 0 && !loading ? (
            <div className="ai-placeholder py-8">
              <Brain size={24} className="text-green-500/30"/>
              <div className="text-slate-600 text-xs">Factor data unavailable</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(loading ? Array.from({length:8}) : Object.entries(shap).slice(0,10)).map((entry, i) => {
                if (loading) return <div key={i} className="shimmer h-6 rounded"/>;
                const [feat, val] = entry as [string, number];
                const pct = Math.round(val * 100);
                return (
                  <div key={feat} className="flex items-center gap-2">
                    <div className="text-xs text-slate-500 w-28 truncate font-mono">{feat.replace(/_/g,' ')}</div>
                    <div className="flex-1 h-2 bg-green-900/30 rounded-full overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                        style={{width:`${Math.min(pct*3,100)}%`}}/>
                    </div>
                    <div className="text-xs text-green-400 font-mono w-8 text-right">{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
