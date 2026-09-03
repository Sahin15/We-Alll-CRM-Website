import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

const PROJECT_MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];
const PROJECT_VIEW_ROLES = ['employee', 'hod', 'sales', 'client'];

/**
 * Projects pilot parity: view vs manage gates match legacy project routes.
 */
describe('Authorization V2 — Projects pilot parity', () => {
  test.each(PROJECT_MANAGE_ROLES)('role %s can view and manage projects', (role) => {
    const user = makeAuthzTestUser(role);
    expect(hasPermission(user, 'projects.project.view')).toBe(true);
    expect(hasPermission(user, 'projects.project.manage')).toBe(true);
  });

  test('hod can view and manage projects (department head grants)', () => {
    const user = makeAuthzTestUser('hod');
    expect(hasPermission(user, 'projects.project.view')).toBe(true);
    expect(hasPermission(user, 'projects.project.manage')).toBe(true);
  });

  test.each(PROJECT_VIEW_ROLES)('role %s can view projects', (role) => {
    const user = makeAuthzTestUser(role);
    expect(hasPermission(user, 'projects.project.view')).toBe(true);
  });

  test.each(['employee', 'sales', 'client'])(
    'role %s cannot manage projects at company scope',
    (role) => {
      const user = makeAuthzTestUser(role);
      expect(hasPermission(user, 'projects.project.manage')).toBe(false);
    }
  );

  test('accounts lacks project permissions', () => {
    const user = makeAuthzTestUser('accounts');
    expect(hasPermission(user, 'projects.project.view')).toBe(false);
    expect(hasPermission(user, 'projects.project.manage')).toBe(false);
  });

  test('superadmin has full project access via platform bypass', () => {
    const user = makeAuthzTestUser('superadmin');
    expect(hasPermission(user, 'projects.project.view')).toBe(true);
    expect(hasPermission(user, 'projects.project.manage')).toBe(true);
  });
});
