import { jest } from '@jest/globals';
import { requireModulePermission } from '../src/authz/authzMiddleware.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — raw data assignable staff', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function runMiddleware(user) {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_CRM: 'true',
    };

    const handler = requireModulePermission('crm', 'crm.rawdata.manage', {
      legacyRoles: ['admin', 'superadmin', 'manager', 'employee', 'hod', 'sales'],
      legacyDepartments: ['Sales', 'Telecaller'],
    });

    const req = {
      user,
      authzDepartmentName: user.authzDepartmentName,
      originalUrl: '/api/raw-data/assignable-staff',
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

    return { nextCalled, status: res.statusCode };
  }

  test('employee with crm.rawdata.manage grant can load assignable staff', () => {
    const user = makeAuthzTestUser('employee', {
      authzDepartmentName: 'sales',
      directPermissionGrants: [
        { permission: 'crm.rawdata.manage', scope: 'COMPANY', effect: 'grant' },
      ],
    });

    const result = runMiddleware(user);
    expect(result.nextCalled).toBe(true);
  });

  test('accounts role without raw data permission is blocked', () => {
    const user = makeAuthzTestUser('accounts', {
      authzDepartmentName: 'finance',
    });

    const result = runMiddleware(user);
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });
});
