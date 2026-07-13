/**
 * HoD sync — reconcile Department.head with User HoD fields.
 * Source of truth: Department.head
 */

import Department from '../models/departmentModel.js';
import User from '../models/userModel.js';

const INACTIVE_USER_STATUSES = new Set(['terminated', 'offboarded']);

/**
 * @typedef {object} HoDSyncIssue
 * @property {string} code
 * @property {string} message
 * @property {object} [context]
 */

/**
 * @typedef {object} HoDUserUpdate
 * @property {string} userId
 * @property {boolean} isHeadOfDepartment
 * @property {string|null} headOfDepartment
 * @property {string} [role]
 */

/**
 * @typedef {object} HoDDepartmentUpdate
 * @property {string} departmentId
 * @property {null} head
 */

/**
 * @typedef {object} HoDSyncPlan
 * @property {HoDUserUpdate[]} userUpdates
 * @property {HoDDepartmentUpdate[]} departmentUpdates
 * @property {HoDSyncIssue[]} issues
 */

/**
 * Pure reconciliation logic (testable without DB).
 *
 * @param {Array<{ _id: string, head?: string|null }>} departments
 * @param {Array<{ _id: string, role?: string, isHeadOfDepartment?: boolean, headOfDepartment?: string|null, status?: string }>} users
 * @returns {HoDSyncPlan}
 */
export function computeHoDSyncPlan(departments, users) {
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const deptsByUser = new Map();

  /** @type {HoDDepartmentUpdate[]} */
  const departmentUpdates = [];
  /** @type {HoDSyncIssue[]} */
  const issues = [];

  for (const dept of departments) {
    const deptId = String(dept._id);
    const headId = dept.head ? String(dept.head) : null;
    if (!headId) continue;

    const user = userMap.get(headId);
    if (!user || INACTIVE_USER_STATUSES.has(user.status || '')) {
      departmentUpdates.push({ departmentId: deptId, head: null });
      issues.push({
        code: 'invalid_department_head',
        message: 'Department head points to missing or inactive user; clearing department.head',
        context: { departmentId: deptId, headId },
      });
      continue;
    }

    if (!deptsByUser.has(headId)) {
      deptsByUser.set(headId, []);
    }
    deptsByUser.get(headId).push(deptId);
  }

  /** @type {HoDUserUpdate[]} */
  const userUpdates = [];

  for (const user of users) {
    const userId = String(user._id);
    const headedDepts = deptsByUser.get(userId) || [];
    const shouldBeHoD = headedDepts.length > 0;
    const currentRole = user.role || 'employee';
    const currentHeadDept = user.headOfDepartment ? String(user.headOfDepartment) : null;
    const currentIsHoD = Boolean(user.isHeadOfDepartment);

    if (shouldBeHoD) {
      const primaryDept =
        currentHeadDept && headedDepts.includes(currentHeadDept)
          ? currentHeadDept
          : headedDepts[0];

      const nextRole = currentRole === 'employee' ? 'hod' : currentRole;
      const roleChanged = nextRole !== currentRole;

      if (!currentIsHoD || currentHeadDept !== primaryDept || roleChanged) {
        userUpdates.push({
          userId,
          isHeadOfDepartment: true,
          headOfDepartment: primaryDept,
          ...(roleChanged ? { role: nextRole } : {}),
        });
      }

      if (headedDepts.length > 1) {
        issues.push({
          code: 'multi_department_head',
          message: 'User heads multiple departments; headOfDepartment stores primary dept only',
          context: { userId, departmentIds: headedDepts, primaryDepartmentId: primaryDept },
        });
      }
      continue;
    }

    const shouldClear =
      currentIsHoD || currentHeadDept || currentRole === 'hod';

    if (shouldClear) {
      const nextRole = currentRole === 'hod' ? 'employee' : currentRole;
      userUpdates.push({
        userId,
        isHeadOfDepartment: false,
        headOfDepartment: null,
        ...(nextRole !== currentRole ? { role: nextRole } : {}),
      });
    }
  }

  return { userUpdates, departmentUpdates, issues };
}

/**
 * Apply HoD sync plan to MongoDB.
 *
 * @param {HoDSyncPlan} plan
 * @returns {Promise<{ usersUpdated: number, departmentsUpdated: number }>}
 */
export async function applyHoDSyncPlan(plan) {
  let usersUpdated = 0;
  let departmentsUpdated = 0;

  for (const update of plan.userUpdates) {
    const $set = {
      isHeadOfDepartment: update.isHeadOfDepartment,
      headOfDepartment: update.headOfDepartment,
    };
    if (update.role) {
      $set.role = update.role;
    }

    await User.updateOne({ _id: update.userId }, { $set });
    usersUpdated += 1;
  }

  for (const update of plan.departmentUpdates) {
    await Department.updateOne(
      { _id: update.departmentId },
      {
        $set: {
          head: null,
          headAssignedBy: null,
          headAssignedAt: null,
        },
      }
    );
    departmentsUpdated += 1;
  }

  return { usersUpdated, departmentsUpdated };
}

/**
 * Load data, compute plan, optionally apply.
 *
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<HoDSyncPlan & { usersUpdated: number, departmentsUpdated: number }>}
 */
export async function syncHoDAssignments(options = {}) {
  const { dryRun = false } = options;

  const [departments, users] = await Promise.all([
    Department.find().select('_id head name').lean(),
    User.find({
      $or: [
        { isHeadOfDepartment: true },
        { headOfDepartment: { $ne: null } },
        { role: 'hod' },
      ],
    })
      .select('_id role isHeadOfDepartment headOfDepartment status')
      .lean(),
  ]);

  const headedUserIds = new Set(
    departments.filter((d) => d.head).map((d) => String(d.head))
  );

  const headedUsers = await User.find({ _id: { $in: [...headedUserIds] } })
    .select('_id role isHeadOfDepartment headOfDepartment status')
    .lean();

  const userById = new Map(users.map((u) => [String(u._id), u]));
  for (const user of headedUsers) {
    userById.set(String(user._id), user);
  }

  const plan = computeHoDSyncPlan(departments, [...userById.values()]);

  if (dryRun) {
    return { ...plan, usersUpdated: 0, departmentsUpdated: 0 };
  }

  const applied = await applyHoDSyncPlan(plan);
  return { ...plan, ...applied };
}
