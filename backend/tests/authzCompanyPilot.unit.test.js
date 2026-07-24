import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { ALL_LEGACY_ROLES } from '../src/authz/legacyRoleMapping.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

const COMPANY_VIEW_PERMISSIONS = [
  'company.meeting.view',
  'company.policy.view',
  'company.announcement.view',
];

const COMPANY_MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];
const COMPANY_MEETING_MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];

/**
 * Company pilot parity: view for all roles; policy/announcement manage for admin gate roles.
 */
describe('Authorization V2 — Company pilot parity', () => {
  test.each(ALL_LEGACY_ROLES)('role %s has company view permissions', (role) => {
    const user = makeAuthzTestUser(role);
    for (const permission of COMPANY_VIEW_PERMISSIONS) {
      expect(hasPermission(user, permission)).toBe(true);
    }
  });

  test.each(ALL_LEGACY_ROLES)(
    'role %s policy/announcement manage matches legacy admin gate',
    (role) => {
      const user = makeAuthzTestUser(role);
      const expected = COMPANY_MANAGE_ROLES.includes(role);
      expect(hasPermission(user, 'company.policy.manage')).toBe(expected);
      expect(hasPermission(user, 'company.announcement.manage')).toBe(expected);
    }
  );

  test('company.meeting.manage matches legacy admin gate roles', () => {
    for (const role of ALL_LEGACY_ROLES) {
      const user = makeAuthzTestUser(role);
      const expected = COMPANY_MEETING_MANAGE_ROLES.includes(role);
      expect(hasPermission(user, 'company.meeting.manage')).toBe(expected);
    }
  });

  test('employee with direct company.policy.manage grant can manage policies', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'company.policy.manage', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(hasPermission(user, 'company.policy.manage')).toBe(true);
  });
});
