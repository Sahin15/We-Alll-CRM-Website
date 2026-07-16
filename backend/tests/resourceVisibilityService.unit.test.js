import {
  canViewAllCompanyClients,
  canViewAllCompanyProjects,
  canViewAssignedClients,
  isPermissionExplicitlyDenied,
  COMPANY_VIEWER_ROLES,
} from '../src/services/resourceVisibilityService.js';

describe('resourceVisibilityService', () => {
  const adminUser = { _id: '507f1f77bcf86cd799439011', role: 'admin' };
  const employeeUser = { _id: '507f1f77bcf86cd799439012', role: 'employee' };

  test('company viewers include admin, hr, manager, superadmin only by role', () => {
    expect(COMPANY_VIEWER_ROLES).toEqual(['admin', 'superadmin', 'hr', 'manager']);
    expect(canViewAllCompanyClients(adminUser)).toBe(true);
    expect(canViewAllCompanyProjects(adminUser)).toBe(true);
    expect(canViewAllCompanyClients(employeeUser)).toBe(false);
    expect(canViewAllCompanyProjects(employeeUser)).toBe(false);
  });

  test('direct COMPANY grant allows employee to view all clients', () => {
    const grantedEmployee = {
      ...employeeUser,
      directPermissionGrants: [
        { permission: 'crm.client.view', scope: 'COMPANY', effect: 'grant' },
      ],
    };

    expect(canViewAllCompanyClients(grantedEmployee)).toBe(true);
  });

  test('explicit deny blocks default company viewer', () => {
    const deniedAdmin = {
      ...adminUser,
      directPermissionGrants: [
        { permission: 'crm.client.view', scope: 'COMPANY', effect: 'deny' },
      ],
    };

    expect(isPermissionExplicitlyDenied(deniedAdmin, 'crm.client.view')).toBe(true);
    expect(canViewAllCompanyClients(deniedAdmin)).toBe(false);
  });

  test('assigned client visibility respects deny on view_assigned', () => {
    const deniedEmployee = {
      ...employeeUser,
      directPermissionGrants: [
        { permission: 'crm.client.view_assigned', scope: 'PROJECT', effect: 'deny' },
      ],
    };

    expect(canViewAssignedClients(deniedEmployee)).toBe(false);
  });

  test('employee retains assigned client permission by default', () => {
    expect(canViewAssignedClients(employeeUser)).toBe(true);
  });
});
