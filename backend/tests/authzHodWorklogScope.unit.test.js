import { buildEffectivePermissions } from '../src/authz/legacyAdapter.js';
import { hasPermission } from '../src/authz/policyEngine.js';
import { meetsMinScope, requireModulePermission } from '../src/authz/authzMiddleware.js';
import { isOwnDepartmentTeamViewer } from '../src/utils/teamRosterScope.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('HoD work log and team roster department scope', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('HoD worklog.entry.review is department-scoped, not company Work Log Management', () => {
    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    const effective = buildEffectivePermissions(user);

    expect(hasPermission(user, 'worklog.entry.review')).toBe(true);
    expect(effective.scopes['worklog.entry.review']).toBe('OWN_DEPARTMENT');
    expect(meetsMinScope(user, 'worklog.entry.review', 'COMPANY')).toBe(false);
  });

  test('HR worklog.entry.review is company-scoped for Work Log Management', () => {
    const user = makeAuthzTestUser('hr');
    const effective = buildEffectivePermissions(user);

    expect(effective.scopes['worklog.entry.review']).toBe('COMPANY');
    expect(meetsMinScope(user, 'worklog.entry.review', 'COMPANY')).toBe(true);
  });

  test('HoD team.user.view is department-scoped roster access', () => {
    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    const effective = buildEffectivePermissions(user);

    expect(hasPermission(user, 'team.user.view')).toBe(true);
    expect(effective.scopes['team.user.view']).toBe('OWN_DEPARTMENT');
    expect(isOwnDepartmentTeamViewer(user)).toBe(true);
    expect(hasPermission(user, 'team.user.create')).toBe(false);
    expect(hasPermission(user, 'team.user.update')).toBe(false);
    expect(meetsMinScope(user, 'team.user.view', 'COMPANY')).toBe(false);
  });

  test('admin team roster is not department-restricted', () => {
    const user = makeAuthzTestUser('admin');
    expect(isOwnDepartmentTeamViewer(user)).toBe(false);
    expect(meetsMinScope(user, 'worklog.entry.review', 'COMPANY')).toBe(true);
  });

  test('company-wide work log list middleware denies HoD even when review permission exists', () => {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_WORKLOG: 'true',
    };

    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    const handler = requireModulePermission('worklog', 'worklog.entry.review', {
      legacyRoles: ['admin', 'superadmin', 'hr', 'manager'],
      minScope: 'COMPANY',
    });

    const req = {
      user,
      originalUrl: '/api/worklogs/all',
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

  test('department work log review middleware still allows HoD', () => {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_WORKLOG: 'true',
    };

    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    const handler = requireModulePermission('worklog', 'worklog.entry.review', {
      legacyRoles: ['admin', 'superadmin', 'hr', 'manager', 'hod'],
    });

    const req = {
      user,
      originalUrl: '/api/worklogs/department/logs',
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

    expect(nextCalled).toBe(true);
  });

  test('department work log stats middleware allows HoD', () => {
    process.env = {
      ...originalEnv,
      AUTHZ_V2_ENFORCE: 'true',
      AUTHZ_V2_WORKLOG: 'true',
    };

    const user = makeAuthzTestUser('hod', { authzDepartmentName: 'sales' });
    const handler = requireModulePermission('worklog', 'worklog.entry.review', {
      legacyRoles: ['admin', 'superadmin', 'hr', 'manager', 'hod'],
    });

    const req = {
      user,
      originalUrl: '/api/worklogs/department/stats',
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

    expect(nextCalled).toBe(true);
  });
});
