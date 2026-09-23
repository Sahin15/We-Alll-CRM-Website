/**
 * Read-only scan helpers for CODEBASE_CLEANUP_AUDIT.md
 * Usage: node scripts/codebase-cleanup-audit-scan.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const frontendSrc = path.join(repoRoot, 'frontend/src');

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, ext, out);
    } else if (full.endsWith(ext)) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function fileText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

const routeFiles = [
  path.join(frontendSrc, 'routes/index.jsx'),
  path.join(frontendSrc, 'routes/lazyPages.js'),
];
const routeBlob = routeFiles.map(fileText).join('\n');

const pageFiles = walk(path.join(frontendSrc, 'pages'), '.jsx');
const orphanPages = [];
for (const page of pageFiles) {
  const base = path.basename(page, '.jsx');
  const relPath = rel(page);
  const patterns = [
    relPath,
    relPath.replace(/^frontend\/src\//, '../'),
    relPath.replace(/^frontend\/src\//, ''),
    `pages/${relPath.split('/pages/')[1]}`,
    base,
  ];
  const referenced = patterns.some((pat) => routeBlob.includes(pat));
  if (!referenced) {
    orphanPages.push(relPath);
  }
}

const lazyImports = [...routeBlob.matchAll(/import\(["']([^"']+)["']\)/g)].map((m) => m[1]);

const apiFiles = walk(path.join(frontendSrc, 'api'), '.js').map(rel);
const backendRoutes = walk(path.join(repoRoot, 'backend/src/routes'), '.js').map(rel);

const highOrphans = orphanPages.filter((p) =>
  p.includes('pages/dashboard/EmployeeDashboard')
);

console.log(
  JSON.stringify(
    {
      scannedAt: new Date().toISOString(),
      counts: {
        pageJsx: pageFiles.length,
        orphanPageCandidates: orphanPages.length,
        lazyImportPaths: lazyImports.length,
        frontendApiModules: apiFiles.length,
        backendRouteFiles: backendRoutes.length,
      },
      highConfidenceOrphanPages: highOrphans,
      orphanPageSample: orphanPages.slice(0, 40),
      orphanPageFull: orphanPages,
    },
    null,
    2
  )
);
