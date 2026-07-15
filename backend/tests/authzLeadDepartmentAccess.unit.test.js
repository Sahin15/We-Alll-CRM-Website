import { jest } from '@jest/globals';
import {
  legacyDepartmentAllows,
  legacyRolesOrDepartmentsAllows,
} from '../src/authz/legacyAdapter.js';
import { requireModulePermission } from '../src/authz/authzMiddleware.js';

describe('Authorization V2 — legacy department access (Phase 10)', () => {
  test('legacyDepartmentAllows matches department names case-insensitively', () => {
    expect(legacyDepartmentAllows('sales', ['Sales'])).toBe(true);
    expect(legacyDepartmentAllows('engineering', ['Sales'])).toBe(false);
  });

  test('legacyRolesOrDepartmentsAllows accepts allowed role without department', () => {
    const user = { role: 'manager' };
    expect(
      legacyRolesOrDepartmentsAllows(user, ['manager'], '', ['Sales'])
    ).toBe(true);
  });

  test('legacyRolesOrDepartmentsAllows accepts Sales department for non-listed role', () => {
    const user = { role: 'intern' };
    expect(
      legacyRolesOrDepartmentsAllows(user, ['admin'], 'sales', ['Sales'])
    ).toBe(true);
  });

  test('legacyRolesOrDepartmentsAllows rejects user with neither role nor department', () => {
    const user = { role: 'intern' };
    expect(
      legacyRolesOrDepartmentsAllows(user, ['admin', 'manager'], 'engineering', ['Sales'])
    ).toBe(false);
  });

  describe('requireModulePermission with legacyDepartments', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    function runMiddleware(user, options = {}) {
      process.env = { ...originalEnv, AUTHZ_V2_ENFORCE: 'false', AUTHZ_V2_CRM: 'false' };

      const handler = requireModulePermission('crm', 'crm.lead.view', {
        legacyRoles: ['admin'],
        legacyDepartments: ['Sales'],
        ...options,
      });

      const req = {
        user,
        authzDepartmentName: user.authzDepartmentName,
        originalUrl: '/api/leads',
        method: 'GET',
      };
      const res = {
        statusCode: 200,
        body: undefined,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };

      let nextCalled = false;
      handler(req, res, () => {
        nextCalled = true;
      });

      return { nextCalled, status: res.statusCode, body: res.body };
    }

    test('allows Sales department employee without CRM role grant via legacy department gate', () => {
      const result = runMiddleware({
        _id: 'emp-sales',
        role: 'employee',
        authzDepartmentName: 'sales',
      });
      expect(result.nextCalled).toBe(true);
    });

    test('allows sales role via V2 permission even without Sales department', () => {
      const result = runMiddleware({
        _id: 'sales1',
        role: 'sales',
        authzDepartmentName: 'engineering',
      });
      expect(result.nextCalled).toBe(true);
    });

    test('blocks intern outside Sales with no CRM permission', () => {
      const result = runMiddleware({
        _id: 'intern1',
        role: 'intern',
        authzDepartmentName: 'engineering',
      });
      expect(result.nextCalled).toBe(false);
      expect(result.status).toBe(403);
    });
  });
});
