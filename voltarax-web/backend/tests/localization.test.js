const test = require('node:test');
const assert = require('node:assert/strict');
const { phraseId, lookupCopy, formatCopy } = require('../../frontend/i18n/phrase-id.ts');
test('literal localization preserves opaque values, numbers and surrounding whitespace, with exact source binding', () => {
  const id = phraseId('Unavailable'), source = { [id]: 'Unavailable' }, hindi = { [id]: 'उपलब्ध नहीं' };
  assert.equal(lookupCopy(' Unavailable ', source, hindi), ' उपलब्ध नहीं ');
  assert.equal(lookupCopy('synthetic-private-device-value', source, hindi), 'synthetic-private-device-value');
  assert.equal(lookupCopy(0, source, hindi), 0); assert.equal(lookupCopy(false, source, hindi), false);
  const record = { note: 'Original entered observation' }; assert.equal(lookupCopy(record, source, hindi), record);
  assert.equal(lookupCopy('Unavailable', { [id]: 'Different source under the same hash' }, hindi), 'Unavailable');
  assert.equal(lookupCopy('Unavailable', source, {}), 'Unavailable');
});
test('localized templates keep zero and interpolate operator content once without interpreting replacement tokens', () => {
  const text = '{count} records for {area}', source = { [phraseId(text)]: text }, hindi = { [phraseId(text)]: '{area} के लिए {count} रिकॉर्ड' };
  assert.equal(formatCopy(text, source, hindi, { count: 0, area: '$& {count} <test>' }), '$& {count} <test> के लिए 0 रिकॉर्ड');
  assert.equal(formatCopy(text, source, {}, { count: 0, area: 'Original name' }), '0 records for Original name');
  assert.equal(formatCopy(0, source, hindi, { count: 3 }), 0);
});
test('translated select labels always have explicit protocol values', () => {
  const fs = require('node:fs'), path = require('node:path');
  const frontend = path.resolve(__dirname, '../../frontend'), ts = require(path.join(frontend, 'node_modules/typescript'));
  const invalid = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.tsx')) {
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const visit = node => {
          if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === 'option' && !node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'value')) invalid.push(path.relative(frontend, file));
          ts.forEachChild(node, visit);
        }; visit(source);
      }
    }
  }
  walk(path.join(frontend, 'app')); walk(path.join(frontend, 'components'));
  assert.deepEqual(invalid, [], 'A localized label must not become the submitted API value');
});
test('all active copy keys bind exact source and preserve every template parameter in Hindi', () => {
  const en = require('../../frontend/messages/en.json').Phrases, hi = require('../../frontend/messages/hi.json').Phrases;
  const parameters = text => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
  for (const [id, source] of Object.entries(en)) {
    assert.equal(phraseId(source), id);
    assert.ok(hi[id]?.trim(), 'Missing translation for ' + id);
    assert.deepEqual(parameters(hi[id]), parameters(source), 'Mismatched template for ' + id);
  }
});
