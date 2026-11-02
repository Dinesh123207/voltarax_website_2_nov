'use client';
import { useEffect, useState } from 'react';
import { formatISTClock, startAlignedClock } from '@/lib/clock';
import { useLocale } from 'next-intl';
import { useCopy } from '@/i18n/copy';
export default function ISTClock() {
  const copyText = useCopy();
  const locale = useLocale(), c = useCopy();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => startAlignedClock({ now: Date.now, visible: () => !document.hidden, onTick: setNow,
    schedule: (callback, delay) => { const timer = setTimeout(callback, delay); return () => clearTimeout(timer); },
    listen: callback => { document.addEventListener('visibilitychange', callback); return () => document.removeEventListener('visibilitychange', callback); } }), []);
  return <time aria-live="off" title={c('Current Indian Standard Time, calculated from this device clock')} data-quality="Calculated"
    dateTime={now == null ? undefined : new Date(now).toISOString()} className="text-[10px] sm:text-xs text-slate-300 tabular-nums whitespace-nowrap">
    {copyText(now == null ? c('Indian Standard Time') : formatISTClock(now, locale === 'hi' ? 'hi-IN' : 'en-IN'))}
  </time>;
}
