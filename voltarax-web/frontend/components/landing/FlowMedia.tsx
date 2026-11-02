'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useCopy } from '@/i18n/copy';

/** Original SVG/CSS diagram first; bounded local video only near the viewport. */
export default function FlowMedia({ variant = 'hero' }: { variant?: 'hero' | 'explainer' }) {
  const c=useCopy(),locale=useLocale(),id=useId().replaceAll(':','');
  const holder=useRef<HTMLElement>(null),video=useRef<HTMLVideoElement>(null);
  const [near,setNear]=useState(false),[motion,setMotion]=useState(false),[visible,setVisible]=useState(false),[paused,setPaused]=useState(false),[failed,setFailed]=useState(false);
  const active=near&&motion&&visible&&!paused&&!failed;
  useEffect(()=>{
    const query=window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh=()=>{setMotion(!query.matches && !(navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData);setVisible(!document.hidden);};
    refresh();query.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
    const observer=new IntersectionObserver(entries=>setNear(entries.some(entry=>entry.isIntersecting)),{rootMargin:'160px'});
    if(holder.current)observer.observe(holder.current);
    return()=>{observer.disconnect();query.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  useEffect(()=>{if(active)video.current?.play().catch(error=>{if(error.name!=='AbortError')setFailed(true);});else video.current?.pause();},[active]);
  const title=variant==='hero'?'From readings to a site view':'How the configured system connects';
  const labels=['Sensors','Firebase','Authorized API','Site view'];
  return <figure ref={holder} className="flow-media rounded-2xl border border-slate-600 bg-[#102017] p-4 min-w-0" data-flow-variant={variant} data-motion={active?'running':'paused'}>
    <figcaption className="font-semibold text-slate-100 mb-3">{c(title)}</figcaption>
    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#0a0f0d]">
      {variant==='hero' || !active ? <svg viewBox="0 0 360 270" role="img" aria-labelledby={id} className="h-full w-full">
        <title id={id}>{c('Illustration of sensors, saved readings, authorized API and site view')}</title>
        <defs><marker id={id+'arrow'} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#cbd5e1"/></marker></defs>
        <path d="M145 65H215 M275 100V170 M215 205H145" fill="none" stroke="#cbd5e1" strokeWidth="3" markerEnd={`url(#${id}arrow)`} className={active?'flow-path':''}/>
        {[[85,65],[275,65],[275,205],[85,205]].map(([x,y],index)=><g key={labels[index]}><rect x={x-66} y={y-30} width="132" height="60" rx="12" fill="#173127" stroke="#86efac" strokeWidth="2"/><text x={x} y={y+5} textAnchor="middle" fill="#f1f5f9" fontSize="14" fontFamily="sans-serif">{c(labels[index])}</text></g>)}
        <text x="180" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="sans-serif">{c('Illustration, not live data')}</text>
      </svg> : null}
      {variant==='explainer'&&near&&motion&&!failed && <video ref={video} className={`absolute inset-0 w-full h-full object-contain ${active?'':'invisible'}`} muted loop playsInline preload="none" poster="/media/system-flow-poster.svg" onError={()=>setFailed(true)} aria-label={c('System flow illustration video')}>
        <source src="/media/system-flow.webm" type="video/webm"/>
        <track kind="captions" src={`/media/system-flow.${locale==='hi'?'hi':'en'}.vtt`} srcLang={locale==='hi'?'hi':'en'} label={locale==='hi'?'हिन्दी':'English'} default/>
      </video>}
    </div>
    <p className="text-sm text-slate-300 mt-3">{c('Sensors record readings. Firebase stores them. The API checks access. The dashboard shows authorized site data.')}</p>
    <p className="text-xs text-slate-300 mt-2">{c('Illustration only. Hardware and services require configuration and verification.')}</p>
    {motion&&near && <button type="button" className="btn-outline mt-3 text-sm px-3 py-2" onClick={()=>setPaused(value=>!value)} aria-pressed={paused}>{c(paused?'Resume animation':'Pause animation')}</button>}
    {failed&&<p role="status" className="text-sm text-slate-200 mt-2">{c('Video unavailable. The diagram and transcript remain available.')}</p>}
  </figure>;
}
