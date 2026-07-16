import { jest } from '@jest/globals';
import { requireModulePermission } from '../src/authz/authzMiddleware.js';
import { getAuthzRolloutStatus } from '../src/authz/rolloutStatus.js';
import { AUTHZ_ROLLOUT_WAVES } from '../src/authz/rolloutManifest.js';

describe('Authorization V2 — requireModulePermission enforcement', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * @param {object} user
   * @param {object} [options]
   * @returns {{ status?: number, body?: object, nextCalled: boolean, authz?: object }}
   */
  function runMiddleware(user, options = {}) {
    const {
      moduleName = 'profile',
      permission = 'profile.view',
      legacyRoles = ['employee'],
      env = {},
    } = options;

    process.env = { ...originalEnv, ...env };

    const handler = requireModulePermission(moduleName, permission, { legacyRoles });
    const req = {
      user,
      originalUrl: '/test',
      method: 'GET',
    };
    const res = {
      statusCode: 200,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });

    return {
      status: res.statusCode >= 400 ? res.statusCode : undefined,
      body: res.body,
      nextCalled,
      authz: req.authz,
    };
  }

  test('allows employee when module enforce is off (shadow only)', () => {
    const result = runMiddleware(
      { _id: 'emp1', role: 'employee' },
      { env: { AUTHZ_V2_ENFORCE: 'false', AUTHZ_V2_PROFILE: 'false' } }
    );
    expect(result.nextCalled).toBe(true);
    expect(result.authz?.allowed).toBe(true);
  });

  test('blocks employee when profile module enforce is on and permission denied', () => {
    const result = runMiddleware(
      {
        _id: 'emp1',
        role: 'employee',
        directPermissionGrants: [{ permission: 'profile.view', scope: 'SELF', effect: 'deny' }],
      },
      { env: { AUTHZ_V2_ENFORCE: 'true', AUTHZ_V2_PROFILE: 'true' } }
    );
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
    expect(result.body?.error).toContain('profile.view');
  });

  test('allows employee when profile module enforce is on and permission granted', () => {
    const result = runMiddleware(
      { _id: 'emp1', role: 'employee' },
      { env: { AUTHZ_V2_ENFORCE: 'true', AUTHZ_V2_PROFILE: 'true' } }
    );
    expect(result.nextCalled).toBe(true);
    expect(result.authz?.allowed).toBe(true);
  });

  test('does not enforce module when AUTHZ_V2_ENFORCE is true but module flag is off', () => {
    const result = runMiddleware(
      {
        _id: 'emp1',
        role: 'employee',
        directPermissionGrants: [{ permission: 'profile.view', scope: 'SELF', effect: 'deny' }],
      },
      { env: { AUTHZ_V2_ENFORCE: 'true', AUTHZ_V2_PROFILE: 'false' } }
    );
    expect(result.nextCalled).toBe(true);
  });

  test('allows hod on CRM my-clients when enforce is on via assigned-client permission', () => {
    const result = runMiddleware(
      { _id: 'hod1', role: 'hod' },
      {
        moduleName: 'crm',
        permission: 'crm.client.view_assigned',
        legacyRoles: ['employee', 'hod'],
        env: { AUTHZ_V2_ENFORCE: 'true', AUTHZ_V2_CRM: 'true' },
      }
    );
    expect(result.nextCalled).toBe(true);
    expect(result.authz?.allowed).toBe(true);
  });

  test('allows hod on CRM my-clients via legacy role during enforce when permission missing', () => {
    const result = runMiddleware(
      { _id: 'hod1', role: 'hod' },
      {
        moduleName: 'crm',
        permission: 'crm.client.view',
        legacyRoles: ['employee', 'hod'],
        env: { AUTHZ_V2_ENFORCE: 'true', AUTHZ_V2_CRM: 'true' },
      }
    );
    expect(result.nextCalled).toBe(true);
  });

  test('legacy role gate still blocks when neither legacy nor V2 allows', () => {
    const result = runMiddleware(
      { _id: 'emp1', role: 'employee' },
      {
        permission: 'auth.role.manage',
        legacyRoles: ['admin', 'superadmin'],
        env: { AUTHZ_V2_ENFORCE: 'false', AUTHZ_V2_AUTH: 'false' },
      }
    );
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });
});

describe('Authorization V2 — rollout status', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('reports wave 1 modules when only wave 1 flags are enabled', () => {
    process.env.AUTHZ_SHADOW_MODE = 'true';
    process.env.AUTHZ_V2_ENFORCE = 'true';
    for (const moduleName of AUTHZ_ROLLOUT_WAVES[0].modules) {
      process.env[`AUTHZ_V2_${moduleName.toUpperCase()}`] = 'true';
    }

    const status = getAuthzRolloutStatus();
    expect(status.enforce).toBe(true);
    expect(status.shadowMode).toBe(true);
    expect(status.enabledModuleCount).toBe(5);
    expect(status.waves[0].complete).toBe(true);
    expect(status.nextWave?.id).toBe(2);
  });
});
