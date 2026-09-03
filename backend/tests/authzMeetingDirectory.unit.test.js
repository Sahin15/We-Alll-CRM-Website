import { jest } from '@jest/globals';
import { requireModulePermission } from '../src/authz/authzMiddleware.js';
import { hasPermission } from '../src/authz/policyEngine.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — meeting directory', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function runMiddleware(user) {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_COMPANY: 'true',
    };

    const handler = requireModulePermission('company', 'company.meeting.view', {
      legacyRoles: ['admin', 'superadmin', 'hr', 'manager', 'employee', 'hod', 'sales', 'telecaller', 'accounts', 'client'],
    });

    const req = {
      user,
      authzDepartmentName: user.authzDepartmentName,
      originalUrl: '/api/users/meeting-directory',
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

  test('HoD with employee meeting view can load meeting directory without team.user.view', () => {
    const user = makeAuthzTestUser('hod', {
      authzDepartmentName: 'sales',
    });

    expect(hasPermission(user, 'company.meeting.view')).toBe(true);
    expect(hasPermission(user, 'team.user.view')).toBe(false);

    const result = runMiddleware(user);
    expect(result.nextCalled).toBe(true);
  });

  test('employee without meeting view permission is blocked', () => {
    const user = makeAuthzTestUser('employee', {
      authzDepartmentName: 'sales',
      directPermissionGrants: [
        { permission: 'company.meeting.view', scope: 'COMPANY', effect: 'deny' },
      ],
    });

    const result = runMiddleware(user);
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });
});
