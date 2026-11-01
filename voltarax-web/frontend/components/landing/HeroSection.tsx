'use client';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ChevronRight, ArrowDown, Zap, Leaf, Brain, Sun, Wind, Activity } from 'lucide-react';
import WindTurbineBackdrop from './WindTurbineBackdrop';
import { useCopy } from '@/i18n/copy';


const STATS = [
  { value: 'Setup', label: 'Configuration required', icon: Zap },
  { value: 'AI', label: 'Analysis under validation', icon: Brain },
  { value: 'IoT', label: 'Sensor telemetry', icon: Activity },
  { value: 'Records', label: 'Manual inspections', icon: Leaf },
];
const PHRASES = ['Site telemetry.', 'Current-condition estimates.', 'Recorded maintenance.', 'Renewable equipment data.'];

function useTypewriter(phrases: string[], typeMs = 70, deleteMs = 40, holdMs = 1400) {
  const [text, setText] = useState('');
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // A Hindi syllable can contain several code points; never slice its marks.
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const parts = phrases.map(phrase => segmenter ? Array.from(segmenter.segment(phrase), part => part.segment) : [phrase]);
    let i = 0, j = 0, deleting = false, t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.hidden || motion.matches) return;
      const phrase = parts[i];
      if (!deleting) {
        j++; setText(phrase.slice(0, j).join(''));
        if (j === phrase.length) { deleting = true; t = setTimeout(tick, holdMs); return; }
        t = setTimeout(tick, typeMs);
      } else {
        j--; setText(phrase.slice(0, j).join(''));
        if (j === 0) { deleting = false; i = (i + 1) % phrases.length; }
        t = setTimeout(tick, deleteMs);
      }
    };
    const resume = () => {
      clearTimeout(t);
      if (motion.matches) setText(phrases[0]);
      else if (!document.hidden) t = setTimeout(tick, typeMs);
    };
    resume();
    document.addEventListener('visibilitychange', resume);
    motion.addEventListener('change', resume);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', resume); motion.removeEventListener('change', resume); };
  }, [phrases, typeMs, deleteMs, holdMs]);
  return text;
}

export default function HeroSection() {
  const copyText = useCopy();
  const phrases = useMemo(() => PHRASES.map(phrase => copyText(phrase)), [copyText]);
  const typed = useTypewriter(phrases);
  return (
    <>
      <section className="relative min-h-[760px] lg:min-h-screen flex items-center overflow-hidden renewable-hero">
        <div className="absolute inset-0 hero-mesh" />
        <WindTurbineBackdrop />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06100a] via-[#06100a]/90 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-8 lg:px-10 pt-28 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-300/20 bg-emerald-300/5 text-emerald-200 text-xs font-semibold uppercase tracking-[.18em] mb-7">
              <Wind size={14} />
              {copyText("Renewable Energy · AI · Climate Tech")}</div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white leading-[.94] tracking-[-.04em] mb-7">
              <span className="gradient-text">{copyText("Intelligence for clean energy.")}</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-3 max-w-2xl">
              <span className="sr-only">{phrases.join(' ')}</span>
              <span aria-hidden="true" className="text-emerald-300 font-semibold">{typed}<span className="motion-safe:animate-pulse">|</span></span>
            </p>
            <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-9">
              {copyText("View site readings, record inspections and track maintenance. Estimates require suitable inputs. Hardware and service setup must be verified for each installation.")}</p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link href="/products" className="btn-green text-base px-7 py-3.5">
                {copyText("Explore VoltVision")}<ChevronRight size={18} />
              </Link>
              <Link href="/contact?type=demo" className="btn-outline text-base px-7 py-3.5">
                {copyText("Request a Demo")}</Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
              {STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="hero-stat">
                  <Icon size={16} className="text-emerald-300 mb-3" />
                  <div className="text-2xl font-bold text-white tracking-tight">{copyText(value)}</div>
                  <div className="text-xs text-slate-500 mt-1">{copyText(label)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <a href="#why" aria-label={copyText("Scroll to content")} className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 hover:text-emerald-300">
          <span className="text-[10px] tracking-[.25em] uppercase">{copyText("Discover")}</span>
          <ArrowDown size={15} />
        </a>
      </section>

      <div className="relative overflow-hidden border-y border-emerald-900/30 bg-[#07110b] py-3">
        <div className="flex animate-marquee whitespace-nowrap">
          {['SITE TELEMETRY','CURRENT ESTIMATES','SENSOR ALERTS','MANUAL INSPECTIONS','CARBON ESTIMATES','DATA QUALITY',
            'SITE TELEMETRY','CURRENT ESTIMATES','SENSOR ALERTS','MANUAL INSPECTIONS','CARBON ESTIMATES','DATA QUALITY'].map((x,i)=>(
            <span key={i} className="text-[11px] tracking-[.2em] text-emerald-700 font-semibold mx-9">{copyText(x)}</span>
          ))}
        </div>
      </div>
    </>
  );
}
