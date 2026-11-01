'use client';
import { useEffect, useState } from 'react';
import { Leaf, RefreshCw, ExternalLink, Globe, TrendingUp } from 'lucide-react';
import DataQualityBadge from '@/components/ui/DataQualityBadge';


export default function CarbonPage() {
  const [data,    setData]    = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [c, m] = await Promise.all([
        fetch(`/api/carbon`,           { headers: h }).then(r => r.json()),
        fetch(`/api/carbon/monthly?months=6`, { headers: h }).then(r => r.json()),
      ]);
      setData(c?.success === false ? null : c);
      setMonthly(Array.isArray(m) ? m : (m?.months || []));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Carbon Impact Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Estimated from generation and the configured grid factor</p>
          <DataQualityBadge quality={data ? 'Estimated' : 'Unavailable'} />
        </div>
        <div className="flex gap-2">
          <a href={`/api/carbon`} target="_blank" rel="noopener noreferrer"
            className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12} /> API</a>
          <button onClick={load} disabled={loading}
            className="btn-green py-2 px-3 text-xs disabled:opacity-60">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card"><div className="shimmer h-16 rounded" /></div>
        )) : data ? [
          { label: "Today's CO₂ Saved",  value: data.today_co2_kg,     unit: 'kg',  color: 'text-green-400' },
          { label: 'This Month',          value: data.month_co2_kg,     unit: 'kg',  color: 'text-green-400' },
          { label: 'This Year',           value: data.year_co2_kg,      unit: 'kg',  color: 'text-green-400' },
          { label: 'Trees Equivalent',    value: data.trees_equivalent,  unit: '🌳', color: 'text-green-400' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="text-xs text-slate-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-counter font-bold ${k.color}`}>
              {k.value}<span className="text-sm text-slate-500 ml-1">{k.unit}</span>
            </div>
          </div>
        )) : (
          <div className="col-span-4 ai-placeholder py-10">
            <Leaf size={28} className="text-green-500/30" />
            <div className="text-slate-600 text-sm">Carbon data unavailable</div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        {monthly.length > 0 && (
          <div className="lg:col-span-2 stat-card">
            <div className="text-sm font-semibold text-white mb-4">Monthly CO₂ Offset (kg)</div>
            <div className="flex items-end gap-2 h-36">
              {monthly.map((m: any, i: number) => {
                const max = Math.max(...monthly.map((x: any) => x.co2_kg));
                const pct = max > 0 ? (m.co2_kg / max) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#111a14] border border-green-900/40 rounded px-2 py-1 text-[9px] text-green-400 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-mono">
                      {m.co2_kg?.toFixed(1)} kg
                    </div>
                    <div
                      className={`w-full rounded-t transition-all ${m.is_projected ? 'bg-blue-500/40 border border-blue-500/20 border-b-0' : 'bg-green-500/60'}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <div className="text-[8px] text-slate-600 text-center leading-tight">
                      {m.month?.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-1 text-xs text-slate-600">
              <span><span className="text-green-500">■</span> Actual</span>
              <span><span className="text-blue-500">■</span> Projected</span>
            </div>
          </div>
        )}

        {/* Impact summary */}
        {data && (
          <div className="stat-card flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-green-500" />
              <div className="text-sm font-semibold text-white">Impact Summary</div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Today Generation',  value: `${data.today_kwh} kWh` },
                { label: 'Grid Saved (Year)', value: `₹${data.grid_saved_inr?.toLocaleString()}` },
                { label: 'Emission Factor',   value: `${data.emission_factor} kg/kWh` },
                { label: 'Monthly kWh',       value: `${data.month_kwh} kWh` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-green-900/10 last:border-0">
                  <div className="text-slate-400 text-sm">{label}</div>
                  <div className="text-green-400 font-mono font-bold text-sm">{value}</div>
                </div>
              ))}
            </div>
            <button disabled
              className="btn-green w-full justify-center py-2.5 text-sm mt-auto disabled:opacity-60">
              <TrendingUp size={14} /> ESG report coming soon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
