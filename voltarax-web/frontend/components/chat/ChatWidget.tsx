'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Mic, Wind } from 'lucide-react';

type Msg = { id: number; role: 'user' | 'bot'; text: string; chips?: string[] };

const QUESTIONS = ['What is VoltVision?', 'How does the coating work?', 'What can the AI do?'];
const ANSWERS: Record<string, string> = {
  'what is voltvision?': "VoltVision AI is Voltarax's renewable-energy intelligence platform for bio-coated solar panels. It monitors panel health, forecasts generation and helps optimise how clean energy is used.",
  'how does the coating work?': 'The bio-fluorescent coating is made from fruit-peel waste. It converts UV light into visible light that solar cells can use, while the platform tracks panel and coating health.',
  'what can the ai do?': 'VoltVision combines forecasting, computer-vision inspection, anomaly detection, maintenance alerts, energy optimisation and carbon analytics for solar assets.',
};

export default function ChatWidget() {
  const pathname = usePathname() || '/';
  const hidden = pathname.startsWith('/login');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const [micOk, setMicOk] = useState(false);

  const push = useCallback((role: Msg['role'], text: string, chips?: string[]) => {
    setMsgs(m => [...m, { id: ++idRef.current, role, text, chips }]);
  }, []);

  useEffect(() => {
    setMsgs([]);
    idRef.current = 0;
    push('bot', 'Hi, I’m the Voltarax assistant. I can answer three quick questions about VoltVision.', QUESTIONS);
  }, [push]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing, open]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; setMicOk(true);
    return () => { try { rec.abort(); } catch {} };
  }, []);

  const toggleMic = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); return; }
    try { setListening(true); rec.start(); } catch { setListening(false); }
  };

  const send = async (forced?: string) => {
    const text = (forced ?? input).trim();
    if (!text || typing) return;
    setInput('');
    setMsgs(m => m.map(x => ({ ...x, chips: undefined })));
    push('user', text);
    setTyping(true);

    await new Promise(r => setTimeout(r, 260));
    const key = text.toLowerCase().replace(/[?.!]+$/g, '');
    const reply = ANSWERS[key] ||
      (key.includes('voltvision') ? ANSWERS['what is voltvision?'] :
       key.includes('coating') ? ANSWERS['how does the coating work?'] :
       key.includes('ai') ? ANSWERS['what can the ai do?'] :
       'I’m currently set up for three basic questions. Please choose one of the suggested questions below.');
    push('bot', reply, QUESTIONS);
    setTyping(false);
  };

  if (hidden) return null;

  return (
    <div className="fixed z-[60] right-5 bottom-5 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-label="Voltarax assistant"
          className="w-[22rem] max-w-[calc(100vw-2.5rem)] h-[32rem] max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#0b1510] shadow-2xl shadow-black/60">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-900/40 bg-[#102017]">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-300/20 flex items-center justify-center"><Wind size={17} className="text-emerald-300" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Voltarax Assistant</div>
              <div className="text-[11px] text-emerald-400">Instant · no API required</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-slate-500 hover:text-white"><X size={17} /></button>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map(m => (
              <div key={m.id}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-emerald-400 text-[#031008] font-medium rounded-tr-sm' : 'bg-[#13241a] border border-emerald-900/30 text-slate-200 rounded-tl-sm'}`}>{m.text}</div>
                </div>
                {m.chips?.length ? <div className="flex flex-wrap gap-1.5 mt-2">{m.chips.map(c => <button key={c} onClick={() => send(c)} className="text-xs px-2.5 py-1.5 rounded-full border border-emerald-400/25 text-emerald-200 hover:bg-emerald-400/10">{c}</button>)}</div> : null}
              </div>
            ))}
            {typing && <div className="flex"><div className="bg-[#13241a] border border-emerald-900/30 rounded-xl px-3 py-2.5 flex gap-1">{[0,150,300].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:`${d}ms`}} />)}</div></div>}
          </div>

          <div className="p-3 border-t border-emerald-900/30 bg-[#102017] flex items-end gap-2">
            <textarea value={input} rows={1} maxLength={300} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Choose a question or type it…" className="flex-1 resize-none max-h-20 rounded-lg bg-[#08100b] border border-emerald-900/40 focus:border-emerald-400 outline-none px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-600" />
            {micOk && <button onClick={toggleMic} aria-label="Voice input" className={`w-9 h-9 rounded-lg flex items-center justify-center bg-[#0b1510] ${listening ? 'text-emerald-300' : 'text-slate-500 hover:text-white'}`}><Mic size={16}/></button>}
            <button onClick={() => send()} disabled={typing || !input.trim()} aria-label="Send" className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-400 text-black disabled:opacity-40"><Send size={15}/></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-300 to-green-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:scale-105 transition-transform">
        {open ? <X size={22}/> : <MessageCircle size={22}/>}
      </button>
    </div>
  );
}
