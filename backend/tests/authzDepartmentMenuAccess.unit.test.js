import { jest } from '@jest/globals';
import { requireModulePermission } from '../src/authz/authzMiddleware.js';
import { hasPermission } from '../src/authz/policyEngine.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — department admin vs directory access', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function runDeptListMiddleware(user) {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_TEAM: 'true',
    };

    const handler = requireModulePermission('team', 'team.department.view', {
      legacyRoles: ['manager', 'hr', 'admin', 'superadmin'],
    });

    const req = {
      user,
      authzDepartmentName: user.authzDepartmentName,
      originalUrl: '/api/departments',
      method: 'GET',
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });

    return { nextCalled, status: res.statusCode };
  }

  function runDeptDirectoryMiddleware(user) {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_DASHBOARD: 'true',
    };

    const handler = requireModulePermission('dashboard', 'dashboard.view', {
      legacyRoles: ['employee', 'hod', 'sales', 'manager', 'hr', 'admin', 'superadmin'],
    });

    const req = {
      user,
      authzDepartmentName: user.authzDepartmentName,
      originalUrl: '/api/departments/directory',
      method: 'GET',
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });

    return { nextCalled, status: res.statusCode };
  }

  test('HoD cannot access admin department list API without direct grant', () => {
    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    expect(hasPermission(user, 'team.department.view')).toBe(false);

    const result = runDeptListMiddleware(user);
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });

  test('HoD can load department directory names for team filters', () => {
    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    expect(hasPermission(user, 'dashboard.view')).toBe(true);

    const result = runDeptDirectoryMiddleware(user);
    expect(result.nextCalled).toBe(true);
  });

  test('manager retains admin department list access', () => {
    const user = makeAuthzTestUser('manager', { authzDepartmentName: 'operations' });
    expect(hasPermission(user, 'team.department.view')).toBe(true);

    const result = runDeptListMiddleware(user);
    expect(result.nextCalled).toBe(true);
  });

  test('HoD cannot load operational departments for client assignment without crm.client.manage', () => {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_CRM: 'true',
    };

    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    expect(hasPermission(user, 'crm.client.manage')).toBe(false);

    const handler = requireModulePermission('crm', 'crm.client.manage', {
      legacyRoles: ['manager', 'hr', 'admin', 'superadmin'],
    });

    const req = {
      user,
      authzDepartmentName: user.authzDepartmentName,
      originalUrl: '/api/departments/operational',
      method: 'GET',
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('HoD own-department detail bypasses team.department.view when enforce is on', async () => {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_TEAM: 'true',
    };

    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    expect(hasPermission(user, 'team.department.view')).toBe(false);

    const deptView = requireModulePermission('team', 'team.department.view', {
      legacyRoles: ['manager', 'hr', 'admin', 'superadmin'],
    });

    const { allowDeptViewOrHoDOfDepartment } = await import(
      '../src/middleware/hodMiddleware.js'
    );

    const handler = allowDeptViewOrHoDOfDepartment(deptView);
    const req = {
      user: { ...user, _id: 'hod-user-id' },
      params: { id: 'dept-123' },
      originalUrl: '/api/departments/dept-123',
      method: 'GET',
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    const findOneSpy = jest
      .spyOn(
        (await import('../src/models/departmentModel.js')).default,
        'findOne'
      )
      .mockResolvedValue({ _id: 'dept-123', name: 'Sales' });

    let nextCalled = false;
    await handler(req, res, () => {
      nextCalled = true;
    });

    expect(findOneSpy).toHaveBeenCalledWith({
      _id: 'dept-123',
      head: 'hod-user-id',
      status: 'active',
    });
    expect(nextCalled).toBe(true);
    expect(req.hodDepartment).toEqual({ _id: 'dept-123', name: 'Sales' });

    findOneSpy.mockRestore();
  });
});
