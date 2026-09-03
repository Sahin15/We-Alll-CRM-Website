import { jest } from '@jest/globals';
import { buildEffectivePermissions, getEffectiveGrants, legacyRoleAllows } from '../src/authz/legacyAdapter.js';
import { can, hasPermission } from '../src/authz/policyEngine.js';
import { isValidPermissionKey, PERMISSION_CATALOG } from '../src/authz/permissionCatalog.js';

describe('Authorization V2 — Legacy Adapter', () => {
  const employeeUser = { _id: 'emp1', role: 'employee', department: 'dept1' };
  const hodUser = {
    _id: 'hod1',
    role: 'hod',
    department: 'dept1',
    isHeadOfDepartment: true,
    headOfDepartment: 'dept1',
  };
  const adminUser = { _id: 'admin1', role: 'admin' };
  const clientUser = { _id: 'client1', role: 'client' };
  const superadminUser = { _id: 'sa1', role: 'superadmin' };

  test('employee receives self-service permissions', () => {
    const effective = buildEffectivePermissions(employeeUser);
    expect(effective.permissions).toContain('profile.view');
    expect(effective.permissions).toContain('attendance.clock');
    expect(effective.permissions).toContain('leave.request.create');
    expect(effective.scopes['profile.view']).toBe('SELF');
    expect(effective.source).toBe('legacy_adapter');
  });

  test('hod receives department_head grants in addition to employee', () => {
    const grants = getEffectiveGrants(hodUser);
    const keys = grants.map((g) => g.permission);
    expect(keys).toContain('procurement.pr.approve_hod');
    expect(keys).toContain('worklog.entry.review');
    expect(keys).toContain('attendance.clock');
  });

  test('admin can manage team users', () => {
    expect(hasPermission(adminUser, 'team.user.view')).toBe(true);
    expect(hasPermission(adminUser, 'payroll.slip.manage')).toBe(true);
  });

  test('employee cannot manage team users', () => {
    expect(hasPermission(employeeUser, 'team.user.view')).toBe(false);
  });

  test('client can view billing but not manage', () => {
    expect(hasPermission(clientUser, 'billing.invoice.view')).toBe(true);
    expect(hasPermission(clientUser, 'billing.invoice.manage')).toBe(false);
  });

  test('superadmin can perform any catalog permission', () => {
    expect(hasPermission(superadminUser, 'payroll.slip.manage')).toBe(true);
    expect(hasPermission(superadminUser, 'auth.role.manage')).toBe(true);
    for (const perm of PERMISSION_CATALOG) {
      expect(can(superadminUser, perm.key).allowed).toBe(true);
    }
  });

  test('legacyRoleAllows mirrors authorizeRoles', () => {
    expect(legacyRoleAllows(employeeUser, ['employee', 'hod'])).toBe(true);
    expect(legacyRoleAllows(employeeUser, ['admin'])).toBe(false);
    expect(legacyRoleAllows(hodUser, ['hod'])).toBe(true);
  });

  test('unknown permission is denied for non-superadmin', () => {
    expect(can(employeeUser, 'nonexistent.permission').allowed).toBe(false);
  });

  test('permission catalog keys are valid', () => {
    expect(isValidPermissionKey('profile.view')).toBe(true);
    expect(PERMISSION_CATALOG.length).toBeGreaterThan(40);
  });
});
