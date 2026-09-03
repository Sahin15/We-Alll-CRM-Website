import { jest } from '@jest/globals';
import { mergeDirectGrants } from '../src/authz/grantMerge.js';
import { hasPermission } from '../src/authz/policyEngine.js';

describe('Authorization V2 — Direct permission assignments', () => {
  test('mergeDirectGrants adds permissions not in legacy role', () => {
    const legacy = [
      { permission: 'profile.view', scope: 'SELF' },
      { permission: 'dashboard.view', scope: 'SELF' },
    ];
    const direct = [
      { permission: 'billing.invoice.view', scope: 'COMPANY', effect: 'grant' },
    ];

    const merged = mergeDirectGrants(legacy, direct);
    const keys = merged.map((g) => g.permission);

    expect(keys).toContain('billing.invoice.view');
    expect(keys).toContain('profile.view');
  });

  test('mergeDirectGrants removes permissions with deny effect', () => {
    const legacy = [
      { permission: 'expense.claim.create', scope: 'SELF' },
      { permission: 'dashboard.view', scope: 'SELF' },
    ];
    const direct = [{ permission: 'expense.claim.create', scope: 'SELF', effect: 'deny' }];

    const merged = mergeDirectGrants(legacy, direct);
    const keys = merged.map((g) => g.permission);

    expect(keys).not.toContain('expense.claim.create');
    expect(keys).toContain('dashboard.view');
  });

  test('user with direct grants gains permission via policy engine', () => {
    const employee = {
      _id: 'emp1',
      role: 'employee',
      directPermissionGrants: [
        { permission: 'reports.analytics.view', scope: 'COMPANY', effect: 'grant' },
      ],
    };

    expect(hasPermission(employee, 'reports.analytics.view')).toBe(true);
    expect(hasPermission(employee, 'billing.invoice.manage')).toBe(false);
  });

  test('user with deny grant loses inherited permission', () => {
    const employee = {
      _id: 'emp2',
      role: 'employee',
      directPermissionGrants: [
        { permission: 'expense.claim.create', scope: 'SELF', effect: 'deny' },
      ],
    };

    expect(hasPermission(employee, 'expense.claim.create')).toBe(false);
    expect(hasPermission(employee, 'dashboard.view')).toBe(true);
  });
});
