import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * Finance pilot parity: expense claims and payroll.
 */
describe('Authorization V2 — Finance pilot parity', () => {
  test.each(['employee', 'hod'])(
    'role %s can submit expense claims and view own payroll',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'expense.claim.create')).toBe(true);
      expect(hasPermission(user, 'payroll.slip.view_self')).toBe(true);
      expect(hasPermission(user, 'expense.claim.approve')).toBe(false);
      expect(hasPermission(user, 'payroll.slip.manage')).toBe(false);
    }
  );

  test.each(['admin', 'superadmin', 'hr'])(
    'role %s can approve expenses and manage payroll',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'expense.claim.approve')).toBe(true);
      expect(hasPermission(user, 'payroll.structure.manage')).toBe(true);
      expect(hasPermission(user, 'payroll.slip.manage')).toBe(true);
    }
  );

  test('accounts can manage payroll and approve expenses', () => {
    const user = { _id: 'acc1', role: 'accounts' };
    expect(hasPermission(user, 'expense.claim.approve')).toBe(true);
    expect(hasPermission(user, 'payroll.structure.manage')).toBe(true);
    expect(hasPermission(user, 'payroll.slip.manage')).toBe(true);
  });

  test('manager can approve expenses and manage payroll', () => {
    const user = { _id: 'mgr1', role: 'manager' };
    expect(hasPermission(user, 'expense.claim.approve')).toBe(true);
    expect(hasPermission(user, 'payroll.structure.manage')).toBe(true);
    expect(hasPermission(user, 'payroll.slip.manage')).toBe(true);
  });

  test.each(['admin', 'superadmin', 'hr', 'accounts', 'manager'])(
    'role %s can manage payroll periods',
    (role) => {
      const user = { _id: `user-${role}-period`, role };
      expect(hasPermission(user, 'payroll.period.manage')).toBe(true);
    }
  );

  test.each(['employee', 'hod'])(
    'role %s cannot manage payroll periods',
    (role) => {
      const user = { _id: `user-${role}-period`, role };
      expect(hasPermission(user, 'payroll.period.manage')).toBe(false);
    }
  );

  test.each(['admin', 'superadmin', 'hr', 'accounts', 'manager'])(
    'role %s can manage salary components',
    (role) => {
      const user = { _id: `user-${role}-comp`, role };
      expect(hasPermission(user, 'payroll.component.manage')).toBe(true);
    }
  );

  test.each(['employee', 'hod'])(
    'role %s cannot manage salary components',
    (role) => {
      const user = { _id: `user-${role}-comp`, role };
      expect(hasPermission(user, 'payroll.component.manage')).toBe(false);
    }
  );

  test.each(['admin', 'superadmin', 'hr', 'accounts', 'manager'])(
    'role %s can process payroll runs',
    (role) => {
      const user = { _id: `user-${role}-run`, role };
      expect(hasPermission(user, 'payroll.run.process')).toBe(true);
    }
  );

  test.each(['admin', 'superadmin', 'hr', 'accounts', 'manager'])(
    'role %s can manage payroll approvals',
    (role) => {
      const user = { _id: `user-${role}-appr`, role };
      expect(hasPermission(user, 'payroll.approval.manage')).toBe(true);
    }
  );

  test.each(['employee', 'hod'])(
    'role %s cannot manage payroll approvals',
    (role) => {
      const user = { _id: `user-${role}-appr`, role };
      expect(hasPermission(user, 'payroll.approval.manage')).toBe(false);
    }
  );
});
