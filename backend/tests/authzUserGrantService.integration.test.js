import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/userModel.js';
import UserPermissionGrant from '../src/models/userPermissionGrantModel.js';
import {
  getUserAssignmentPayload,
  replaceUserAssignments,
} from '../src/authz/userGrantService.js';

describe('Authorization V2 — userGrantService (integration)', () => {
  /** @type {MongoMemoryServer} */
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await UserPermissionGrant.deleteMany({});
  });

  test('replaceUserAssignments persists grants and updates effective permissions', async () => {
    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin-grant-test@example.com',
      password: 'hashed',
      role: 'admin',
      status: 'active',
    });

    const employee = await User.create({
      name: 'Test Employee',
      email: 'employee-grant-test@example.com',
      password: 'hashed',
      role: 'employee',
      status: 'active',
    });

    const before = await getUserAssignmentPayload(employee._id);
    expect(before.directAssignments).toHaveLength(0);
    expect(before.effective.permissions).not.toContain('support.manage');

    const updated = await replaceUserAssignments(
      employee._id,
      [{ permission: 'support.manage', scope: 'COMPANY', effect: 'grant' }],
      admin._id
    );

    expect(updated.directAssignments).toHaveLength(1);
    expect(updated.directAssignments[0].permission).toBe('support.manage');
    expect(updated.directAssignments[0].assignedBy?.name).toBe('Test Admin');
    expect(updated.effective.permissions).toContain('support.manage');

    const inDb = await UserPermissionGrant.countDocuments({ user: employee._id });
    expect(inDb).toBe(1);

    const reloaded = await getUserAssignmentPayload(employee._id);
    expect(reloaded.directAssignments).toHaveLength(1);
    expect(reloaded.effective.permissions).toContain('support.manage');
  });

  test('replaceUserAssignments persists denials and removes inherited permission', async () => {
    const admin = await User.create({
      name: 'Test Admin 2',
      email: 'admin-grant-test2@example.com',
      password: 'hashed',
      role: 'admin',
      status: 'active',
    });

    const employee = await User.create({
      name: 'Test Employee 2',
      email: 'employee-grant-test2@example.com',
      password: 'hashed',
      role: 'employee',
      status: 'active',
    });

    const before = await getUserAssignmentPayload(employee._id);
    expect(before.effective.permissions).toContain('expense.claim.create');

    const updated = await replaceUserAssignments(
      employee._id,
      [{ permission: 'expense.claim.create', scope: 'SELF', effect: 'deny' }],
      admin._id
    );

    expect(updated.directAssignments).toHaveLength(1);
    expect(updated.directAssignments[0].effect).toBe('deny');
    expect(updated.effective.permissions).not.toContain('expense.claim.create');
    expect(updated.effective.permissions.length).toBe(before.effective.permissions.length - 1);
  });

  test('replaceUserAssignments with empty array clears overrides', async () => {
    const admin = await User.create({
      name: 'Test Admin 3',
      email: 'admin-grant-test3@example.com',
      password: 'hashed',
      role: 'admin',
      status: 'active',
    });

    const employee = await User.create({
      name: 'Test Employee 3',
      email: 'employee-grant-test3@example.com',
      password: 'hashed',
      role: 'employee',
      status: 'active',
    });

    await replaceUserAssignments(
      employee._id,
      [{ permission: 'support.manage', scope: 'COMPANY', effect: 'grant' }],
      admin._id
    );

    const cleared = await replaceUserAssignments(employee._id, [], admin._id);
    expect(cleared.directAssignments).toHaveLength(0);
    expect(cleared.effective.permissions).not.toContain('support.manage');

    const inDb = await UserPermissionGrant.countDocuments({ user: employee._id });
    expect(inDb).toBe(0);
  });

  test('getUserAssignmentPayload includes HoD flag for department heads', async () => {
    const hodUser = await User.create({
      name: 'Test HoD',
      email: 'hod-grant-test@example.com',
      password: 'hashed',
      role: 'employee',
      status: 'active',
      isHeadOfDepartment: true,
    });

    const payload = await getUserAssignmentPayload(hodUser._id);
    expect(payload.user.isHeadOfDepartment).toBe(true);
    expect(payload.inherited.permissions).toContain('leave.request.approve');
  });

  test('expired direct grants stay in audit trail but not in effective permissions', async () => {
    const admin = await User.create({
      name: 'Test Admin Expiry',
      email: 'admin-grant-expiry@example.com',
      password: 'hashed',
      role: 'admin',
      status: 'active',
    });

    const employee = await User.create({
      name: 'Test Employee Expiry',
      email: 'employee-grant-expiry@example.com',
      password: 'hashed',
      role: 'employee',
      status: 'active',
    });

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await UserPermissionGrant.create({
      user: employee._id,
      permission: 'support.manage',
      scope: 'COMPANY',
      effect: 'grant',
      assignedBy: admin._id,
      expiresAt: past,
    });

    const payload = await getUserAssignmentPayload(employee._id);
    expect(payload.directAssignments).toHaveLength(1);
    expect(payload.directAssignments[0].isExpired).toBe(true);
    expect(payload.expiredAssignments).toHaveLength(1);
    expect(payload.effective.permissions).not.toContain('support.manage');
  });

  test('replaceUserAssignments rejects past expiresAt', async () => {
    const admin = await User.create({
      name: 'Test Admin Expiry 2',
      email: 'admin-grant-expiry2@example.com',
      password: 'hashed',
      role: 'admin',
      status: 'active',
    });

    const employee = await User.create({
      name: 'Test Employee Expiry 2',
      email: 'employee-grant-expiry2@example.com',
      password: 'hashed',
      role: 'employee',
      status: 'active',
    });

    const past = new Date(Date.now() - 60 * 1000).toISOString();

    await expect(
      replaceUserAssignments(
        employee._id,
        [{ permission: 'support.manage', scope: 'COMPANY', effect: 'grant', expiresAt: past }],
        admin._id
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
