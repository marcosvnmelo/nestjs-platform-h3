import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const pkgPath = new URL('package.json', ROOT);
const resolvedPath = new URL('.catalog-resolved.json', ROOT);

if (!existsSync(resolvedPath)) {
  console.log('No catalog entries to restore');
  process.exit(0);
}

const resolved = JSON.parse(readFileSync(resolvedPath, 'utf-8'));
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

for (const [field, deps] of Object.entries(resolved)) {
  for (const dep of deps) {
    if (pkg[field]?.[dep]) {
      pkg[field][dep] = 'catalog:';
    }
  }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
unlinkSync(resolvedPath);

const total = Object.values(resolved).flat().length;
console.log(`Restored ${total} catalog entries`);
