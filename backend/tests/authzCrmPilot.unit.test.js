import { jest } from '@jest/globals';
import { hasPermission } from '../src/authz/policyEngine.js';

/**
 * CRM pilot parity: leads, clients, and raw data permissions.
 */
describe('Authorization V2 — CRM pilot parity', () => {
  test.each(['admin', 'superadmin', 'manager', 'hr'])(
    'role %s can view and manage leads and clients',
    (role) => {
      const user = { _id: `user-${role}`, role };
      expect(hasPermission(user, 'crm.lead.view')).toBe(true);
      expect(hasPermission(user, 'crm.lead.manage')).toBe(true);
      expect(hasPermission(user, 'crm.client.view')).toBe(true);
    }
  );

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

  test('employee lacks CRM permissions by default', () => {
    const user = { _id: 'emp1', role: 'employee' };
    expect(hasPermission(user, 'crm.lead.view')).toBe(false);
    expect(hasPermission(user, 'crm.client.view')).toBe(false);
    expect(hasPermission(user, 'crm.rawdata.manage')).toBe(false);
  });
});
