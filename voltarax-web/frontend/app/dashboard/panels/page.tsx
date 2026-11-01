'use client';
import { useEffect, useState } from 'react';
import { Sun, RefreshCw, ExternalLink, Filter } from 'lucide-react';


interface Panel {
  id: number; label: string; row_label: string; col_number: number;
  status: string; efficiency_pct: number | null; power_w: number | null;
  voltage_v: number | null; temp_c: number | null;
  bfci_score: number | null; cv_class: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  optimal:  'text-green-400 bg-green-500/10 border-green-500/20',
  warning:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  offline:  'text-slate-500 bg-slate-500/10 border-slate-500/20',
  unknown:  'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

const CV_BADGE: Record<string, string> = {
  clean:        'text-green-400',
  dusty:        'text-amber-400',
  cracked:      'text-red-400',
  bio_degraded: 'text-orange-400',
  pending:      'text-slate-500',
};

export default function PanelsPage() {
  const [panels,  setPanels]  = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [rowFilter, setRowFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const url   = `/api/panels${rowFilter !== 'all' ? `?row=${rowFilter}` : ''}`;
      const r     = await fetch(url, {
        headers: (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>,
      });
      if (r.ok) {
        const data = await r.json();
        setPanels(Array.isArray(data) ? data : []);
      }
    } catch { /* show empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [rowFilter]);

  const filtered = filter === 'all' ? panels : panels.filter(p => p.status === filter);

  const summary = {
    optimal:  panels.filter(p => p.status === 'optimal').length,
    warning:  panels.filter(p => p.status === 'warning').length,
    critical: panels.filter(p => p.status === 'critical').length,
    offline:  panels.filter(p => p.status === 'offline').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Estimated from site-level reading (power divided across configured panel count). Individual panels are not measured.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/panels`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs">
            <ExternalLink size={12} /> API
          </a>
          <button onClick={load} disabled={loading} className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(summary).map(([status, count]) => (
          <button key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`stat-card text-center cursor-pointer transition-all ${
              filter === status ? 'border-green-500/60' : ''
            }`}>
            <div className={`text-2xl font-counter font-bold ${STATUS_STYLE[status].split(' ')[0]}`}>{count}</div>
            <div className="text-xs text-slate-500 capitalize mt-0.5">{status}</div>
          </button>
        ))}
      </div>

      {/* Row + status filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-slate-500" />
        <span className="text-xs text-slate-500">Row:</span>
        {['all','A','B','C','D'].map(r => (
          <button key={r}
            onClick={() => setRowFilter(r)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
              rowFilter === r
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-green-900/30 text-slate-500 hover:text-white hover:border-slate-600'
            }`}>
            {r === 'all' ? 'All' : `Row ${r}`}
          </button>
        ))}
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')}
            className="px-3 py-1 rounded-lg text-xs border border-amber-500/40 text-amber-400 bg-amber-500/10">
            × {filter}
          </button>
        )}
      </div>

      {/* Panel grid visual (8×4) */}
      <div className="stat-card">
        <div className="text-xs text-slate-500 font-mono mb-3">PANEL GRID — JAIPUR BIOSOLAR SITE</div>
        <div className="space-y-2">
          {['A','B','C','D'].map(row => (
            <div key={row} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-mono w-4">{row}</span>
              <div className="flex gap-1.5 flex-1">
                {Array.from({length:8},(_,i)=>i+1).map(col => {
                  const label = `${row}${col}`;
                  const p = panels.find(x => x.label === label);
                  const st = p?.status || 'unknown';
                  return (
                    <div key={col}
                      title={`${label} — ${st} ${p?.efficiency_pct ? `${p.efficiency_pct.toFixed(1)}%` : ''}`}
                      className={`flex-1 h-8 rounded flex items-center justify-center text-[9px] font-mono font-bold cursor-default border ${STATUS_STYLE[st] || STATUS_STYLE.unknown} ${
                        st === 'critical' ? 'animate-pulse' : ''
                      }`}>
                      {col}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-600">
          {['optimal','warning','critical','offline'].map(s => (
            <span key={s} className={STATUS_STYLE[s].split(' ')[0]}>■ {s}</span>
          ))}
        </div>
      </div>

      {/* Panel table */}
      <div className="stat-card overflow-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-green-900/20">
              {['Panel','Status','Efficiency','Power (W)','Voltage (V)','Temp (°C)','BFCI','CV Class'].map(h => (
                <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider py-2 px-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:8}).map((_,i) => (
                <tr key={i} className="border-b border-green-900/10">
                  {Array.from({length:8}).map((_,j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="shimmer h-4 rounded w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-600">
                  {panels.length === 0
                    ? 'No panel data — check the local hardware gateway'
                    : 'No panels match current filter'}
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-green-900/10 hover:bg-green-500/3 transition-colors">
                <td className="py-3 px-3 font-mono font-bold text-green-400 text-sm">{p.label}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLE[p.status] || STATUS_STYLE.unknown}`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-sm text-slate-300">
                  {p.efficiency_pct != null ? `${p.efficiency_pct.toFixed(1)}%` : '—'}
                </td>
                <td className="py-3 px-3 font-mono text-sm text-slate-300">
                  {p.power_w != null ? p.power_w.toFixed(0) : '—'}
                </td>
                <td className="py-3 px-3 font-mono text-sm text-slate-300">
                  {p.voltage_v != null ? p.voltage_v.toFixed(1) : '—'}
                </td>
                <td className={`py-3 px-3 font-mono text-sm ${p.temp_c && p.temp_c > 55 ? 'text-red-400' : 'text-slate-300'}`}>
                  {p.temp_c != null ? `${p.temp_c.toFixed(1)}` : '—'}
                </td>
                <td className={`py-3 px-3 font-mono text-sm ${
                  p.bfci_score == null ? 'text-slate-600' :
                  p.bfci_score < 65 ? 'text-red-400' :
                  p.bfci_score < 75 ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {p.bfci_score != null ? `${p.bfci_score.toFixed(1)}%` : '—'}
                </td>
                <td className={`py-3 px-3 text-xs font-mono ${CV_BADGE[p.cv_class || 'pending'] || 'text-slate-500'}`}>
                  {p.cv_class?.replace('_','-') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div className="text-xs text-slate-600 mt-3 px-3">
            Showing {filtered.length} of {panels.length} panels
          </div>
        )}
      </div>
    </div>
  );
}
