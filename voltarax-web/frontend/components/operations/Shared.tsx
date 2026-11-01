'use client';
import { useEffect, useState } from 'react';
import { api, ist, type History } from '@/lib/operations';
export function useOperator() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => { let active = true; api<{ user: { role: string } }>('/auth/me').then(data => { if (active) setAllowed(['operator', 'admin'].includes(data.user.role)); }).catch(() => { if (active) setAllowed(false); }); return () => { active = false; }; }, []);
  return allowed;
}
export function EventHistory({ events }: { events?: History[] }) {
  return <div className="space-y-2"><h3 className="font-semibold text-white">History (most recent 200)</h3>{events?.map(event => <div key={event.id} className="border-l-2 border-green-900 pl-3 text-sm"><p className="text-slate-300">{event.action.replaceAll('_', ' ')} · {ist(event.at)}</p><p className="text-slate-400 whitespace-pre-wrap break-words">{event.note}</p><p className="text-xs text-slate-500 break-all">Account: {event.actorId}</p></div>)}</div>;
}
export function Notice({ message }: { message: string }) { return message ? <p role="status" className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-300 break-words">{message}</p> : null; }
