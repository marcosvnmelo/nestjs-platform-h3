import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const pkgPath = new URL('package.json', ROOT);
const workspacePath = new URL('pnpm-workspace.yaml', ROOT);
const resolvedPath = new URL('.catalog-resolved.json', ROOT);

// Parse catalog entries from pnpm-workspace.yaml
const workspaceContent = readFileSync(workspacePath, 'utf-8');
const catalog = {};
let inCatalog = false;

for (const line of workspaceContent.split('\n')) {
  if (/^catalog:/.test(line)) {
    inCatalog = true;
    continue;
  }
  if (inCatalog) {
    if (/^\S/.test(line) && line.trim()) break;
    const match = line.match(
      /^\s+['"]?([^'":\s]+)['"]?\s*:\s*['"]?([^'"]+)['"]?/,
    );
    if (match) {
      catalog[match[1]] = match[2].trim();
    }
  }
}

// Resolve catalog: references in published dependency fields
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const resolved = {};

for (const field of [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  if (!pkg[field]) continue;
  for (const [dep, version] of Object.entries(pkg[field])) {
    if (version !== 'catalog:') continue;
    if (!catalog[dep]) {
      console.error(`No catalog entry found for "${dep}"`);
      process.exit(1);
    }
    pkg[field][dep] = catalog[dep];
    resolved[field] ??= [];
    resolved[field].push(dep);
  }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
writeFileSync(resolvedPath, JSON.stringify(resolved, null, 2) + '\n');

const total = Object.values(resolved).flat().length;
console.log(`Resolved ${total} catalog entries`);
