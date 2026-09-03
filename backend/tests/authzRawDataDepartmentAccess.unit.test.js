import { jest } from '@jest/globals';
import { requireModulePermission } from '../src/authz/authzMiddleware.js';

describe('Authorization V2 — raw data legacy department access', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function runMiddleware(user, options = {}) {
    process.env = { ...originalEnv, AUTHZ_V2_ENFORCE: 'false', AUTHZ_V2_CRM: 'false' };

    const handler = requireModulePermission('crm', 'crm.rawdata.manage', {
      legacyRoles: ['admin', 'superadmin', 'manager', 'employee', 'hod', 'sales'],
      legacyDepartments: ['Sales', 'Telecaller'],
      ...options,
    });

    const req = {
      user,
      authzDepartmentName: user.authzDepartmentName,
      originalUrl: '/api/raw-data',
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

  test('allows Sales department employee without sales role via legacy department gate', () => {
    const result = runMiddleware({
      _id: 'emp-sales',
      role: 'employee',
      authzDepartmentName: 'sales',
    });
    expect(result.nextCalled).toBe(true);
  });

  test('allows Telecaller department employee via legacy department gate', () => {
    const result = runMiddleware({
      _id: 'emp-telecaller',
      role: 'employee',
      authzDepartmentName: 'telecaller',
    });
    expect(result.nextCalled).toBe(true);
  });

  test('allows sales role via V2 permission even outside Sales department', () => {
    const result = runMiddleware({
      _id: 'sales1',
      role: 'sales',
      authzDepartmentName: 'engineering',
    });
    expect(result.nextCalled).toBe(true);
  });

  test('allows manager via legacy role gate', () => {
    const result = runMiddleware({
      _id: 'mgr1',
      role: 'manager',
      authzDepartmentName: 'engineering',
    });
    expect(result.nextCalled).toBe(true);
  });

  test('blocks intern outside Sales/Telecaller with no CRM permission', () => {
    const result = runMiddleware({
      _id: 'intern1',
      role: 'intern',
      authzDepartmentName: 'engineering',
    });
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });
});
