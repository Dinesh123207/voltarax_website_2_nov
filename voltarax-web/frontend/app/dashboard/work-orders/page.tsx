'use client';
import { useCallback, useEffect, useState } from 'react';
import { Wrench, RefreshCw, ExternalLink, CheckCircle, Plus } from 'lucide-react';


const PRI_COL: Record<string, string> = {
  critical: 'text-red-400', high: 'text-orange-400',
  medium: 'text-amber-400', low: 'text-slate-400',
};
const STS_COL: Record<string, string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  closed: 'text-green-400 bg-green-500/10 border-green-500/20',
};

export default function WorkOrdersPage() {
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('open');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/work-orders?status=${filter}`, { headers: h });
      if (r.ok) setOrders(await r.json());
    } catch {}
    finally { setLoading(false); }
  }, [filter]);

  const close = async (id: number) => {
    const token = localStorage.getItem('vv_token');
    try {
      await fetch(`/api/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'closed' }),
      });
      load();
    } catch {}
  };

  useEffect(() => { load(); }, [load]);

  const summary = {
    open:        orders.filter(o => o.status === 'open').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    closed:      orders.filter(o => o.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">Work-order workflow is not connected · Coming soon</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/work-orders`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12} /> API</a>
          <button onClick={load} disabled={loading}
            className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['open', 'in_progress', 'closed', ''].map(s => (
          <button key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
              filter === s
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-green-900/30 text-slate-500 hover:text-white'
            }`}>
            {s === '' ? 'All' : s.replace('_', ' ')}
            {s === 'open' && summary.open > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px]">
                {summary.open}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="stat-card overflow-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-green-900/20">
              {['#', 'Panel', 'Title', 'Priority', 'Status', 'Created', 'Action'].map(h => (
                <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider py-2 px-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-green-900/10">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-3 px-3"><div className="shimmer h-4 rounded w-14" /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14">
                  <CheckCircle size={36} className="text-green-500/30 mx-auto mb-3" />
                  <div className="text-slate-600 text-sm">Work orders are unavailable · Coming soon</div>
                </td>
              </tr>
            ) : orders.map(o => (
              <tr key={o.id} className="border-b border-green-900/10 hover:bg-green-500/3 transition-colors">
                <td className="py-2.5 px-3 text-slate-600 text-xs font-mono">#{o.id}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-green-400 text-sm">{o.panel_label || '—'}</td>
                <td className="py-2.5 px-3 text-slate-300 text-sm max-w-[180px] truncate" title={o.title}>{o.title}</td>
                <td className={`py-2.5 px-3 text-xs font-bold uppercase font-mono ${PRI_COL[o.priority] || 'text-slate-400'}`}>
                  {o.priority}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold capitalize ${STS_COL[o.status] || ''}`}>
                    {o.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-500">
                  {new Date(o.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="py-2.5 px-3">
                  {o.status !== 'closed' && (
                    <button onClick={() => close(o.id)}
                      className="text-xs text-green-600 hover:text-green-400 transition-colors font-semibold">
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
