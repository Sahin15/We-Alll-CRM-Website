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
});
