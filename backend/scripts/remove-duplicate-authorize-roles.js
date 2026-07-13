/**
 * Phase 1: Remove duplicate authorizeRoles/authorize middleware when the same
 * route already uses requireModulePermission(..., { legacyRoles }) or a named
 * middleware constant defined with legacyRoles.
 *
 * Usage: node scripts/remove-duplicate-authorize-roles.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../src/routes');
const dryRun = process.argv.includes('--dry-run');

const AUTHORIZE_ONLY_LINE =
  /^\s*(authorizeRoles\([^)]*\)|authorize\(\.\.\.[^)]*\)),?\s*$/;

/**
 * @param {string} content
 * @returns {Set<string>}
 */
function findLegacyRoleMiddlewareNames(content) {
  const names = new Set();
  const re =
    /const\s+(\w+)\s*=\s*requireModulePermission\([\s\S]*?\{\s*legacyRoles\s*:/g;
  let match = re.exec(content);
  while (match) {
    names.add(match[1]);
    match = re.exec(content);
  }
  return names;
}

/**
 * @param {string} line
 * @param {Set<string>} legacyMiddlewareNames
 * @returns {boolean}
 */
function lineHasLegacyPermTarget(line, legacyMiddlewareNames) {
  if (/requireModulePermission\([^)]*\{[^}]*legacyRoles/.test(line)) {
    return true;
  }
  return [...legacyMiddlewareNames].some((name) => new RegExp(`\\b${name}\\b`).test(line));
}

/**
 * @param {string} content
 * @returns {{ content: string, removed: number }}
 */
function stripDuplicateAuthorizeLines(content) {
  const legacyMiddlewareNames = findLegacyRoleMiddlewareNames(content);
  const lines = content.split('\n');
  const out = [];
  let removed = 0;

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];

    if (AUTHORIZE_ONLY_LINE.test(line)) {
      const window = lines.slice(i, i + 6).join('\n');
      if (
        /requireModulePermission\([^)]*\{[^}]*legacyRoles/.test(window) ||
        [...legacyMiddlewareNames].some((name) => new RegExp(`\\b${name}\\b`).test(window))
      ) {
        removed += 1;
        continue;
      }
    }

    if (line.includes('authorizeRoles(') || line.includes('authorize(...')) {
      if (lineHasLegacyPermTarget(line, legacyMiddlewareNames)) {
        const before = line;
        line = line
          .replace(/,?\s*authorizeRoles\(\.\.\.[^)]*\)\s*,/g, ',')
          .replace(/,?\s*authorizeRoles\([^)]*\)\s*,/g, ',')
          .replace(/,?\s*authorize\(\.\.\.[^)]*\)\s*,/g, ',')
          .replace(/,\s*,/g, ',')
          .replace(/protect,\s*,/g, 'protect, ')
          .replace(/\(\s*,/g, '(');
        if (line !== before) {
          removed += 1;
        }
      }
    }

    out.push(line);
  }

  let result = out.join('\n');

  if (!/authorizeRoles/.test(result)) {
    result = result.replace(
      /import \{ authorizeRoles \} from ['"]\.\.\/middleware\/roleMiddleware\.js['"];\n?/g,
      ''
    );
  }

  if (!/\bauthorize\b/.test(result)) {
    result = result.replace(
      /import \{([^}]*)\} from ['"]\.\.\/middleware\/authMiddleware\.js['"];\n?/g,
      (match, imports) => {
        const names = imports.split(',').map((s) => s.trim()).filter(Boolean);
        const kept = names.filter((n) => n !== 'authorize');
        if (kept.length === 0) return '';
        return `import { ${kept.join(', ')} } from '../middleware/authMiddleware.js';\n`;
      }
    );
  }

  return { content: result, removed };
}

const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'));
let totalRemoved = 0;
const changed = [];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const { content, removed } = stripDuplicateAuthorizeLines(original);
  if (removed > 0 && content !== original) {
    changed.push({ file, removed });
    totalRemoved += removed;
    if (!dryRun) {
      fs.writeFileSync(filePath, content);
    }
  }
}

console.log(dryRun ? '[dry-run] ' : '', `Removed ${totalRemoved} duplicate authorizeRoles lines in ${changed.length} files:`);
for (const { file, removed } of changed) {
  console.log(`  ${file}: ${removed}`);
}
