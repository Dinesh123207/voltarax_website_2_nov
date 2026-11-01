// app/dashboard/forecast/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw, ExternalLink } from 'lucide-react';


export default function ForecastPage() {
  const [data, setData]     = useState<any>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vv_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [f, hr] = await Promise.all([
        fetch(`/api/forecast`, { headers: h }).then(r => r.json()),
        fetch(`/api/forecast/hourly`, { headers: h }).then(r => r.json()),
      ]);
      setData(f?.success === false ? null : f); setHourly(Array.isArray(hr) ? hr : (hr?.profile || []));
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const kpis = data ? [
    { label:'Next 1h',  value: data.forecast_1h_kw,   unit:'kW',  conf: data.confidence?.[0] },
    { label:'Next 6h',  value: data.forecast_6h_kwh,  unit:'kWh', conf: data.confidence?.[1] },
    { label:'Today',    value: data.forecast_24h_kwh, unit:'kWh', conf: data.confidence?.[2] },
    { label:'This Week',value: data.forecast_7d_kwh,  unit:'kWh', conf: data.confidence?.[3] },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AI Energy Forecast</h1>
        <div className="flex gap-2">
          <a href={`/api/forecast`} target="_blank" rel="noopener noreferrer" className="btn-outline py-2 px-3 text-xs"><ExternalLink size={12}/> API</a>
          <button onClick={load} disabled={loading} className="btn-green py-2 px-3 text-xs disabled:opacity-60"><RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh</button>
        </div>
      </div>
      <p className="text-sm text-amber-300">Estimate from current conditions, not a weather-ahead forecast. Confidence values are fixed assumptions, not measured model confidence.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({length:4}).map((_,i) => <div key={i} className="stat-card"><div className="shimmer h-16 rounded"/></div>)
        : kpis.map(k => (
          <div key={k.label} className="stat-card">
            <div className="text-xs text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-counter font-bold text-green-400">{k.value}<span className="text-base text-slate-500 ml-1">{k.unit}</span></div>
            {k.conf && <div className="text-xs text-slate-600 mt-1">Confidence: {(k.conf*100).toFixed(0)}%</div>}
          </div>
        ))}
      </div>

      {data?.recommendation && (
        <div className="stat-card border border-green-500/20 bg-green-500/5">
          <div className="text-xs text-green-500 font-mono font-bold mb-2">AI RECOMMENDATION</div>
          <p className="text-slate-300 text-sm leading-relaxed">{data.recommendation}</p>
          <div className="text-xs text-slate-600 mt-2 font-mono">Model: {data.model_version} · {data.generated_at && new Date(data.generated_at).toLocaleTimeString('en-IN')}</div>
        </div>
      )}

      {/* Hourly bar chart (CSS only) */}
      {hourly.length > 0 && (
        <div className="stat-card">
          <div className="text-sm font-semibold text-white mb-4">Recent hourly averages · Calculated from readings</div>
          <div className="flex items-end gap-0.5 h-32">
            {hourly.map((h: any) => {
              const maxKw = Math.max(...hourly.map((x:any) => x.kw));
              const pct   = maxKw > 0 ? (h.kw / maxKw) * 100 : 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#111a14] border border-green-900/40 rounded px-1.5 py-0.5 text-[9px] text-green-400 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-mono">
                    {h.hour}: {h.kw} kW
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${h.is_forecast ? 'bg-blue-500/40' : 'bg-green-500/60'}`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  {Number.parseInt(String(h.hour).slice(0, 2), 10) % 4 === 0 && <div className="text-[8px] text-slate-600 font-mono">{h.hour}</div>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-600">
            <span><span className="text-green-500">■</span> Actual</span>
            <span><span className="text-blue-500">■</span> Forecast</span>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="ai-placeholder">
          <TrendingUp size={32} className="text-green-500/40"/>
          <div className="text-white font-semibold">Forecast unavailable</div>
          <div className="text-slate-600 text-sm">Collect hardware telemetry to enable AI forecasting</div>
          <a href={`/api/forecast`} target="_blank" rel="noopener noreferrer" className="btn-outline py-2 px-4 text-xs mt-2">Try API directly</a>
        </div>
      )}
    </div>
  );
}
