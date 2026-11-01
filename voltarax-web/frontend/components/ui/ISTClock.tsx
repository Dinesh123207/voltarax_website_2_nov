'use client';
import { useEffect, useState } from 'react';
import { formatISTClock, startAlignedClock } from '@/lib/clock';
export default function ISTClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => startAlignedClock({ now: Date.now, visible: () => !document.hidden, onTick: setNow,
    schedule: (callback, delay) => { const timer = setTimeout(callback, delay); return () => clearTimeout(timer); },
    listen: callback => { document.addEventListener('visibilitychange', callback); return () => document.removeEventListener('visibilitychange', callback); } }), []);
  return <time aria-live="off" aria-label="Current Indian Standard Time, calculated from this device clock" data-quality="Calculated"
    dateTime={now == null ? undefined : new Date(now).toISOString()} className="text-[10px] sm:text-xs text-slate-300 tabular-nums whitespace-nowrap">
    {now == null ? 'Indian Standard Time' : formatISTClock(now)}
  </time>;
}
