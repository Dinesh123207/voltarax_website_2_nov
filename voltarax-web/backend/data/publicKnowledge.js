/**
 * Local knowledge base for the website assistant.
 * Deliberately just these 3 questions (see frontend/components/chat/ChatWidget.tsx,
 * which has the same 3 answers and never calls an external API for them).
 * This backend route exists only so a non-browser client (mobile app, tests,
 * curl) can ask the same 3 things without duplicating the copy.
 */
const ENTRIES = [
  { id: 'what', kws: ['what', 'voltvision', 'platform', 'product', 'voltarax'],
    a: "VoltVision AI is Voltarax's renewable-energy intelligence platform for bio-coated solar panels. It displays site readings and calculated health when telemetry is available." },
  { id: 'coating', kws: ['coating', 'bio', 'fluorescent', 'peel', 'organic', 'waste'],
    a: 'The bio-fluorescent coating is made from fruit-peel waste and is intended to convert UV light into visible light. Coating health monitoring is planned.' },
  { id: 'ai', kws: ['ai', 'can do', 'capability', 'capabilities', 'feature'],
    a: 'VoltVision supports site telemetry and rule-based analysis, with data-driven estimates when sufficient history is available. Camera inspection and automated controls are planned.' },
];

const STOP = new Set('a an the is are was were be been being of to in on for with and or how what who when where why does do can could would should i you it this that my our your please tell me about show give'.split(' '));
const tokenize = (s) => (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 1 && !STOP.has(w));

function score(qt, entry) {
  let s = 0;
  for (const phrase of entry.kws) {
    const kt = tokenize(phrase);
    if (!kt.length) continue;
    const all = kt.every((t) => qt.some((q) => q === t || (t.length > 3 && q.startsWith(t)) || (q.length > 3 && t.startsWith(q))));
    if (all) s += kt.length >= 2 ? 3 : 1;
  }
  return s;
}

function match(question) {
  const qt = tokenize(question);
  if (!qt.length) return null;
  let best = null, bs = 0;
  for (const e of ENTRIES) { const s = score(qt, e); if (s > bs) { bs = s; best = e; } }
  return best;
}

module.exports = { ENTRIES, match };
