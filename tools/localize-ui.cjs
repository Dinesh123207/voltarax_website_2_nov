// Original AST-based copy wiring. API values/attributes and entered record
// fields are preserved. Default is a read-only coverage report; --apply edits.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), frontend = path.join(root, 'voltarax-web/frontend');
const ts = require(path.join(frontend, 'node_modules/typescript'));
const apply = process.argv.includes('--apply');
const catalog = process.argv.includes('--catalog');
const phraseId = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return 'p_' + (h >>> 0).toString(16).padStart(8, '0'); };
const enPath = path.join(frontend, 'messages/en.json'), hiPath = path.join(frontend, 'messages/hi.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8')), hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));
const obsolete = text => ['use client', 'use server', 'use strict', 'Enter', 'Escape', 'noopener noreferrer', 'GitHub', 'LinkedIn', 'what is voltvision?', 'how does the coating work?', 'what can the ai do?', 'order_…', 'rfnd_…'].includes(text) || /&(?:apos|amp|quot|lt|gt);/.test(text) || /^\(prefers-/.test(text) || /^translate\(/.test(text) || /^a, button, \[role=/.test(text) || /^\d+px solid #/.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
const phrases = new Map(Object.values(en.Phrases).filter(text => !obsolete(text)).map(text => [phraseId(text), text]));
const locations = new Map(), changed = [], unsupported = [], rewritten = [];
const technical = new Set('Voltarax VoltVision Razorpay INR IST PDF CSV JSON HTML HTTP HTTPS JWT OTP SMTP TLS GET POST PUT PATCH DELETE INA219 BH1750 DHT11 ESP32 NodeMCU R2 API'.split(' '));
const states = new Set('open acknowledged resolved in_progress closed low medium high critical info warning pending paid refunded requested submitted processed rejected creating creation_unknown review_required clean dusty cracked peeling other unknown viewer operator admin active disabled healthy faulty online offline unavailable measured estimated calculated applied failed timed_out not_enough_data stale_input invalid_input model_expired validation_failed not_enough_daylight model_unavailable insufficient_new_data stable drift_detected ready missing expired legacy_unverified invalid unsupervised engineering_reference evaluated created updated comment acknowledge resolve upload camera'.split(' '));
const blocked = new Set(['name', 'title', 'description', 'note', 'notes', 'message', 'text', 'id', '_id', 'site_id', 'device_id', 'userId', 'email', 'phone', 'sha256', 'gatewayOrderId', 'gatewayRefundId']);
function words(value) { return value.replace(/\s+/g, ' ').trim(); }
function add(value, source, force = false) {
  const text = words(value);
  if (obsolete(text)) return;
  if (!/[A-Za-z]{2}/.test(text) || technical.has(text) || /^p_[a-f0-9]{8}$/.test(text) || /^(?:https?:|mailto:|data:|blob:|\/|\.\/|\.\.\/|@\/)/.test(text)) return;
  if (/(^|\s)(?:bg-|text-|border-|from-|to-|via-|hover:|focus:|sm:|md:|lg:|xl:|gap-|space-|max-w-|min-w-|w-|h-|p[xytrbl]?-|m[xytrbl]?-)/.test(text)) return;
  if (!force && !/\s/.test(text) && !/^[A-Z][A-Za-z]+$/.test(text) && !states.has(text)) return;
  const id = phraseId(text), previous = phrases.get(id);
  if (previous && previous !== text) throw Error('Copy key collision; source preserved');
  phrases.set(id, text);
  if (!locations.has(id)) locations.set(id, new Set()); locations.get(id).add(source);
  if (states.has(text) && text.includes('_')) add(text.replaceAll('_', ' '), source, true);
}
function walk(directory, callback) {
  if (!directory.startsWith(path.join(root, 'voltarax-web') + path.sep)) throw Error('Unexpected source scope');
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || ['node_modules', '.next', 'tests', 'artifacts'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, callback); else if (/\.(tsx?|js)$/.test(file)) callback(file);
  }
}
function parentComponent(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isFunctionDeclaration(parent) && parent.name && /^[A-Z]/.test(parent.name.text) && parent.body && !parent.modifiers?.some(item => item.kind === ts.SyntaxKind.AsyncKeyword)) return parent;
    if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && ts.isVariableDeclaration(parent.parent) && /^[A-Z]/.test(parent.parent.name.getText())) {
      if (ts.isBlock(parent.body)) return parent;
      unsupported.push(parent.parent.name.getText()); return null;
    }
  }
  return null;
}
function analyze(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/'), original = fs.readFileSync(file, 'utf8');
  // Original English brand artwork is a single shared image, not a UI flow.
  if (/\/route\.tsx?$/.test(relative)) return;
  const source = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) throw Error('Invalid source syntax; localization batch preserved');
  const edits = [], scopes = new Set(), staticArrays = new Set();
  const eligible = file.endsWith('.tsx') && !file.endsWith('LanguageSwitcher.tsx') && !file.endsWith('ChatWidget.tsx');
  function statics(node) { if (ts.isVariableDeclaration(node) && node.initializer && ts.isArrayLiteralExpression(node.initializer) && ts.isIdentifier(node.name)) staticArrays.add(node.name.text); ts.forEachChild(node, statics); }
  statics(source);
  function staticMap(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isArrowFunction(parent) && ts.isCallExpression(parent.parent) && ts.isPropertyAccessExpression(parent.parent.expression) && parent.parent.expression.name.text === 'map') {
        const receiver = parent.parent.expression.expression;
        return ts.isArrayLiteralExpression(receiver) || (ts.isIdentifier(receiver) && staticArrays.has(receiver.text));
      }
    }
    return false;
  }
  function containsRecordField(node) {
    let found = false;
    function visit(child) { if (ts.isPropertyAccessExpression(child) && blocked.has(child.name.text)) found = true; ts.forEachChild(child, visit); }
    visit(node); return found;
  }
  function opaque(node) {
    let found = false;
    function check(child) {
      if (ts.isIdentifier(child) && /(?:key|token|secret|password|signature|sha256|email|phone|actorId|userId|device_id|site_id)$/i.test(child.text)) found = true;
      if (ts.isPropertyAccessExpression(child) && child.name.text === 'name') found = true;
      ts.forEachChild(child, check);
    }
    check(node); return found;
  }
  function visit(node) {
    if (eligible && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'copyText' && node.arguments.length === 1 && opaque(node.arguments[0])) {
      const argument = node.arguments[0];
      edits.push({ start: node.getStart(source), end: argument.getStart(source), value: '' }, { start: argument.end, end: node.end, value: '' });
    }
    if (ts.isStringLiteral(node)) {
      let attributeParent = node.parent;
      while (attributeParent && !ts.isJsxAttribute(attributeParent) && !ts.isSourceFile(attributeParent) && !ts.isFunctionLike(attributeParent)) attributeParent = attributeParent.parent;
      const attribute = attributeParent && ts.isJsxAttribute(attributeParent) ? attributeParent.name.getText() : '';
      const literalCopy = ts.isCallExpression(node.parent) && ts.isIdentifier(node.parent.expression) && node.parent.expression.text === 'copyText' && node.parent.arguments[0] === node;
      if (!['className', 'href', 'src', 'id', 'name', 'type', 'value', 'key'].includes(attribute)) add(node.text, relative, literalCopy);
    }
    if (eligible && ts.isJsxText(node) && /[A-Za-z]{2}/.test(node.text)) {
      const scope = parentComponent(node), text = words(node.text);
      if (scope && text) {
        add(text, relative, true); scopes.add(scope);
        const before = !node.text.includes('\n') && /^\s/.test(node.text) ? ' ' : '';
        const after = !node.text.includes('\n') && /\s$/.test(node.text) ? ' ' : '';
        edits.push({ start: node.getStart(source), end: node.end, value: `{copyText(${JSON.stringify(before + text + after)})}` });
      }
    }
    if (eligible && ts.isJsxExpression(node) && node.expression) {
      const scope = parentComponent(node), expression = node.expression, parent = node.parent;
      const humanAttribute = ts.isJsxAttribute(parent) && ['placeholder', 'aria-label', 'title', 'alt'].includes(parent.name.getText());
      const child = ts.isJsxElement(parent) || ts.isJsxFragment(parent);
      const existing = ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && ['copyText', 'c'].includes(expression.expression.text);
      if (scope && (humanAttribute || child) && !existing && !ts.isArrowFunction(expression) && !opaque(expression) && (staticMap(node) || !containsRecordField(expression))) {
        scopes.add(scope); edits.push({ start: expression.getStart(source), end: expression.end, value: `copyText(${expression.getText(source)})` });
      }
    }
    if (eligible && ts.isJsxAttribute(node) && ['placeholder', 'aria-label', 'title', 'alt'].includes(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const scope = parentComponent(node);
      if (scope && /[A-Za-z]{2}/.test(node.initializer.text) && !technical.has(node.initializer.text)) {
        scopes.add(scope); add(node.initializer.text, relative, true);
        edits.push({ start: node.initializer.getStart(source), end: node.initializer.end, value: `{copyText(${JSON.stringify(node.initializer.text)})}` });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!edits.length) return;
  // An outer wrapped expression can contain edited JSX. Use insertion edits for
  // wrappers so their children retain their independently translated copy.
  for (let index = edits.length - 1; index >= 0; index--) {
    const edit = edits[index];
    if (edit.value.startsWith('copyText(') && edit.value.endsWith(')')) {
      edits.splice(index, 1, { start: edit.start, end: edit.start, value: 'copyText(' }, { start: edit.end, end: edit.end, value: ')' });
    }
  }
  for (const scope of scopes) {
    if (!/\bconst\s+copyText\s*=\s*useCopy\(/.test(scope.body.getText(source))) edits.push({ start: scope.body.getStart(source) + 1, end: scope.body.getStart(source) + 1, value: '\n  const copyText = useCopy();' });
  }
  if (!/import[^;]*\buseCopy\b[^;]*from ['"]@\/i18n\/copy['"]/.test(original)) {
    const imports = source.statements.filter(ts.isImportDeclaration), last = imports.at(-1);
    const position = last ? last.end : (original.startsWith("'use client'") ? original.indexOf(';') + 1 : 0);
    edits.push({ start: position, end: position, value: "\nimport { useCopy } from '@/i18n/copy';\n" });
  }
  let next = original;
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  for (const edit of edits) next = next.slice(0, edit.start) + edit.value + next.slice(edit.end);
  if (next !== original) {
    const parsed = ts.createSourceFile(file, next, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (parsed.parseDiagnostics.length) throw Error('Generated copy wiring has invalid syntax; batch preserved');
    changed.push(relative); rewritten.push({ file, next });
  }
}
walk(path.join(frontend, 'app'), analyze); walk(path.join(frontend, 'components'), analyze);
// API-generated safe errors/reasons may be displayed by the same copy lookup.
for (const directory of ['services', 'routes', 'middleware', 'data']) walk(path.join(root, 'voltarax-web/backend', directory), file => {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visible = node => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isPropertyAssignment(parent)) return ['message', 'reason', 'note', 'label', 'method'].includes(parent.name.getText(source).replace(/['"]/g, ''));
      if (ts.isCallExpression(parent)) return ts.isIdentifier(parent.expression) && ['fail'].includes(parent.expression.text);
      if (ts.isNewExpression(parent)) return ['OperationError', 'CommerceError', 'CameraError'].includes(parent.expression.getText(source));
    }
    return false;
  };
  const visit = node => { if (ts.isStringLiteral(node) && visible(node)) add(node.text, path.relative(root, file).replaceAll('\\', '/')); ts.forEachChild(node, visit); }; visit(source);
});
// Library fallback text reaches UI through useCopy(error.message/inr/ist).
// Collect only error/fallback literals, never currency codes, routes or IDs.
for (const name of ['operations.ts', 'money.ts', 'checkout.ts']) {
  const file = path.join(frontend, 'lib', name), relative = path.relative(root, file).replaceAll('\\', '/');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = node => {
    if ((ts.isNewExpression(node) || ts.isCallExpression(node)) && ts.isIdentifier(node.expression) && node.expression.text === 'Error') {
      let text = node.arguments?.[0];
      while (text && ts.isBinaryExpression(text) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(text.operatorToken.kind)) text = text.right;
      if (text && ts.isStringLiteral(text)) add(text.text, relative, true);
    }
    if (ts.isReturnStatement(node) && node.expression && ts.isStringLiteral(node.expression)) add(node.expression.text, relative, true);
    if (ts.isConditionalExpression(node)) for (const text of [node.whenTrue, node.whenFalse]) if (ts.isStringLiteral(text)) add(text.text, relative, true);
    ts.forEachChild(node, visit);
  };
  visit(source);
}
for (const state of states) add(state.replaceAll('_', ' '), 'platform-status-enums', true);
// Retire only messages no longer present in the scanned UI/error/status sources.
// Explicit flag keeps ordinary coverage reports read-only.
const retired = [...phrases.keys()].filter(id => !locations.has(id));
if (process.argv.includes('--prune')) for (const id of retired) phrases.delete(id);
const pending = [...phrases].filter(([id]) => !hi.Phrases[id]).map(([id, text]) => ({ id, text, files: [...(locations.get(id) || [])] }));
const report = { total_phrases: phrases.size, missing_hindi: pending.length, retired_unreferenced: process.argv.includes('--prune') ? retired.length : 0, changed_files: changed, unsupported_expression_components: [...new Set(unsupported)] };
const output = path.join(root, '.local-tools/localization'); fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'pending.json'), JSON.stringify(pending, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'coverage.json'), JSON.stringify(report, null, 2) + '\n');
if (apply) {
  for (const { file, next } of rewritten) fs.writeFileSync(file, next);
}
if (apply || catalog) {
  en.Phrases = Object.fromEntries([...phrases].sort(([a], [b]) => a.localeCompare(b))); fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
}
console.log(JSON.stringify({ ...report, changed_files: changed.length, applied: apply, pending_file: '.local-tools/localization/pending.json' }));
