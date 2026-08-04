import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — Team menu permission grants', () => {
  test('employee with team.user.view only can view employees but not admin users list permission', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'team.user.view', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(hasPermission(user, 'team.user.view')).toBe(true);
    expect(hasPermission(user, 'team.user.update')).toBe(false);
  });

  test('employee with team.user.update can access admin users tab permission', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'team.user.update', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(hasPermission(user, 'team.user.update')).toBe(true);
  });

  test('deny on team.user.update removes admin users access while view remains', () => {
    const user = makeAuthzTestUser('hr', {
      directPermissionGrants: [
        { permission: 'team.user.update', scope: 'COMPANY', effect: 'deny' },
      ],
    });
    expect(hasPermission(user, 'team.user.view')).toBe(true);
    expect(hasPermission(user, 'team.user.update')).toBe(false);
  });

  test('worklog.entry.review grant controls work log management tab', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'worklog.entry.review', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(hasPermission(user, 'worklog.entry.review')).toBe(true);
    expect(hasPermission(user, 'team.user.view')).toBe(false);
  });
});
