import { jest } from '@jest/globals';
import {
  parseEnvFile,
  validateBackendEnvironment,
  validateFrontendRolloutParity,
  validatePermissionCatalog,
  validateRolloutManifest,
  validateLegacyRoleMapping,
  formatValidationReport,
  runAuthzConfigValidation,
} from '../src/authz/configValidator.js';
import { AUTHZ_MODULE_NAMES } from '../src/authz/rolloutManifest.js';

describe('Authorization V2 — configuration validation (Phase 7)', () => {
  test('validatePermissionCatalog reports no duplicate keys', () => {
    const findings = validatePermissionCatalog();
    const errors = findings.filter((f) => f.level === 'error');
    expect(errors).toEqual([]);
    expect(findings.some((f) => f.level === 'ok' && f.section === 'Permission Catalog')).toBe(true);
  });

  test('validateRolloutManifest has no unknown or duplicate modules', () => {
    const findings = validateRolloutManifest();
    const errors = findings.filter((f) => f.level === 'error');
    expect(errors).toEqual([]);
  });

  test('validateLegacyRoleMapping has no unknown permission keys', () => {
    const findings = validateLegacyRoleMapping();
    const errors = findings.filter((f) => f.level === 'error');
    expect(errors).toEqual([]);
  });

  test('detects backend/frontend module flag mismatch', () => {
    const backendEnv = {
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_HIRING: 'true',
    };
    const frontendEnv = {};

    const findings = validateFrontendRolloutParity(backendEnv, frontendEnv);
    expect(
      findings.some(
        (f) =>
          f.level === 'warn' &&
          f.message.includes('Missing or disabled frontend flag') &&
          f.detail?.includes('VITE_AUTHZ_V2_HIRING')
      )
    ).toBe(true);
  });

  test('parseEnvFile reads key=value pairs', () => {
    const parsed = parseEnvFile(undefined);
    expect(parsed).toEqual({});
  });

  test('runAuthzConfigValidation returns structured report', () => {
    const report = runAuthzConfigValidation({
      backendEnv: {
        AUTHZ_V2_ENFORCE: 'false',
        AUTHZ_SHADOW_MODE: 'false',
      },
    });

    expect(report.summary).toMatchObject({
      okCount: expect.any(Number),
      warningCount: expect.any(Number),
      errorCount: expect.any(Number),
    });
    expect(Array.isArray(report.ok)).toBe(true);
    expect(Array.isArray(report.warnings)).toBe(true);
    expect(Array.isArray(report.errors)).toBe(true);
    expect(report.meta.totalModules).toBe(AUTHZ_MODULE_NAMES.length);
  });

  test('formatValidationReport renders human-readable sections', () => {
    const report = runAuthzConfigValidation({
      backendEnv: { AUTHZ_V2_ENFORCE: 'false' },
    });
    const text = formatValidationReport(report);
    expect(text).toContain('Authorization V2 — Configuration Validation');
    expect(text).toContain('Summary:');
  });
});
