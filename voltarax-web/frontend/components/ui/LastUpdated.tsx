'use client';
import {useEffect,useState} from 'react';
import {readingState,startAlignedClock,formatISTClock} from '@/lib/clock';
import {useCopy} from '@/i18n/copy';
import {useLocale} from 'next-intl';
type Freshness={last_seen:string|null;valid_until:string|null;fresh:boolean};
export default function LastUpdated(){
  const c=useCopy(),locale=useLocale();const [data,setData]=useState<Freshness|null>(null),[now,setNow]=useState<number|null>(null),[online,setOnline]=useState(true),[error,setError]=useState(false);
  useEffect(()=>{
    let active=true,controller:AbortController|undefined,lastPoll=-Infinity;
    const load=()=>{if(document.hidden||!navigator.onLine||Date.now()-lastPoll<15000)return;lastPoll=Date.now();controller?.abort();controller=new AbortController();fetch('/api/telemetry/latest',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Unavailable');const body=await response.json();if(active){setData(body.freshness||null);setError(false);}}).catch(failure=>{if(active&&failure.name!=='AbortError')setError(true);});};
    const stop=startAlignedClock({now:Date.now,visible:()=>!document.hidden,onTick:value=>{setNow(value);load();},schedule:(callback,delay)=>{const timer=setTimeout(callback,delay);return()=>clearTimeout(timer);},listen:callback=>{document.addEventListener('visibilitychange',callback);return()=>document.removeEventListener('visibilitychange',callback);}});
    const connection=()=>{setOnline(navigator.onLine);if(navigator.onLine){lastPoll=-Infinity;load();}};
    connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
    return()=>{active=false;stop();controller?.abort();window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};
  },[]);
  const state=error?'offline':readingState(data,now,online);
  const stamp=typeof data?.last_seen==='string'?Date.parse(data.last_seen):NaN;
  return <span data-reading-state={state} className="text-xs text-slate-200 tabular-nums" aria-live="off">{c(state==='offline'?'Offline - last updated':'Last updated')}: {state!=='unavailable'&&Number.isFinite(stamp)?formatISTClock(stamp,locale==='hi'?'hi-IN':'en-IN'):c('Unavailable')}</span>;
}
