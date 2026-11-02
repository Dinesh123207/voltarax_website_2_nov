'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import type {FeatureCollection} from 'geojson';
import type {StateMetric} from '@/components/map/StateMap';
import DataQualityBadge from '@/components/ui/DataQualityBadge';
import type {DataQuality} from '@/components/ui/DataQualityBadge';
import {useCopy} from '@/i18n/copy';
const StateMap=dynamic(()=>import('@/components/map/StateMap'),{ssr:false});
type Boundary={available:boolean;geojson?:FeatureCollection;attribution?:string};
type Metrics={states:StateMetric[];stateAssignment:string|null;assignmentMatched:boolean};
export default function MapPage(){
  const c=useCopy(), [boundary,setBoundary]=useState<Boundary|null>(null),[metrics,setMetrics]=useState<Metrics|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000); let active=true;
    const read=async(path:string)=>{const response=await fetch(path,{signal:controller.signal});if(!response.ok) throw Error('unavailable');return response.json();};
    Promise.allSettled([read('/api/map/boundaries'),read('/api/map/states')]).then(([b,m])=>{
      if(!active)return;
      if(b.status==='fulfilled')setBoundary(b.value);
      if(m.status==='fulfilled')setMetrics(m.value);
      setError(b.status==='rejected'||m.status==='rejected');setLoading(false);
    });
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[]);
  const quality=(value:string)=><DataQualityBadge quality={value as DataQuality}/>;
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-white">{c('India state map')}</h1>
    <p className="text-slate-300">{c('Only your authorized configured site is included. This is not a national fleet total. Other states remain unavailable.')}</p>
    {loading ? <p role="status">{c('Loading map data…')}</p> : <>
      {error && <p role="alert">{c('Map service unavailable. No values have been assumed.')}</p>}
      {!boundary?.available || !boundary.geojson ? <div role="status" className="card-dark p-6"><h2 className="font-bold">{c('Map data missing')}</h2><p>{c('Reviewed licensed boundaries must be installed and verified by the operator. No substitute outline is displayed.')}</p><DataQualityBadge quality="Unavailable"/></div>
        : <><StateMap geojson={boundary.geojson} states={metrics?.states || []}/><p className="text-sm text-slate-300">{boundary.attribution}</p></>}
      {!metrics?.assignmentMatched && <p>{c('Site-to-state boundary assignment is unverified or missing.')}</p>}
      <div aria-label={c('Recorded energy legend')} className="flex flex-wrap gap-4 text-sm">
        {(['Unavailable','Recorded zero','Above zero to below 1 kWh','1 kWh or more'] as const).map((label,index)=><span key={label} className="flex gap-2 items-center"><span aria-hidden="true" className="w-5 h-5 border border-white" style={{backgroundColor:['#475569','#fef08a','#86efac','#15803d'][index]}}/>{c(label)}</span>)}
      </div>
      <p className="text-sm text-slate-300">{c('Recorded valid-power intervals since IST midnight only. Missing periods are not extrapolated. Device counts are registry entries, not panel counts.')}</p>
      {metrics?.states.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left py-3">{c('State values for the configured site')}</caption><thead><tr>{['State or territory','Configured sites','Registered devices','Recorded energy today','Coverage seconds'].map(label=><th key={label} scope="col" className="p-3">{c(label)}</th>)}</tr></thead><tbody>{metrics.states.map(state=><tr key={state.key} className="border-t border-slate-700"><th scope="row" className="p-3">{state.name}</th>{(['site_count','registered_devices','recorded_kwh'] as const).map(key=><td key={key} className="p-3">{state[key] === null ? c('Unavailable') : key==='recorded_kwh' ? state[key]!.toFixed(6)+' kWh' : state[key]} {quality(state.quality[key])}</td>)}<td className="p-3">{state.covered_seconds === null ? c('Unavailable') : `${state.covered_seconds} / ${state.period_seconds}`} {quality(state.covered_seconds===null?'Unavailable':'Calculated')}</td></tr>)}</tbody></table></div> : <p>{c('State values unavailable. No state assignment has been assumed.')}</p>}
    </>}
  </div>;
}
