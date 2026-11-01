// Original one-time source update. Only the existing frontend app/components.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../voltarax-web/frontend');
const apply = process.argv.includes('--apply');
let changed = 0;
function visit(directory) {
  if (!directory.startsWith(root + path.sep)) throw Error('Unexpected source directory');
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) { visit(file); continue; }
    if (!file.endsWith('.tsx')) continue;
    const original = fs.readFileSync(file, 'utf8');
    let next = original.replace(/import Link from ['"]next\/link['"];?/g, "import { Link } from '@/i18n/navigation';");
    next = next.replace(/import\s*\{([^}]+)\}\s*from ['"]next\/navigation['"];?/g, (statement, values) => {
      const names = values.split(',').map(name => name.trim()), localized = names.filter(name => ['useRouter', 'usePathname'].includes(name));
      if (!localized.length) return statement;
      const native = names.filter(name => !localized.includes(name));
      return `import { ${localized.join(', ')} } from '@/i18n/navigation';` + (native.length ? `\nimport { ${native.join(', ')} } from 'next/navigation';` : '');
    });
    if (next !== original) { changed++; if (apply) fs.writeFileSync(file, next); }
  }
}
visit(path.join(root, 'app')); visit(path.join(root, 'components'));
console.log(JSON.stringify({ changed_files: changed, applied: apply, scope: 'Existing frontend navigation imports only' }));
