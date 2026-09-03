import { jest } from '@jest/globals';
import { canViewAllCompanyProjects } from '../src/services/resourceVisibilityService.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — project manage grant visibility', () => {
  test('projects.project.manage at COMPANY grants company-wide project visibility', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'projects.project.manage', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(canViewAllCompanyProjects(user)).toBe(true);
  });
});
