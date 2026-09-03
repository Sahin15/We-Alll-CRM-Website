/**
 * Authorization V2 — Configuration validation (Phase 7).
 * Read-only checks; does not change authorization decisions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AUTHZ_MODULE_NAMES,
  AUTHZ_ROLLOUT_WAVES,
  authzModuleEnvKey,
  authzFrontendModuleEnvKey,
} from './rolloutManifest.js';
import {
  PERMISSION_CATALOG,
  VALID_PERMISSION_KEYS,
} from './permissionCatalog.js';
import { LEGACY_ROLE_TO_ACCESS_ROLES } from './legacyRoleMapping.js';
import {
  isAuthzEnforceEnabled,
  isAuthzShadowEnabled,
  isAuthzModuleEnabled,
} from './moduleFlags.js';

const PERMISSION_KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const FRONTEND_ROOT = path.resolve(BACKEND_ROOT, '../frontend');

/**
 * @typedef {'ok'|'warn'|'error'} ValidationLevel
 * @typedef {{ level: ValidationLevel, section: string, message: string, detail?: string }} ValidationFinding
 * @typedef {{
 *   ok: ValidationFinding[],
 *   warnings: ValidationFinding[],
 *   errors: ValidationFinding[],
 *   summary: { okCount: number, warningCount: number, errorCount: number }
 * }} AuthzConfigValidationReport
 */

/**
 * @param {ValidationLevel} level
 * @param {string} section
 * @param {string} message
 * @param {string} [detail]
 * @returns {ValidationFinding}
 */
function finding(level, section, message, detail) {
  return { level, section, message, detail };
}

/**
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
export function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * @param {Record<string, string>} env
 * @param {string} key
 * @returns {boolean|null}
 */
function parseBooleanEnv(env, key) {
  if (!(key in env)) return null;
  const value = String(env[key]).trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false' || value === '') return false;
  return null;
}

/**
 * @param {Record<string, string>} [backendEnv]
 * @returns {ValidationFinding[]}
 */
export function validateBackendEnvironment(backendEnv = process.env) {
  const findings = [];

  const shadow = parseBooleanEnv(backendEnv, 'AUTHZ_SHADOW_MODE');
  if (backendEnv.AUTHZ_SHADOW_MODE !== undefined && shadow === null) {
    findings.push(
      finding(
        'warn',
        'Backend Environment',
        'AUTHZ_SHADOW_MODE has non-boolean value',
        `Value: ${backendEnv.AUTHZ_SHADOW_MODE}`
      )
    );
  } else {
    findings.push(
      finding(
        'ok',
        'Backend Environment',
        `AUTHZ_SHADOW_MODE=${shadow === true ? 'true' : 'false/off'}`
      )
    );
  }

  const enforce = parseBooleanEnv(backendEnv, 'AUTHZ_V2_ENFORCE');
  if (backendEnv.AUTHZ_V2_ENFORCE !== undefined && enforce === null) {
    findings.push(
      finding(
        'warn',
        'Backend Environment',
        'AUTHZ_V2_ENFORCE has non-boolean value',
        `Value: ${backendEnv.AUTHZ_V2_ENFORCE}`
      )
    );
  } else {
    findings.push(
      finding(
        'ok',
        'Backend Environment',
        `AUTHZ_V2_ENFORCE=${enforce === true ? 'true' : 'false/off'}`
      )
    );
  }

  for (const moduleName of AUTHZ_MODULE_NAMES) {
    const key = authzModuleEnvKey(moduleName);
    const parsed = parseBooleanEnv(backendEnv, key);
    if (backendEnv[key] !== undefined && parsed === null) {
      findings.push(
        finding(
          'warn',
          'Backend Environment',
          `${key} has non-boolean value`,
          `Value: ${backendEnv[key]}`
        )
      );
    }
  }

  const enabledCount = AUTHZ_MODULE_NAMES.filter(
    (name) => parseBooleanEnv(backendEnv, authzModuleEnvKey(name)) === true
  ).length;

  findings.push(
    finding(
      'ok',
      'Backend Environment',
      `Module flags enabled: ${enabledCount}/${AUTHZ_MODULE_NAMES.length}`
    )
  );

  return findings;
}

/**
 * @param {Record<string, string>} backendEnv
 * @param {Record<string, string>} frontendEnv
 * @returns {ValidationFinding[]}
 */
export function validateFrontendRolloutParity(backendEnv, frontendEnv) {
  const findings = [];

  for (const moduleName of AUTHZ_MODULE_NAMES) {
    const backendKey = authzModuleEnvKey(moduleName);
    const frontendKey = authzFrontendModuleEnvKey(moduleName);
    const backendOn = parseBooleanEnv(backendEnv, backendKey) === true;
    const frontendOn = parseBooleanEnv(frontendEnv, frontendKey) === true;

    if (backendOn && !frontendOn) {
      findings.push(
        finding(
          'warn',
          'Frontend Rollout Configuration',
          `Missing or disabled frontend flag for enabled backend module "${moduleName}"`,
          `${frontendKey}=true expected (backend ${backendKey}=true)`
        )
      );
    } else if (frontendOn && !backendOn) {
      findings.push(
        finding(
          'warn',
          'Frontend Rollout Configuration',
          `Frontend module enabled without matching backend flag "${moduleName}"`,
          `${backendKey}=true expected (${frontendKey}=true)`
        )
      );
    }
  }

  const extraFrontendKeys = Object.keys(frontendEnv).filter(
    (key) =>
      key.startsWith('VITE_AUTHZ_V2_') &&
      !AUTHZ_MODULE_NAMES.some((name) => key === authzFrontendModuleEnvKey(name))
  );

  for (const key of extraFrontendKeys) {
    if (parseBooleanEnv(frontendEnv, key) === true) {
      findings.push(
        finding(
          'warn',
          'Frontend Rollout Configuration',
          `Unknown frontend authz flag enabled: ${key}`,
          'Not listed in rolloutManifest AUTHZ_MODULE_NAMES'
        )
      );
    }
  }

  if (findings.length === 0) {
    findings.push(
      finding('ok', 'Frontend Rollout Configuration', 'Backend/frontend module flags are aligned')
    );
  }

  return findings;
}

/**
 * @returns {ValidationFinding[]}
 */
export function validatePermissionCatalog() {
  const findings = [];
  const seen = new Set();
  const duplicates = [];

  for (const entry of PERMISSION_CATALOG) {
    if (seen.has(entry.key)) {
      duplicates.push(entry.key);
    }
    seen.add(entry.key);

    if (!PERMISSION_KEY_PATTERN.test(entry.key) && entry.key !== 'platform.admin') {
      findings.push(
        finding(
          'error',
          'Permission Catalog',
          `Invalid permission key format: ${entry.key}`,
          'Expected module.resource.action pattern'
        )
      );
    }

    if (!entry.module || !entry.description) {
      findings.push(
        finding(
          'warn',
          'Permission Catalog',
          `Permission "${entry.key}" missing module or description`
        )
      );
    }
  }

  for (const key of duplicates) {
    findings.push(
      finding('error', 'Permission Catalog', `Duplicate permission key: ${key}`)
    );
  }

  if (duplicates.length === 0) {
    findings.push(
      finding(
        'ok',
        'Permission Catalog',
        `${PERMISSION_CATALOG.length} permissions registered with unique keys`
      )
    );
  }

  return findings;
}

/**
 * @returns {ValidationFinding[]}
 */
export function validateRolloutManifest() {
  const findings = [];
  const waveModules = [];
  const seenInWaves = new Set();
  const duplicates = [];

  for (const wave of AUTHZ_ROLLOUT_WAVES) {
    for (const moduleName of wave.modules) {
      waveModules.push(moduleName);
      if (seenInWaves.has(moduleName)) {
        duplicates.push(moduleName);
      }
      seenInWaves.add(moduleName);

      if (!AUTHZ_MODULE_NAMES.includes(moduleName)) {
        findings.push(
          finding(
            'error',
            'Rollout Manifest',
            `Wave ${wave.id} references unknown module: ${moduleName}`
          )
        );
      }
    }
  }

  for (const moduleName of AUTHZ_MODULE_NAMES) {
    if (!seenInWaves.has(moduleName)) {
      findings.push(
        finding(
          'warn',
          'Rollout Manifest',
          `Module "${moduleName}" is not assigned to any rollout wave`
        )
      );
    }
  }

  for (const moduleName of duplicates) {
    findings.push(
      finding('error', 'Rollout Manifest', `Duplicate module in waves: ${moduleName}`)
    );
  }

  if (findings.filter((f) => f.level !== 'ok').length === 0) {
    findings.unshift(
      finding(
        'ok',
        'Rollout Manifest',
        `${AUTHZ_MODULE_NAMES.length} modules covered across ${AUTHZ_ROLLOUT_WAVES.length} waves`
      )
    );
  }

  return findings;
}

/**
 * @returns {ValidationFinding[]}
 */
export function validateLegacyRoleMapping() {
  const findings = [];
  const referenced = new Set();
  const unknown = [];
  const catalogKeys = new Set(PERMISSION_CATALOG.map((p) => p.key));

  for (const roleDefs of Object.values(LEGACY_ROLE_TO_ACCESS_ROLES)) {
    for (const roleDef of roleDefs) {
      for (const grant of roleDef.grants) {
        referenced.add(grant.permission);
        if (
          !VALID_PERMISSION_KEYS.has(grant.permission) &&
          grant.permission !== 'platform.admin'
        ) {
          unknown.push(grant.permission);
        }
      }
    }
  }

  for (const key of [...new Set(unknown)]) {
    findings.push(
      finding(
        'error',
        'Legacy Role Mapping',
        `Unknown permission key in role grants: ${key}`,
        'Not registered in permission catalog'
      )
    );
  }

  const obsolete = [...catalogKeys].filter((key) => {
    if (key === 'platform.admin') return false;
    return !referenced.has(key);
  });

  if (obsolete.length > 0) {
    findings.push(
      finding(
        'warn',
        'Legacy Role Mapping',
        `${obsolete.length} catalog permission(s) not granted by any legacy role`,
        obsolete.slice(0, 8).join(', ') + (obsolete.length > 8 ? '…' : '')
      )
    );
  }

  if (unknown.length === 0) {
    findings.unshift(
      finding(
        'ok',
        'Legacy Role Mapping',
        `All legacy role grant keys exist in catalog (${referenced.size} references)`
      )
    );
  }

  return findings;
}

/**
 * @param {string} routesDir
 * @returns {ValidationFinding[]}
 */
export function validateRouteProtection(routesDir = path.join(BACKEND_ROOT, 'src/routes')) {
  const findings = [];
  const protectOnlyFiles = [];
  const legacyAuthorizeFiles = [];
  const routePermissionPattern =
    /requireModulePermission(?:Any)?\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g;
  const referencedPermissions = new Set();

  if (!fs.existsSync(routesDir)) {
    findings.push(
      finding('error', 'Route Protection', `Routes directory not found: ${routesDir}`)
    );
    return findings;
  }

  const files = fs.readdirSync(routesDir).filter((name) => name.endsWith('.js'));

  for (const fileName of files) {
    const filePath = path.join(routesDir, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const hasProtect = /\bprotect\b/.test(content);
    const hasModulePermission = /requireModulePermission(?:Any)?/.test(content);
    const hasLegacyAuthorize = /\bauthorize\s*\(/.test(content);

    if (hasLegacyAuthorize) {
      legacyAuthorizeFiles.push(fileName);
    }

    if (hasProtect && !hasModulePermission) {
      protectOnlyFiles.push(fileName);
    }

    let match;
    while ((match = routePermissionPattern.exec(content)) !== null) {
      referencedPermissions.add(match[1]);
    }

    const anyPattern = /requireModulePermissionAny\s*\(\s*['"][^'"]+['"]\s*,\s*\[([^\]]+)\]/g;
    while ((match = anyPattern.exec(content)) !== null) {
      const keys = match[1].match(/['"]([^'"]+)['"]/g) || [];
      for (const raw of keys) {
        referencedPermissions.add(raw.replace(/['"]/g, ''));
      }
    }
  }

  for (const fileName of protectOnlyFiles) {
    findings.push(
      finding(
        'warn',
        'Route Protection',
        `Route file uses protect() without Authorization V2 middleware: ${fileName}`,
        'Add requireModulePermission or migrate legacy authorize()'
      )
    );
  }

  for (const fileName of legacyAuthorizeFiles) {
    findings.push(
      finding(
        'warn',
        'Route Protection',
        `Route file uses legacy authorize() only: ${fileName}`,
        'Migrate to requireModulePermission when module enforce is ON'
      )
    );
  }

  for (const permission of referencedPermissions) {
    if (!VALID_PERMISSION_KEYS.has(permission) && permission !== 'platform.admin') {
      findings.push(
        finding(
          'error',
          'Route Protection',
          `Route references unregistered permission: ${permission}`
        )
      );
    }
  }

  if (protectOnlyFiles.length === 0 && legacyAuthorizeFiles.length === 0) {
    findings.unshift(
      finding(
        'ok',
        'Route Protection',
        `All ${files.length} route files use Authorization V2 middleware or are public`
      )
    );
  } else {
    findings.unshift(
      finding(
        'ok',
        'Route Protection',
        `${files.length - protectOnlyFiles.length}/${files.length} route files use requireModulePermission`
      )
    );
  }

  return findings;
}

/**
 * @param {string} content
 * @returns {Set<string>}
 */
function extractQuotedPermissions(content) {
  const keys = new Set();
  const patterns = [
    /permission\s*=\s*["']([^"']+)["']/g,
    /permission:\s*["']([^"']+)["']/g,
    /alternatePermissions=\{?\[([^\]]+)\]/g,
    /alternatePermissions:\s*\[([^\]]+)\]/g,
  ];

  for (const pattern of patterns.slice(0, 2)) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
  }

  for (const pattern of patterns.slice(2)) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const inner = match[1].match(/["']([^"']+)["']/g) || [];
      for (const raw of inner) {
        keys.add(raw.replace(/['"]/g, ''));
      }
    }
  }

  return keys;
}

/**
 * @param {string} [frontendRoot]
 * @returns {ValidationFinding[]}
 */
export function validateFrontendConfiguration(frontendRoot = FRONTEND_ROOT) {
  const findings = [];
  const filesToScan = [
    { label: 'Sidebar', relativePath: 'src/components/layout/Sidebar.jsx' },
    { label: 'PermissionRoute registry', relativePath: 'src/routes/index.jsx' },
    { label: 'PAGE_ACCESS', relativePath: 'src/constants/pageAccess.js' },
  ];

  const allReferenced = new Set();
  const missingMappings = [];

  for (const { label, relativePath } of filesToScan) {
    const filePath = path.join(frontendRoot, relativePath);
    if (!fs.existsSync(filePath)) {
      findings.push(
        finding(
          'warn',
          'Frontend Configuration',
          `${label} file not found`,
          relativePath
        )
      );
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const permissions = extractQuotedPermissions(content);

    if (permissions.size === 0) {
      missingMappings.push(`${label} (${relativePath})`);
    }

    for (const key of permissions) {
      allReferenced.add(key);
      if (!VALID_PERMISSION_KEYS.has(key) && key !== 'platform.admin') {
        findings.push(
          finding(
            'error',
            'Frontend Configuration',
            `${label} references unknown permission: ${key}`,
            relativePath
          )
        );
      }
    }
  }

  const authzFlagsPath = path.join(frontendRoot, 'src/utils/authzFlags.js');
  if (fs.existsSync(authzFlagsPath)) {
    const flagsContent = fs.readFileSync(authzFlagsPath, 'utf8');
    const arrayMatch = flagsContent.match(
      /const AUTHZ_V2_MODULES\s*=\s*\[([\s\S]*?)\];/
    );
    const frontendModules = arrayMatch
      ? (arrayMatch[1].match(/['"]([a-z_]+)['"]/g) || []).map((m) =>
          m.replace(/['"]/g, '')
        )
      : [];

    if (frontendModules.length !== AUTHZ_MODULE_NAMES.length) {
      findings.push(
        finding(
          'warn',
          'Frontend Configuration',
          'authzFlags.js module list may be out of sync with rolloutManifest',
          `Found ${frontendModules.length}, expected ${AUTHZ_MODULE_NAMES.length}`
        )
      );
    } else {
      findings.push(
        finding('ok', 'Frontend Configuration', 'authzFlags.js module list matches rollout manifest')
      );
    }
  }

  for (const item of missingMappings) {
    findings.push(
      finding(
        'warn',
        'Frontend Configuration',
        `No permission mappings detected in ${item}`
      )
    );
  }

  if (findings.filter((f) => f.level === 'ok').length === 0 && allReferenced.size > 0) {
    findings.unshift(
      finding(
        'ok',
        'Frontend Configuration',
        `${allReferenced.size} permission keys referenced across sidebar/routes/pageAccess`
      )
    );
  }

  return findings;
}

/**
 * @param {object} [options]
 * @param {Record<string, string>} [options.backendEnv]
 * @param {string} [options.backendRoot]
 * @param {string} [options.frontendRoot]
 * @returns {AuthzConfigValidationReport}
 */
export function runAuthzConfigValidation(options = {}) {
  const backendRoot = options.backendRoot || BACKEND_ROOT;
  const frontendRoot = options.frontendRoot || FRONTEND_ROOT;
  const backendEnvPath = path.join(backendRoot, '.env');
  const backendEnv = {
    ...parseEnvFile(backendEnvPath),
    ...(options.backendEnv || process.env),
  };

  const frontendEnv = {
    ...parseEnvFile(path.join(frontendRoot, '.env')),
    ...parseEnvFile(path.join(frontendRoot, '.env.production')),
    ...parseEnvFile(path.join(frontendRoot, '.env.local')),
  };

  const sections = [
    validateBackendEnvironment(backendEnv),
    validateFrontendRolloutParity(backendEnv, frontendEnv),
    validatePermissionCatalog(),
    validateRolloutManifest(),
    validateLegacyRoleMapping(),
    validateRouteProtection(path.join(backendRoot, 'src/routes')),
    validateFrontendConfiguration(frontendRoot),
  ];

  const all = sections.flat();
  const ok = all.filter((f) => f.level === 'ok');
  const warnings = all.filter((f) => f.level === 'warn');
  const errors = all.filter((f) => f.level === 'error');

  return {
    ok,
    warnings,
    errors,
    summary: {
      okCount: ok.length,
      warningCount: warnings.length,
      errorCount: errors.length,
    },
    meta: {
      enforce: isAuthzEnforceEnabled(),
      shadowMode: isAuthzShadowEnabled(),
      enabledModuleCount: AUTHZ_MODULE_NAMES.filter((name) => isAuthzModuleEnabled(name)).length,
      totalModules: AUTHZ_MODULE_NAMES.length,
      backendEnvPath,
      frontendEnvPaths: [
        path.join(frontendRoot, '.env'),
        path.join(frontendRoot, '.env.production'),
      ],
    },
  };
}

/**
 * @param {AuthzConfigValidationReport} report
 * @returns {string}
 */
export function formatValidationReport(report) {
  const lines = [];
  lines.push('Authorization V2 — Configuration Validation');
  lines.push('==========================================');
  lines.push(
    `Summary: ${report.summary.okCount} passed, ${report.summary.warningCount} warning(s), ${report.summary.errorCount} error(s)`
  );

  if (report.meta) {
    lines.push(
      `Runtime: enforce=${report.meta.enforce ? 'ON' : 'off'}, shadow=${report.meta.shadowMode ? 'ON' : 'off'}, modules=${report.meta.enabledModuleCount}/${report.meta.totalModules}`
    );
    lines.push(`Backend env: ${report.meta.backendEnvPath}`);
  }

  lines.push('');

  const printSection = (title, items, symbol) => {
    if (!items.length) return;
    lines.push(title);
    lines.push('-'.repeat(title.length));
    for (const item of items) {
      const prefix = symbol;
      const detail = item.detail ? ` — ${item.detail}` : '';
      lines.push(`${prefix} [${item.section}] ${item.message}${detail}`);
    }
    lines.push('');
  };

  printSection('Passed', report.ok, '✔');
  printSection('Warnings', report.warnings, '⚠');
  printSection('Errors', report.errors, '✖');

  return lines.join('\n');
}

/**
 * Log validation results on startup (warn-only; never throws).
 *
 * @param {object} [options]
 * @returns {AuthzConfigValidationReport}
 */
export function runStartupAuthzValidation(options = {}) {
  const report = runAuthzConfigValidation(options);
  const formatted = formatValidationReport(report);

  const verbose = options.verbose === true;

  if (report.summary.errorCount > 0) {
    console.error(`[authz] Configuration validation found error(s):\n${formatted}`);
  } else if (report.summary.warningCount > 0) {
    if (verbose) {
      console.warn(`[authz] Configuration validation warning(s):\n${formatted}`);
    } else {
      console.log(
        `[authz] OK — ${report.summary.okCount} passed, ${report.summary.warningCount} warning(s) (set AUTHZ_VALIDATE_VERBOSE=true for details)`
      );
    }
  } else if (verbose) {
    console.log(`[authz] Configuration validation passed.\n${formatted}`);
  }

  return report;
}
