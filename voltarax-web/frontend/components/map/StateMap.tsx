'use client';
import {useEffect, useRef} from 'react';
import L from 'leaflet';
import type {FeatureCollection} from 'geojson';
import 'leaflet/dist/leaflet.css';
import {useCopy} from '@/i18n/copy';
export type StateMetric = {key:string;name:string;site_count:number|null;registered_devices:number|null;recorded_kwh:number|null;covered_seconds:number|null;period_seconds:number;simulated:boolean;quality:Record<string,string>};
export const mapFill = (value:number|null) => value === null ? '#475569' : value === 0 ? '#fef3c7' : value < 1 ? '#fcd34d' : '#b45309';
export default function StateMap({geojson,states}:{geojson:FeatureCollection;states:StateMetric[]}) {
  const element=useRef<HTMLDivElement>(null), c=useCopy();
  useEffect(()=>{
    if(!element.current) return;
    const metrics=new Map(states.map(state=>[state.key,state]));
    const map=L.map(element.current,{scrollWheelZoom:false,attributionControl:false});
    const layer=L.geoJSON(geojson,{
      style:feature=>({color:'#f8fafc',weight:1,fillOpacity:0.85,fillColor:mapFill(metrics.get(feature?.properties?.key)?.recorded_kwh ?? null)}),
      onEachFeature:(feature,item)=>{
        const metric=metrics.get(feature.properties?.key), tip=document.createElement('div');
        const energy=metric?.recorded_kwh;
        tip.textContent=`${feature.properties?.name || ''}: ${c('Recorded energy today')} ${energy === null || energy === undefined ? c('Unavailable') : energy.toFixed(6)+' kWh'} (${c(metric?.quality.recorded_kwh || 'Unavailable')})`;
        item.bindTooltip(tip,{sticky:true});
      },
    }).addTo(map);
    const bounds=layer.getBounds();if(bounds.isValid()) map.fitBounds(bounds,{padding:[12,12]});
    const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(element.current);
    return ()=>{observer.disconnect();map.remove();};
  },[geojson,states,c]);
  return <div ref={element} className="relative isolate z-0 h-[420px] rounded-xl bg-slate-900" role="region" aria-label={c('State boundary map. Equivalent values are in the table below.')} />;
}
