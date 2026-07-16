import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * CRM pilot parity: leads, clients, and raw data permissions.
 */
describe('Authorization V2 — CRM pilot parity', () => {
  test.each(['admin', 'superadmin', 'manager'])(
    'role %s can view and manage leads and clients',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'crm.lead.view')).toBe(true);
      expect(hasPermission(user, 'crm.lead.manage')).toBe(true);
      expect(hasPermission(user, 'crm.client.view')).toBe(true);
    }
  );

  test('hr can manage clients but not leads or raw data analytics by default', () => {
    const user = { _id: 'hr1', role: 'hr' };
    expect(hasPermission(user, 'crm.lead.view')).toBe(false);
    expect(hasPermission(user, 'crm.lead.manage')).toBe(false);
    expect(hasPermission(user, 'crm.client.view')).toBe(true);
    expect(hasPermission(user, 'crm.client.manage')).toBe(true);
    expect(hasPermission(user, 'crm.rawdata.analytics.view')).toBe(false);
  });

  test('hr can receive CRM lead access via direct grant', () => {
    const user = {
      _id: 'hr2',
      role: 'hr',
      directPermissionGrants: [
        { permission: 'crm.lead.view', scope: 'COMPANY', effect: 'grant' },
      ],
    };
    expect(hasPermission(user, 'crm.lead.view')).toBe(true);
    expect(hasPermission(user, 'crm.lead.manage')).toBe(false);
  });

  test('accounts can view leads and clients for finance workflows', () => {
    const user = { _id: 'acc1', role: 'accounts' };
    expect(hasPermission(user, 'crm.lead.view')).toBe(true);
    expect(hasPermission(user, 'crm.client.view')).toBe(true);
    expect(hasPermission(user, 'crm.client.manage')).toBe(true);
  });

  test('sales role can manage leads, clients, and raw data', () => {
    const user = { _id: 'sales1', role: 'sales' };
    expect(hasPermission(user, 'crm.lead.view')).toBe(true);
    expect(hasPermission(user, 'crm.lead.manage')).toBe(true);
    expect(hasPermission(user, 'crm.client.view')).toBe(true);
    expect(hasPermission(user, 'crm.rawdata.manage')).toBe(true);
  });

  test('employee lacks company CRM permissions by default', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'crm.lead.view')).toBe(false);
    expect(hasPermission(user, 'crm.client.view')).toBe(false);
    expect(hasPermission(user, 'crm.client.view_assigned')).toBe(true);
    expect(hasPermission(user, 'crm.rawdata.manage')).toBe(false);
    expect(hasPermission(user, 'crm.rawdata.analytics.view')).toBe(false);
  });

  test('hod can view personally assigned clients but not company client list permission', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'crm.client.view')).toBe(false);
    expect(hasPermission(user, 'crm.client.view_assigned')).toBe(true);
  });

  test.each(['admin', 'superadmin', 'manager'])(
    'role %s can view Raw Data Analytics dashboard',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'crm.rawdata.analytics.view')).toBe(true);
    }
  );

  test('hod lacks Raw Data Analytics by default (grant via Permission Assignment)', () => {
    const user = { _id: 'hod1', role: 'hod' };
    expect(hasPermission(user, 'reports.analytics.view')).toBe(true);
    expect(hasPermission(user, 'crm.rawdata.analytics.view')).toBe(false);
  });
});
