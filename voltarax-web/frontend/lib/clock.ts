export function formatISTClock(milliseconds: number, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(milliseconds)) + ' IST';
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
