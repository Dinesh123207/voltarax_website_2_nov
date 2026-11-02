export function formatISTClock(milliseconds: number, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(milliseconds)) + ' IST';
}
export function readingState(freshness:{last_seen?:string|null;valid_until?:string|null;fresh?:boolean}|null,now:number|null,online=true){
  if(!online)return 'offline';
  if(!freshness?.last_seen||!freshness.valid_until||now==null)return 'unavailable';
  const seen=Date.parse(freshness.last_seen),until=Date.parse(freshness.valid_until);
  if(!Number.isFinite(seen)||!Number.isFinite(until)||until<seen||seen-now>300000)return 'unavailable';
  return freshness.fresh===true&&now<=until?'fresh':'offline';
}
export function startAlignedClock(platform: { now: () => number; visible: () => boolean; onTick: (value: number) => void;
  schedule: (callback: () => void, delay: number) => () => void; listen: (callback: () => void) => () => void }) {
  let cancel: (() => void) | undefined, stopped = false;
  const tick = () => {
    cancel?.(); cancel = undefined;
    if (stopped || !platform.visible()) return;
    const now = platform.now(); platform.onTick(now);
    cancel = platform.schedule(tick, 1000 - now % 1000);
  };
  const unlisten = platform.listen(tick); tick();
  return () => { stopped = true; cancel?.(); unlisten(); };
}
