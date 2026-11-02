'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { MessageCircle, X, Send, Mic, Wind } from 'lucide-react';
import { useCopy } from '@/i18n/copy';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Msg = { id: number; role: 'user' | 'bot'; text: string; chips?: string[]; source?: {id:string;title:string}; contact?:string };

const QUESTIONS = ['What is VoltVision?', 'How does the coating work?', 'What can the AI do?'];

export default function ChatWidget() {
  const copyText = useCopy();
  const locale = useLocale();
  const [busy,setBusy] = useState(false);
  const pathname = usePathname() || '/';
  const hidden = /^\/(login|contact|dashboard|account)(\/|$)/.test(pathname);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);

  const push = useCallback((role: Msg['role'], text: string, chips?: string[]) => {
    setMsgs(m => [...m.slice(-49), { id: ++idRef.current, role, text, chips }]);
  }, []);

  useEffect(() => {
    setMsgs([]);
    idRef.current = 0;
    push('bot', 'Ask about the reviewed software scope. Answers name their source. Personal details are not needed.', QUESTIONS);
  }, [push]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  const send = async (forced?: string) => {
    const text = (forced ? copyText(forced) : input).trim();
    if (!text || busy) return;
    setBusy(true);
    setInput('');
    setMsgs(m => m.map(x => ({ ...x, chips: undefined })));
    push('user', text);
    try {
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Voltarax-Request':'1'},body:JSON.stringify({message:text,language:locale==='hi'?'hi':'en'}),signal:AbortSignal.timeout(6000)});
      if(!response.ok)throw Error('Assistant unavailable');
      const data=await response.json();
      if(typeof data.reply!=='string'||typeof data.source?.id!=='string'||typeof data.source?.title!=='string')throw Error('Invalid assistant response');
      setMsgs(messages=>[...messages.slice(-49),{id:++idRef.current,role:'bot',text:data.reply,source:data.source,contact:data.contact?.label,chips:QUESTIONS}]);
    } catch {push('bot','Assistant unavailable. Please use the Contact page for human help.',QUESTIONS);}
    finally {setBusy(false);}
  };

  if (hidden) return null;

  return (
    <div className="fixed z-[60] right-5 bottom-5 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-label={copyText("Voltarax assistant")}
          className="w-[22rem] max-w-[calc(100vw-2.5rem)] h-[32rem] max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#0b1510] shadow-2xl shadow-black/60">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-900/40 bg-[#102017]">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-300/20 flex items-center justify-center"><Wind size={17} className="text-emerald-300" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{copyText('Voltarax Assistant')}</div>
              <div className="text-[11px] text-emerald-300">{copyText('Reviewed answers; provider disabled by default')}</div>
            </div>
            <button ref={closeRef} onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label={copyText('Close assistant')} className="text-slate-400 hover:text-white p-2"><X size={17} /></button>
          </div>

          <div ref={bodyRef} role="log" aria-live="polite" aria-label={copyText('Assistant conversation')} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map(m => (
              <div key={m.id}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-emerald-400 text-[#031008] font-medium rounded-tr-sm' : 'bg-[#13241a] border border-emerald-900/30 text-slate-200 rounded-tl-sm'}`}>{m.role === 'bot' ? copyText(m.text) : m.text}</div>
                </div>
                {m.source && <p className="mt-1 text-xs text-slate-300">{copyText('Source')}: {m.source.title} ({m.source.id})</p>}
                {m.role==='bot' && <Link href="/contact" className="inline-block mt-1 text-xs text-emerald-200 underline">{m.contact || copyText('Contact a person for help')}</Link>}
                {m.chips?.length ? <div className="flex flex-wrap gap-1.5 mt-2">{m.chips.map(c => <button key={c} onClick={() => send(c)} className="text-xs px-2.5 py-1.5 rounded-full border border-emerald-400/25 text-emerald-200 hover:bg-emerald-400/10">{copyText(c)}</button>)}</div> : null}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-emerald-900/30 bg-[#102017] flex items-end gap-2">
            <textarea value={input} rows={1} maxLength={300} disabled={busy} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              aria-label={copyText('Your question')} placeholder={copyText('Choose a question or type it…')} className="flex-1 resize-none max-h-20 rounded-lg bg-[#08100b] border border-emerald-900/40 focus:border-emerald-400 outline-none px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-400" />
            <button disabled title={copyText('Voice input: coming soon')} aria-label={copyText('Voice input: coming soon')} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400"><Mic size={16}/></button>
            <button onClick={() => send()} disabled={busy||!input.trim()} aria-label={copyText('Send')} className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-400 text-black disabled:opacity-40"><Send size={15}/></button>
          </div>
          {busy && <p role="status" className="px-4 py-2 text-sm text-slate-200">{copyText('Checking reviewed knowledge...')}</p>}
        </div>
      )}
      <button ref={triggerRef} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={copyText(open ? 'Close assistant' : 'Open assistant')}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-300 to-green-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:scale-105 transition-transform">
        {open ? <X size={22}/> : <MessageCircle size={22}/>}
      </button>
    </div>
  );
}
