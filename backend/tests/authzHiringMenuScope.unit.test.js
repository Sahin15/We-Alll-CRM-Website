import { buildEffectivePermissions } from '../src/authz/legacyAdapter.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — hiring menu scope', () => {
  test('HoD hiring.request.view is department-scoped, not company-wide HR pipeline access', () => {
    const user = makeAuthzTestUser('hod', {
      authzDepartmentName: 'sales',
    });

    const effective = buildEffectivePermissions(user);
    expect(effective.permissions).toContain('hiring.request.view');
    expect(effective.permissions).toContain('hiring.request.create');
    expect(effective.scopes['hiring.request.view']).toBe('OWN_DEPARTMENT');
    expect(effective.scopes['hiring.request.create']).toBe('OWN_DEPARTMENT');
    expect(effective.permissions).not.toContain('hiring.pipeline.manage');
    expect(effective.permissions).not.toContain('team.department.view');
  });

  test('HR role hiring.request.view is company-scoped for HR pipeline menu', () => {
    const user = makeAuthzTestUser('hr', {
      authzDepartmentName: 'hr',
    });

    const effective = buildEffectivePermissions(user);
    expect(effective.permissions).toContain('hiring.request.view');
    expect(effective.scopes['hiring.request.view']).toBe('COMPANY');
  });
});
