// Merge reviewed original translations without changing source/UI identifiers.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), allowed = path.join(root, '.local-tools/localization');
if (!process.argv[2]) throw Error('Provide a reviewed JSON translation batch');
const input = path.resolve(process.argv[2]);
if (!input.startsWith(allowed + path.sep)) throw Error('Translation batches must stay in the local review directory');
const base = path.join(root, 'voltarax-web/frontend/messages'), en = JSON.parse(fs.readFileSync(path.join(base, 'en.json'), 'utf8')), hiPath = path.join(base, 'hi.json');
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8')), batch = JSON.parse(fs.readFileSync(input, 'utf8'));
const id = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return 'p_' + (h >>> 0).toString(16).padStart(8, '0'); };
const proper = new Set(['voltarax', 'voltvision', 'razorpay', 'inr', 'ist', 'pdf', 'csv', 'json', 'api']);
const parameters = text => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort().join('|');
for (const [source, translation] of Object.entries(batch)) {
  if (en.Phrases[id(source)] !== source || typeof translation !== 'string' || !translation.trim() || translation.length > 10000 ||
      (!/[\u0900-\u097f]/.test(translation) && !proper.has(source.toLowerCase())) || parameters(source) !== parameters(translation)) throw Error('Batch contains an unknown/unreviewed/empty translation or mismatched parameters; files preserved');
}
let added = 0;
for (const [source, translation] of Object.entries(batch)) { const key = id(source); if (hi.Phrases[key] !== translation) added++; hi.Phrases[key] = translation; }
hi.Phrases = Object.fromEntries(Object.entries(hi.Phrases).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(hiPath, JSON.stringify(hi, null, 2) + '\n');
console.log(JSON.stringify({ reviewed_entries: Object.keys(batch).length, added_or_changed: added, remaining_hindi: Object.keys(en.Phrases).filter(key => !hi.Phrases[key]).length }));
