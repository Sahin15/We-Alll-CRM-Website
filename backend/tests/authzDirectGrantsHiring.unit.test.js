import { jest } from '@jest/globals';
import {
  assertHrAccess,
  canManageHiringPipeline,
  hasCompanyWideHiringRequestAccess,
} from '../src/utils/hiringAccess.js';
import { makeAuthzTestUser } from './helpers/authzTestFixtures.js';

describe('Authorization V2 — hiring direct grants', () => {
  test('employee with hiring.pipeline.manage passes assertHrAccess', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'hiring.pipeline.manage', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(canManageHiringPipeline(user)).toBe(true);

    const req = { user };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    expect(assertHrAccess(req, res)).toBe(true);
  });

  test('employee with hiring.request.view at COMPANY has company-wide request access', () => {
    const user = makeAuthzTestUser('employee', {
      directPermissionGrants: [
        { permission: 'hiring.request.view', scope: 'COMPANY', effect: 'grant' },
      ],
    });
    expect(hasCompanyWideHiringRequestAccess(user)).toBe(true);
  });

  test('employee without hiring grants is denied pipeline access', () => {
    const user = makeAuthzTestUser('employee');
    expect(canManageHiringPipeline(user)).toBe(false);
  });
});
