'use client';
import { dataFetch as fetch } from '@/lib/data-activity';

import { useEffect, useState } from 'react';
import { Zap, Leaf, Thermometer, Battery, Brain, Sun, AlertTriangle, TrendingUp, Activity, RefreshCw, Cpu, Eye, Radio } from 'lucide-react';
import DataQualityBadge, { qualityFor } from '@/components/ui/DataQualityBadge';
import type { DataQuality } from '@/components/ui/DataQualityBadge';
import { useCopy } from '@/i18n/copy';
import { indianNumber,indianRupees } from '@/lib/metrics';
import { readingState,startAlignedClock } from '@/lib/clock';


interface KPI { label:string; value:string|number|null; unit:string; icon:any; color:string; sub?:string; quality:Exclude<DataQuality, 'Unavailable'>; }
const empty = (v:any) => v === null || v === undefined ? 'Unavailable' : v;

export default function DashboardOverview() {
  const copyText = useCopy();
  const [data,setData]=useState<any>(null); const [loading,setLoading]=useState(true); const [lastFetch,setLastFetch]=useState('');
  const [error,setError]=useState('');
  const [now,setNow]=useState<number|null>(null);
  useEffect(()=>startAlignedClock({now:Date.now,visible:()=>!document.hidden,onTick:setNow,schedule:(callback,delay)=>{const timer=setTimeout(callback,delay);return()=>clearTimeout(timer);},listen:callback=>{document.addEventListener('visibilitychange',callback);return()=>document.removeEventListener('visibilitychange',callback);}}),[]);
  const fresh=readingState(data?.freshness||null,now)==='fresh';
  const load=async()=>{ setLoading(true); setError(''); try { const r=await fetch('/api/dashboard',{cache:'no-store',signal:AbortSignal.timeout(6000)}); if(!r.ok) throw new Error('API unavailable'); const d=await r.json(); setData(d); setLastFetch(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })); } catch{setData(null);setError('Dashboard data unavailable.');} finally{setLoading(false);} };
  useEffect(()=>{load();const refresh=()=>{if(!document.hidden)load();};const id=setInterval(refresh,5000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',refresh);};},[]);
  const kpis:KPI[]=[
    {label:'Estimated Savings Today',value:data?.daily_savings_inr,unit:'INR',icon:TrendingUp,color:'metric-savings',sub:'Recorded energy times the explicitly configured tariff',quality:'Estimated'},
    {label:'Recorded Energy Today',value:data?.daily_generation_kwh,unit:'kWh',icon:Sun,color:'metric-production',sub:data?.energy_coverage_pct != null ? copyText('{percent}% of elapsed time covered', { percent: data.energy_coverage_pct }) : 'Valid recorded intervals only',quality:'Calculated'},
    {label:'Current Power',value:fresh?data?.current_power_kw:null,unit:'kW',icon:Zap,color:'metric-production',sub:'Converted from INA219',quality:'Calculated'},
    {label:'Battery SoC',value:data?.battery_soc_pct,unit:'%',icon:Battery,color:'text-blue-400',sub:'Add battery sensor to enable',quality:'Measured'},
    {label:'BFCI Score',value:data?.bfci_score_avg,unit:'%',icon:Brain,color:'text-purple-400',sub:'Numerical coating score is unverified',quality:'Calculated'},
    {label:'Performance Ratio',value:fresh?data?.system_efficiency_pct:null,unit:'%',icon:TrendingUp,color:'text-green-400',sub:'Sensor-derived baseline',quality:'Estimated'},
    {label:'Sensor Temp',value:fresh?data?.site_sensor_temp_c:null,unit:'°C',icon:Thermometer,color:'text-amber-400',sub:'Primary temperature sensor',quality:'Measured'},
    {label:'CO₂ Offset Today',value:data?.co2_offset_today_kg,unit:'kg',icon:Leaf,color:'text-green-400',sub:'Configured grid factor',quality:'Estimated'},
    {label:'Active Alerts',value:data?.active_alerts,unit:'',icon:AlertTriangle,color:'text-red-400',sub:'Saved unresolved records',quality:'Calculated'},
  ];
  const statuses=[['Optimal',data?.panels_optimal,'text-green-400'],['Warning',data?.panels_warning,'text-amber-400'],['Critical',data?.panels_critical,'text-red-400'],['Offline',data?.panels_offline,'text-slate-400']];
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">{copyText("Solar Intelligence Dashboard")}</h1><p className="text-slate-500 text-sm mt-0.5">{copyText("Site telemetry · ")}{lastFetch ? copyText('Last refresh {time} IST', { time: lastFetch }) : copyText('Awaiting data')}</p></div><button onClick={load} disabled={loading} className="btn-green py-2 px-4 text-sm"><RefreshCw size={14} className={loading?'animate-spin':''}/>{copyText("Refresh")}</button></div>
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${!fresh?'border-amber-500/20 bg-amber-500/5':'border-green-500/20 bg-green-500/5'}`}><Radio size={16} className={!fresh?'text-amber-400':'text-green-400'}/><div className="flex-1 text-sm"><span className="text-green-400 font-semibold">{copyText("Firebase telemetry:")}</span><span className="text-slate-400 ml-2">{copyText(fresh ? 'Recent reading available' : 'Unavailable — no fresh device reading')}</span></div><DataQualityBadge quality={fresh ? (data?.simulated ? 'Estimated' : 'Calculated') : 'Unavailable'}/></div>
    {copyText(error&&<div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">{copyText(error)}</div>)}
    <p className="text-xs text-slate-200 flex flex-wrap gap-3"><span className="metric-production">{copyText('Production')}</span><span className="metric-savings">{copyText('Savings')}</span><span className="metric-consumption">{copyText('Consumption')}</span><span className="metric-grid">{copyText('Grid')}</span></p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{kpis.map((k,i)=>{const Icon=k.icon; return <div key={i} data-metric={k.label} className={`stat-card ${i<2?'col-span-2 sm:col-span-1':''}`}><div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-500">{copyText(k.label)}</span><Icon size={14} className={k.color}/></div><div className={`metric-value font-counter tabular-nums font-bold ${k.color}`}>{copyText(loading&&!data?<div className="h-7 w-16 shimmer rounded"/>:k.value == null?<span className="text-sm text-slate-400">{copyText("Unavailable")}</span>:<>{copyText(k.unit==='INR'?indianRupees(k.value):indianNumber(k.value))}<span className="text-lg ml-0.5 text-slate-400">{copyText(k.unit==='INR'?'':k.unit)}</span></>)}</div><div className="text-xs text-slate-600 mt-1">{copyText(k.sub)}</div><div className="mt-2"><DataQualityBadge quality={qualityFor(k.value, data?.simulated ? 'Estimated' : k.quality)}/></div></div>})}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="stat-card"><div className="flex items-center justify-between mb-4"><h2 className="text-white font-semibold text-sm">{copyText("Site Health")}</h2><Activity size={15} className="text-green-400"/></div><div className="flex items-end gap-3"><div className="text-xl sm:text-3xl font-counter font-black text-white">{copyText(data?.status==='OK'?'Within configured thresholds':data?.status==='WARNING'?'Warning':data?.status==='FAULT'?'Review required':'Unavailable')}</div><div className="text-sm text-slate-500 pb-1">{data?.last_seen ? copyText('Last device reading {time}', { time: new Date(data.last_seen).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) }) : copyText('No device reading yet')}</div></div></div>
      <div className="stat-card"><div className="flex items-center justify-between mb-4"><h2 className="text-white font-semibold text-sm">{copyText("Panel Fleet")}</h2><Sun size={15} className="text-yellow-400"/></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{statuses.map(([label,value,color])=><div key={label as string} className="rounded-lg border border-green-900/20 bg-green-500/5 px-3 py-2 text-center"><div className={`text-sm font-counter font-bold ${color}`}>{copyText(empty(value))}</div><div className="text-xs text-slate-500">{copyText(label)}</div></div>)}</div><div className="mt-3 text-xs text-slate-600 font-mono">{copyText("Individual panel health requires per-panel measurements.")}</div></div>
    </div>
    <div><div className="flex items-center gap-2 mb-3"><Cpu size={15} className="text-green-400"/><h2 className="text-white font-semibold">{copyText("Monitoring modules")}</h2></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[['Sensor Telemetry','BH1750 · DHT11 · INA219 · Dust'],['Camera Inspection','Configured camera and manual observations'],['Anomaly Detection','History → Isolation Forest'],['Energy Estimate','Current-condition estimate; not weather-ahead'],['Carbon Analytics','Generation × grid factor'],['Digital Twin','Coming soon']].map(([t,d])=><div key={t} className="stat-card"><div className="text-sm font-semibold text-white">{copyText(t)}</div><div className="text-xs text-slate-500 mt-1">{copyText(d)}</div></div>)}</div></div>
  </div>;
}
