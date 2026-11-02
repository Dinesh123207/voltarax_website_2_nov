'use client';
import { useEffect,useState,useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { dataActivity,EMPTY_ACTIVITY } from '@/lib/data-activity';
import { useCopy } from '@/i18n/copy';
export default function DataActivityNotice(){
  const pathname=usePathname(),c=useCopy(),[online,setOnline]=useState(true);
  const status=useSyncExternalStore(dataActivity.subscribe,()=>dataActivity.get(pathname),()=>EMPTY_ACTIVITY);
  useEffect(()=>{const refresh=()=>setOnline(navigator.onLine);refresh();window.addEventListener('online',refresh);window.addEventListener('offline',refresh);return()=>{window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh);};},[]);
  const message=!online?'Offline. Displayed records may be old. Reconnect before relying on current readings.':status.error?'A data request failed. Check your connection and use this screen to retry.':status.loading?'Loading data...':status.empty?'Some requested data is empty or unavailable. No values have been assumed.':'';
  return message?<p role={status.error&&online?'alert':'status'} data-screen-state={!online?'offline':status.error?'error':status.loading?'loading':'empty'} className="mb-4 rounded-lg border border-slate-500 bg-[#102017] p-3 text-sm text-slate-100">{c(message)}</p>:null;
}
