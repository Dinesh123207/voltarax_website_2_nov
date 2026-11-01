'use client';
import { useEffect, useState } from 'react';
import { Zap, Leaf, Thermometer, Battery, Brain, Sun, AlertTriangle, TrendingUp, Activity, RefreshCw, Cpu, Eye, Radio } from 'lucide-react';
import DataQualityBadge, { qualityFor } from '@/components/ui/DataQualityBadge';
import type { DataQuality } from '@/components/ui/DataQualityBadge';

interface KPI { label:string; value:string|number|null; unit:string; icon:any; color:string; sub?:string; quality:Exclude<DataQuality, 'Unavailable'>; }
const empty = (v:any) => v === null || v === undefined ? 'Unavailable' : v;

export default function DashboardOverview() {
  const [data,setData]=useState<any>(null); const [loading,setLoading]=useState(true); const [lastFetch,setLastFetch]=useState('');
  const [error,setError]=useState('');
  const load=async()=>{ setLoading(true); setError(''); try { const r=await fetch('/api/dashboard'); if(!r.ok) throw new Error('API unavailable'); const d=await r.json(); setData(d); setLastFetch(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })); } catch{setData(null);setError('Dashboard data unavailable.');} finally{setLoading(false);} };
  useEffect(()=>{load(); const id=setInterval(load,5000); return()=>clearInterval(id)},[]);
  const kpis:KPI[]=[
    {label:'Current Power',value:data?.current_power_kw,unit:'kW',icon:Zap,color:'text-green-400',sub:'Converted from INA219',quality:'Calculated'},
    {label:'Recorded Energy Today',value:data?.daily_generation_kwh,unit:'kWh',icon:Sun,color:'text-yellow-400',sub:data?.energy_coverage_pct != null ? `${data.energy_coverage_pct}% of elapsed time covered` : 'Valid recorded intervals only',quality:'Calculated'},
    {label:'Battery SoC',value:data?.battery_soc_pct,unit:'%',icon:Battery,color:'text-blue-400',sub:'Add battery sensor to enable',quality:'Measured'},
    {label:'BFCI Score',value:data?.bfci_score_avg,unit:'%',icon:Brain,color:'text-purple-400',sub:'Requires coating sensor',quality:'Calculated'},
    {label:'Performance Ratio',value:data?.system_efficiency_pct,unit:'%',icon:TrendingUp,color:'text-green-400',sub:'Sensor-derived baseline',quality:'Estimated'},
    {label:'Sensor Temp',value:data?.site_sensor_temp_c,unit:'°C',icon:Thermometer,color:'text-amber-400',sub:'Primary temperature sensor',quality:'Measured'},
    {label:'CO₂ Offset Today',value:data?.co2_offset_today_kg,unit:'kg',icon:Leaf,color:'text-green-400',sub:'Configured grid factor',quality:'Estimated'},
    {label:'Active Alerts',value:data?.active_alerts,unit:'',icon:AlertTriangle,color:'text-red-400',sub:'Saved unresolved records',quality:'Calculated'},
  ];
  const statuses=[['Optimal',data?.panels_optimal,'text-green-400'],['Warning',data?.panels_warning,'text-amber-400'],['Critical',data?.panels_critical,'text-red-400'],['Offline',data?.panels_offline,'text-slate-400']];
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">Solar Intelligence Dashboard</h1><p className="text-slate-500 text-sm mt-0.5">Site telemetry · {lastFetch?`Last refresh ${lastFetch} IST`:'Awaiting data'}</p></div><button onClick={load} disabled={loading} className="btn-green py-2 px-4 text-sm"><RefreshCw size={14} className={loading?'animate-spin':''}/>Refresh</button></div>
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${data?.telemetry_fresh !== true?'border-amber-500/20 bg-amber-500/5':'border-green-500/20 bg-green-500/5'}`}><Radio size={16} className={data?.telemetry_fresh !== true?'text-amber-400':'text-green-400'}/><div className="flex-1 text-sm"><span className="text-green-400 font-semibold">Firebase telemetry:</span><span className="text-slate-400 ml-2">{data?.telemetry_fresh === true ? 'Recent reading available' : 'Unavailable — no fresh device reading'}</span></div><DataQualityBadge quality={data?.telemetry_fresh === true ? (data?.simulated ? 'Estimated' : 'Calculated') : 'Unavailable'}/></div>
    {error&&<div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">{error}</div>}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{kpis.map((k,i)=>{const Icon=k.icon; return <div key={i} className="stat-card"><div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-500">{k.label}</span><Icon size={14} className={k.color}/></div><div className={`text-2xl font-counter font-bold ${k.color}`}>{loading&&!data?<div className="h-7 w-16 shimmer rounded"/>:k.value == null?<span className="text-sm text-slate-400">Unavailable</span>:<>{empty(k.value)}<span className="text-lg ml-0.5 text-slate-400">{k.unit}</span></>}</div><div className="text-xs text-slate-600 mt-1">{k.sub}</div><div className="mt-2"><DataQualityBadge quality={qualityFor(k.value, data?.simulated ? 'Estimated' : k.quality)}/></div></div>})}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="stat-card"><div className="flex items-center justify-between mb-4"><h3 className="text-white font-semibold text-sm">Site Health</h3><Activity size={15} className="text-green-400"/></div><div className="flex items-end gap-3"><div className="text-xl sm:text-3xl font-counter font-black text-white">{data?.status==='OFFLINE'?'Unavailable':data?.status||'Unavailable'}</div><div className="text-sm text-slate-500 pb-1">{data?.last_seen?`Last device reading ${new Date(data.last_seen).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`:'No device reading yet'}</div></div></div>
      <div className="stat-card"><div className="flex items-center justify-between mb-4"><h3 className="text-white font-semibold text-sm">Panel Fleet</h3><Sun size={15} className="text-yellow-400"/></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{statuses.map(([label,value,color])=><div key={label as string} className="rounded-lg border border-green-900/20 bg-green-500/5 px-3 py-2 text-center"><div className={`text-sm font-counter font-bold ${color}`}>{empty(value)}</div><div className="text-xs text-slate-500">{label}</div></div>)}</div><div className="mt-3 text-xs text-slate-600 font-mono">Individual panel health requires per-panel measurements.</div></div>
    </div>
    <div><div className="flex items-center gap-2 mb-3"><Cpu size={15} className="text-green-400"/><h2 className="text-white font-semibold">Hardware-ready modules</h2></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[['Sensor Telemetry','BH1750 · DHT11 · INA219 · Dust'],['Camera Inspection','Coming soon on the web dashboard'],['Anomaly Detection','History → Isolation Forest'],['Energy Estimate','Current-condition estimate; not weather-ahead'],['Carbon Analytics','Generation × grid factor'],['Digital Twin','Coming soon']].map(([t,d])=><div key={t} className="stat-card"><div className="text-sm font-semibold text-white">{t}</div><div className="text-xs text-slate-500 mt-1">{d}</div></div>)}</div></div>
  </div>;
}
