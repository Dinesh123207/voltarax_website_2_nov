'use client';
import { useEffect, useState } from 'react';
import { Eye, RefreshCw, ExternalLink, Play } from 'lucide-react';


const CV_COLORS: Record<string,string> = {
  clean:        'text-green-400 bg-green-500/10 border-green-500/20',
  dusty:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  cracked:      'text-red-400   bg-red-500/10   border-red-500/20',
  bio_degraded: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  pending:      'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

export default function CVPage() {
  const [detections, setDetections] = useState<any[]>([]);
  const [summary,    setSummary]    = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [clsFilter,  setClsFilter]  = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const token = null;
      const h: Record<string, string> = token ? { 'x-voltarax-request': '1' } : {};
      const [d, s] = await Promise.all([
        fetch(`/api/cv`,         { headers: h }).then(r => r.json()),
        fetch(`/api/cv/summary`, { headers: h }).then(r => r.json()),
      ]);
      setDetections(Array.isArray(d) ? d : []);
      setSummary(s?.note ? null : s?.counts ? s : null);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = clsFilter === 'all' ? detections : detections.filter(d => d.cv_class === clsFilter);
  const totalLoss = detections.reduce((s,d) => s + (d.eff_loss_pct || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Computer Vision Inspection</h1>
          <p className="text-slate-500 text-sm mt-0.5">Camera inspection is not connected · Coming soon</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/cv/summary`} target="_blank" rel="noopener noreferrer" className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12}/> API</a>
          <button disabled className="btn-outline py-2 px-3 text-xs text-green-400 border-green-500/40 disabled:opacity-60">
            <Play size={12} /> Scan coming soon
          </button>
          <button onClick={load} disabled={loading} className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {summary ? [
          { label:'Total',       value: summary.total_panels,           color:'text-white'    },
          { label:'Clean',       value: summary.counts?.clean        ||0, color:'text-green-400'},
          { label:'Dusty',       value: summary.counts?.dusty        ||0, color:'text-amber-400'},
          { label:'Cracked',     value: summary.counts?.cracked      ||0, color:'text-red-400'  },
          { label:'Bio-Degraded',value: summary.counts?.bio_degraded ||0, color:'text-orange-400'},
          { label:'Total Loss',  value: `${totalLoss.toFixed(1)}%`,      color:'text-red-400'  },
        ].map(k => (
          <div key={k.label} className="stat-card text-center">
            <div className="text-xs text-slate-500 mb-1">{k.label}</div>
            <div className={`text-xl font-counter font-bold ${k.color}`}>{k.value}</div>
          </div>
        )) : loading ? Array.from({length:6}).map((_,i) => <div key={i} className="stat-card"><div className="shimmer h-12 rounded"/></div>) : <div className="stat-card col-span-full text-slate-400">Inspection data unavailable. Coming soon.</div>}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all','clean','dusty','cracked','bio_degraded'].map(cls => (
          <button key={cls} onClick={() => setClsFilter(cls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${clsFilter===cls?'border-green-500 text-green-400 bg-green-500/10':'border-green-900/30 text-slate-500 hover:text-white'}`}>
            {cls.replace('_','-')}
            {cls!=='all' && <span className="ml-1 opacity-50">{detections.filter(d=>d.cv_class===cls).length}</span>}
          </button>
        ))}
      </div>

      <div className="stat-card overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white">CV Detections</div>
          <div className="text-xs text-slate-600 font-mono">Inspection not connected</div>
        </div>
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b border-green-900/20">
              {['Panel','Class','Confidence','Eff Loss','Model','Scanned At'].map(h => (
                <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider py-2 px-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:8}).map((_,i)=>(
              <tr key={i} className="border-b border-green-900/10">{Array.from({length:6}).map((_,j)=>(
                <td key={j} className="py-3 px-3"><div className="shimmer h-4 rounded w-14"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={6} className="text-center py-14">
                <Eye size={36} className="text-slate-700 mx-auto mb-3"/>
                <div className="text-slate-600 text-sm">No CV detections — connect camera hardware</div>
              </td></tr>
            ) : filtered.map((d,i) => (
              <tr key={i} className="border-b border-green-900/10 hover:bg-green-500/3 transition-colors">
                <td className="py-2.5 px-3 font-mono font-bold text-green-400 text-sm">{d.panel_label}</td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold capitalize ${CV_COLORS[d.cv_class]||CV_COLORS.pending}`}>
                    {d.cv_class?.replace('_','-')}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono text-sm text-slate-300">{(d.confidence*100).toFixed(1)}%</td>
                <td className={`py-2.5 px-3 font-mono text-sm ${d.eff_loss_pct>10?'text-red-400':d.eff_loss_pct>0?'text-amber-400':'text-green-400'}`}>
                  {d.eff_loss_pct?.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-600 font-mono">{d.model_ver}</td>
                <td className="py-2.5 px-3 text-xs text-slate-500">{new Date(d.scanned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
